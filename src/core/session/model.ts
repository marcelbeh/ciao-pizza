import { calculateFormula, defaults, formulaIssues, type Formula } from '../dough/forno';
import { calculateDough } from '../dough/calculations';
import { createPlan } from '../dough/model';
import { assertMonitor, newMonitor, iso, type MonitorPlan } from '../maturity/model';
import { assertSchedule, type SchedulePlan } from '../schedule/plan';
import { assertDevice, deviceProfiles, type DeviceId } from './devices';
export type RecipeId = 'forno-autolyse' | 'marcel-64';
export type ActualPhase = 'preparation' | 'bulk' | 'cold' | 'balls' | 'acclimate' | 'preheat' | 'bake' | 'complete';
export type StepId = 'prepare' | 'water' | 'flour' | 'mix' | 'autolyse' | 'yeast' | 'salt' | 'knead' | 'unload' | 'temperature' | 'bulk';
export const recipeSteps: StepId[] = ['prepare','water','flour','mix','autolyse','yeast','salt','knead','unload','temperature','bulk'];
export interface PizzaSession {
  version: 1; id: string; revision: number; name: string; createdAt: string; updatedAt: string;
  recipe: { id: RecipeId; version: 1 }; device: DeviceId; timeZone: string; bakeUntil: string | null;
  monitor: MonitorPlan; preparation: { autolyseMinutes: number; beforeRestMinutes: number; afterRestMinutes: number };
  locked: boolean; completed: boolean; scheduleRemoved: boolean;
  actual: Partial<Record<ActualPhase,string>>;
  cooking: { step: StepId; batch: number; timer: { endAt: number | null; remainingMs: number }; done: { key: string; at: string }[] };
  origin: 'new' | 'legacy';
}
export interface SessionState { version: 1; defaultDevice: DeviceId; activeId: string | null; sessions: PizzaSession[]; legacyAdopted: boolean }
export const emptySessions = (): SessionState => ({version:1,defaultDevice:'tm7',activeId:null,sessions:[],legacyAdopted:false});
export const activeSession = (state: SessionState | null | undefined) => state?.sessions.find(s=>s.id===state.activeId)??null;
export function sessionIngredients(s: PizzaSession) {
  return calculateDough({...createPlan(new Date('2026-01-01T12:00:00.000Z')), ...s.monitor.formula, yeastKind:s.monitor.yeastKind, yeastMode:'manual', massMode:'balls', oil:0,sugar:0}).ingredients;
}
export function sessionBatches(s: PizzaSession) {
  const ingredients = sessionIngredients(s),profile=deviceProfiles[s.device];
  const total=ingredients.flour+ingredients.water+ingredients.salt+ingredients.yeast;
  const count=s.device==='manual'?1:Math.max(Math.ceil(ingredients.flour/profile.flourCap!),profile.doughCap?Math.ceil(total/profile.doughCap):1);
  return {count, flour:ingredients.flour/count,water:ingredients.water/count,salt:ingredients.salt/count,yeast:ingredients.yeast/count};
}
export function createSession(formula:Formula,schedule:SchedulePlan,device:DeviceId,name='Mein Pizzaabend'):PizzaSession {
  const now=new Date().toISOString(),id=crypto.randomUUID();const monitor=newMonitor(formula,schedule,now,id);
  const s:PizzaSession={version:1,id,revision:0,name:name.trim(),createdAt:now,updatedAt:now,recipe:{id:'forno-autolyse',version:1},device,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,bakeUntil:null,monitor,preparation:{autolyseMinutes:30,beforeRestMinutes:schedule.mixMinutes/2,afterRestMinutes:schedule.mixMinutes/2},locked:false,completed:false,scheduleRemoved:false,actual:{},cooking:{step:'prepare',batch:0,timer:{endAt:null,remainingMs:30*60000},done:[]},origin:'new'};
  assertSession(s);return s;
}
export function updateSessionPlan(s:PizzaSession,formula:Formula,schedule:SchedulePlan,device:DeviceId) {
  if(s.locked&&(JSON.stringify(formula)!==JSON.stringify(s.monitor.formula)||device!==s.device))throw Error('Die Zubereitung hat begonnen. Rezeptmengen und Gerät sind eingefroren; bitte eine neue Session anlegen.');
  if(Object.keys(formulaIssues(formula)).length)throw Error('Ungültige Teigparameter.');assertSchedule(schedule);assertDevice(device);
  s.monitor.formula=structuredClone(formula);s.monitor.schedule=structuredClone(schedule);s.device=device;s.scheduleRemoved=false;
  s.monitor.yeastGrams=calculateFormula(formula).ingredients.yeast;
  if(!s.locked)s.cooking={step:'prepare',batch:0,timer:{endAt:null,remainingMs:s.preparation.autolyseMinutes*60000},done:[]};
}
const validId=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
function shape(v:unknown,keys:string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Ungültige Sessiondaten.');const r=v as Record<string,unknown>;if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))throw Error('Unbekannte Sessionstruktur.');return r;}
export function assertSession(value:unknown):asserts value is PizzaSession {
  shape(value,['version','id','revision','name','createdAt','updatedAt','recipe','device','timeZone','bakeUntil','monitor','preparation','locked','completed','scheduleRemoved','actual','cooking','origin']);const s=value as PizzaSession;
  if(s.version!==1||!validId(s.id)||!Number.isSafeInteger(s.revision)||s.revision<0||typeof s.name!=='string'||!s.name.trim()||s.name!==s.name.trim()||s.name.length>80||!['new','legacy'].includes(s.origin))throw Error('Ungültige Session.');
  iso(s.createdAt);iso(s.updatedAt);if(s.updatedAt<s.createdAt)throw Error('Ungültiger Änderungszeitpunkt.');assertDevice(s.device);if(typeof s.timeZone!=='string'||!s.timeZone)throw Error('Ungültige Zeitzone.');try{new Intl.DateTimeFormat('de',{timeZone:s.timeZone})}catch{throw Error('Ungültige Zeitzone.')}
  shape(s.recipe,['id','version']);if(!['forno-autolyse','marcel-64'].includes(s.recipe.id)||s.recipe.version!==1)throw Error('Unbekannte Rezeptversion.');assertMonitor(s.monitor);if(s.monitor.id!==s.id||s.monitor.yeastGrams!==calculateFormula(s.monitor.formula).ingredients.yeast)throw Error('Widersprüchliche Session-Rezeptur.');
  if(s.bakeUntil!==null){iso(s.bakeUntil);if(Date.parse(s.bakeUntil)<=Date.parse(s.monitor.schedule.bakeAt)||Date.parse(s.bakeUntil)-Date.parse(s.monitor.schedule.bakeAt)>12*3600000)throw Error('Das Backfenster muss nach dem Backbeginn liegen und höchstens 12 Stunden dauern.');}
  shape(s.preparation,['autolyseMinutes','beforeRestMinutes','afterRestMinutes']);if(!Number.isInteger(s.preparation.autolyseMinutes))throw Error('Autolyse in ganzen Minuten angeben.');for(const [key,n]of Object.entries(s.preparation))if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>(key==='autolyseMinutes'?240:60))throw Error('Ungültiges Vorbereitungsbudget.');
  if(Math.abs(s.preparation.beforeRestMinutes+s.preparation.afterRestMinutes-s.monitor.schedule.mixMinutes)>1e-8)throw Error('Vorbereitungsbudget stimmt nicht mit dem Zeitplan überein.');
  for(const flag of [s.locked,s.completed,s.scheduleRemoved])if(typeof flag!=='boolean')throw Error('Ungültiger Sessionstatus.');
  if(!s.actual||typeof s.actual!=='object'||Array.isArray(s.actual)||Object.keys(s.actual).some(k=>!['preparation','bulk','cold','balls','acclimate','preheat','bake','complete'].includes(k)))throw Error('Ungültige Ist-Zeiten.');for(const at of Object.values(s.actual))iso(at);
  if((s.actual.preparation||Object.keys(s.actual).length)&&!s.locked)throw Error('Begonnene Session darf nicht entsperrt sein.');if(s.actual.complete&&!s.actual.bake)throw Error('Abschluss ohne Backbeginn.');
  const ordered=['preparation','bulk','cold','balls','acclimate','bake','complete'] as const;let previous=-Infinity;for(const key of ordered){if(s.actual[key]){const time=Date.parse(s.actual[key]!);if(time<previous)throw Error('Ungültige Reihenfolge der Ist-Zeiten.');previous=time}}
  if(s.actual.preheat&&s.actual.bake&&Date.parse(s.actual.preheat)>Date.parse(s.actual.bake))throw Error('Vorheizen nach Backbeginn.');
  if(s.completed!==!!s.actual.complete)throw Error('Ungültiger Abschlussstatus.');
  shape(s.cooking,['step','batch','timer','done']);if(!recipeSteps.includes(s.cooking.step)||!Number.isInteger(s.cooking.batch)||s.cooking.batch<0||s.cooking.batch>=sessionBatches(s).count)throw Error('Ungültige Kochposition.');shape(s.cooking.timer,['endAt','remainingMs']);const timer=s.cooking.timer;if(!Number.isFinite(timer.remainingMs)||timer.remainingMs<0||timer.remainingMs>s.preparation.autolyseMinutes*60000||(timer.endAt!==null&&(!Number.isSafeInteger(timer.endAt)||timer.endAt<=0||s.cooking.step!=='autolyse')))throw Error('Ungültiger Timer.');
  if(!Array.isArray(s.cooking.done)||s.cooking.done.length>20000)throw Error('Ungültige Kochhistorie.');const ids=new Set();for(const item of s.cooking.done){shape(item,['key','at']);if(typeof item.key!=='string'||!/^\d+:(prepare|water|flour|mix|autolyse|yeast|salt|knead|unload|temperature|bulk)$/.test(item.key)||ids.has(item.key)||Number(item.key.split(':')[0])>=sessionBatches(s).count)throw Error('Ungültiger Kochschritt.');iso(item.at);ids.add(item.key)}
}
export function assertSessionState(value:unknown):asserts value is SessionState {
  shape(value,['version','defaultDevice','activeId','sessions','legacyAdopted']);const s=value as SessionState;if(s.version!==1||typeof s.legacyAdopted!=='boolean'||!Array.isArray(s.sessions)||s.sessions.length>50)throw Error('Unbekannte Sessions-Version.');assertDevice(s.defaultDevice);const ids=new Set();for(const session of s.sessions){assertSession(session);if(ids.has(session.id))throw Error('Doppelte Session-ID.');ids.add(session.id)}if(s.activeId!==null&&!ids.has(s.activeId))throw Error('Session-Verweis ungültig.');
}
export { defaults };
