import type { SessionRepository } from '../infrastructure/storage/sessionRepository';
import type { PizzaSession, SessionState } from '../core/session/model';
import type { MonitorAccess } from './MaturityPage';
import { assertCheck, assertConditions, assertTemperatureEvent, type MaturityState } from '../core/maturity/model';
import { preparationStart, sessionForecast } from '../core/session/workflow';
export interface SessionAccess {
  state: SessionState; session: PizzaSession | null; repository: SessionRepository; busy: boolean; now: number;
  run: (task: () => Promise<SessionState>) => Promise<void>; editingChanged: (editing: boolean) => void;
}
export const monitorState = (session: PizzaSession): MaturityState => ({version:1,modelVersion:1,activeId:session.id,plans:[session.monitor],autolyseMinutes:session.preparation.autolyseMinutes});
/** A projection and repository adapter, never another persisted copy of the monitor. */
export function sessionMonitor(access: SessionAccess): MonitorAccess {
  const session=access.session!;let committed:SessionState|null=null;
  async function change(id:string, fn:(s:PizzaSession)=>void) {
    if(id!==session.id)throw Error('Session wurde geändert.');
    const state=await access.repository.mutate(id,session.revision,s=>{if(s.completed)throw Error('Session ist abgeschlossen.');fn(s)});
    committed=state;return monitorState(state.sessions.find(s=>s.id===id)!);
  }
  return {state:monitorState(session),loadError:'',formula:session.monitor.formula,schedule:session.scheduleRemoved?null:session.monitor.schedule,scheduleError:'',now:access.now,busy:access.busy,editing:false,editingChanged:access.editingChanged,
    readOnly:session.completed,preparationStart:preparationStart(session),forecastOverride:sessionForecast(session,access.now),
    run:async task=>{await access.run(async()=>{
      // Publish the root returned by the same atomic commit; no second storage read or persisted copy.
      committed=null;await task();if(!committed)throw Error('Kein Session-Speichervorgang ausgeführt.');return committed;
    })},
    repository:{load:async()=>({maturity:monitorState(session),maturityError:''}),activate:async()=>{throw Error('Bitte die Session-Planung bearbeiten.');},
      conditions:(id,value,expected)=>{assertConditions(value);return change(id,s=>{if(JSON.stringify(s.monitor.conditions)!==JSON.stringify(expected))throw Error('Temperaturbasis wurde geändert.');s.monitor.conditions=structuredClone(value)})},
      temperature:(id,value,expected)=>{assertTemperatureEvent(value);return change(id,s=>{const i=s.monitor.temperatures.findIndex(x=>x.id===value.id);if(expected?JSON.stringify(s.monitor.temperatures[i])!==JSON.stringify(expected):i>=0)throw Error('Messung wurde geändert.');if(i<0)s.monitor.temperatures.push(structuredClone(value));else s.monitor.temperatures[i]=structuredClone(value)})},
      check:(id,value,expected)=>{assertCheck(value);return change(id,s=>{const i=s.monitor.checks.findIndex(x=>x.slot===value.slot);if(expected?JSON.stringify(s.monitor.checks[i])!==JSON.stringify(expected):i>=0)throw Error('Check wurde geändert.');if(i<0)s.monitor.checks.push(structuredClone(value));else s.monitor.checks[i]=structuredClone(value)})},
      autolyse:minutes=>change(session.id,s=>{if(s.locked)throw Error('Rezept ist bereits gestartet.');s.preparation.autolyseMinutes=minutes;s.cooking.timer={endAt:null,remainingMs:minutes*60000}}),
    }};
}
