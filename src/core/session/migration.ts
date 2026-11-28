import { activeMonitor, type MaturityState } from '../maturity/model';
import type { Formula } from '../dough/forno';
import { calculateFormula } from '../dough/forno';
import type { CookSession } from '../dough/cookSession';
import type { SchedulePlan } from '../schedule/plan';
import { createSession, type PizzaSession, type StepId } from './model';
import { guidedSteps } from './workflow';
import type { DeviceId } from './devices';
export function legacySession(source:{formula:Formula;schedule:SchedulePlan|null;maturity:MaturityState|null;cookSession:CookSession|null},device:DeviceId):{session:PizzaSession;warnings:string[]}{
  if(!source.schedule)throw Error('Kein lesbarer gespeicherter Backtermin vorhanden.');
  const warnings=['Originale bleiben unverändert im Altbestand und in der Sicherung. Die Vorbereitung wird um das sichtbare Autolyse-Planbudget ergänzt. Gärphasen und Backtermin bleiben gleich.'];
  const monitor=activeMonitor(source.maturity);
  const compatible=monitor&&JSON.stringify(monitor.schedule)===JSON.stringify(source.schedule)&&monitor.yeastKind==='instant'&&monitor.yeastGrams===calculateFormula(monitor.formula).ingredients.yeast;
  const session=createSession(compatible?monitor.formula:source.formula,source.schedule,device,'Übernommener Pizzaabend');session.origin='legacy';delete session.preparation.workBudget;
  if(compatible){session.monitor={...structuredClone(monitor),id:session.id};if(JSON.stringify(monitor.formula)!==JSON.stringify(source.formula))warnings.push('Die feste Rezeptur des gespeicherten Monitors hat Vorrang vor inzwischen geänderten Rechnerwerten.');}
  else if(monitor)warnings.push('Abweichende oder spezielle Monitor-Daten werden nicht vermischt; der vollständige bisherige Monitor bleibt im Altbestand lesbar.');
  const cook=source.cookSession;
  if(cook&&JSON.stringify(cook.formula)===JSON.stringify(session.monitor.formula)){
    session.device='tm5';session.locked=true;session.preparation.autolyseMinutes=cook.autolyseMinutes;
    session.cooking.batch=cook.batch;const map:StepId[]=['prepare','mix','autolyse','yeast','salt','knead','temperature','bulk'];
    const mapped=map[cook.step],available=guidedSteps(session);session.cooking.step=available.includes(mapped)?mapped:available.find(id=>['yeast','salt','knead','unload','temperature','bulk'].includes(id))??'prepare';
    session.cooking.timer=mapped==='autolyse'&&session.cooking.step==='autolyse'?structuredClone(cook.timer):{endAt:null,remainingMs:cook.autolyseMinutes*60000};
    warnings.push('TM5-Kochposition übernommen und Rezeptur eingefroren. Kein Wechsel zu TM7 während einer begonnenen Zubereitung. Es werden keine unbekannten Ist-Zeiten oder erledigten Arbeitsschritte erfunden.');
  }else{session.preparation.autolyseMinutes=source.maturity?.autolyseMinutes??30;session.cooking.timer.remainingMs=session.preparation.autolyseMinutes*60000;if(cook)warnings.push('Abweichender TM5-Kochfortschritt bleibt separat erhalten und wird nicht zugeordnet.');}
  return{session,warnings};
}
