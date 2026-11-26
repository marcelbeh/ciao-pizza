import { calculateSchedule } from '../schedule/plan';
import { maturityForecast } from '../maturity/forecast';
import { recipeSteps, sessionBatches, type ActualPhase, type PizzaSession, type StepId } from './model';
import { deviceProfiles } from './devices';
export const stepTitles:Record<StepId,string>={prepare:'Zutaten vorbereiten',water:'Wasser einwiegen',flour:'Mehl hinzugeben',mix:'Mehl und Wasser verbinden',autolyse:'Autolyse · Teig ruhen lassen',yeast:'Hefe einarbeiten',salt:'Salz einarbeiten',knead:'Kontrolliert fertigkneten',unload:'Teig entnehmen und zusammenführen',temperature:'Teigtemperatur messen',bulk:'Stockgare starten'};
export function guidedSteps(s:PizzaSession) {
  const quantities=sessionBatches(s);return recipeSteps.filter(id=>(id!=='autolyse'||s.preparation.autolyseMinutes>0)&&(id!=='yeast'||quantities.yeast>0)&&(id!=='salt'||quantities.salt>0)&&(!['temperature','bulk'].includes(id)||s.cooking.batch===quantities.count-1));
}
export interface SessionEvent { id:string; label:string; at:string; endsAt?:string; temperatureC?:number; actualKey?:ActualPhase; batch?:number }
export function sessionTimeline(s:PizzaSession):SessionEvent[]{
  if(s.scheduleRemoved)return[];const phases=calculateSchedule(s.monitor.schedule);const bulk=phases.find(p=>p.id==='bulk'||p.id==='cold-bulk')!;
  const count=sessionBatches(s).count,minute=60000;let cursor=Date.parse(bulk.at)-(s.monitor.schedule.mixMinutes+s.preparation.autolyseMinutes*count)*minute;
  const prep:SessionEvent[]=[];for(let batch=0;batch<count;batch++){
    const before=s.preparation.beforeRestMinutes/count*minute,after=s.preparation.afterRestMinutes/count*minute;
    const prefix=count>1?`Charge ${batch+1} · `:'';
    prep.push({id:`prepare-${batch}`,label:prefix+'Vorbereiten, Wasser/Mehl einwiegen und verbinden',at:new Date(cursor).toISOString(),endsAt:new Date(cursor+before).toISOString(),batch,...(batch===0?{actualKey:'preparation' as const}:{})});cursor+=before;
    if(s.preparation.autolyseMinutes>0){prep.push({id:`autolyse-${batch}`,label:prefix+'Autolyse',at:new Date(cursor).toISOString(),endsAt:new Date(cursor+s.preparation.autolyseMinutes*minute).toISOString(),batch});cursor+=s.preparation.autolyseMinutes*minute}
    prep.push({id:`knead-${batch}`,label:prefix+'Hefe/Salz, fertigkneten und entnehmen (Planbudget)',at:new Date(cursor).toISOString(),endsAt:new Date(cursor+after).toISOString(),batch});cursor+=after;
  }
  return [...prep,...phases.filter(p=>p.id!=='mix').map(p=>({...p,actualKey:p.id==='cold-bulk'&&s.monitor.schedule.version===1?'cold' as const:({bulk:'bulk','cold-bulk':'bulk',balls:'balls','cold-balls':'balls',acclimate:'acclimate',preheat:'preheat',bake:'bake'}as const)[p.id as Exclude<typeof p.id,'mix'>]}))].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
}
export const preparationStart=(s:PizzaSession)=>sessionTimeline(s)[0]?.at;
export function sessionWarning(s:PizzaSession,now=Date.now()) {
  if(s.scheduleRemoved)return'Der Backtermin wurde gelöscht. Die Reifeprognose pausiert; gespeicherte Messungen bleiben erhalten.';
  const start=preparationStart(s)!;if(!s.locked&&Date.parse(start)<now)return'Der geplante Vorbereitungsbeginn liegt bereits in der Vergangenheit. Wähle einen späteren Backtermin oder passe die Phasendauern bewusst an. Rezeptur und Reifezeit werden nicht automatisch verkürzt.';return null;
}
export function recordActual(s:PizzaSession,key:ActualPhase,at=new Date().toISOString()) {
  if(!Number.isFinite(Date.parse(at))||Date.parse(at)>Date.now())throw Error('Ist-Zeit muss ein gültiger vergangener Zeitpunkt sein.');
  if(s.completed&&key!=='complete')throw Error('Die Session ist abgeschlossen.');
  s.actual[key]=at;s.locked=true;if(key==='complete'){if(!s.actual.bake)throw Error('Bitte zuerst den tatsächlichen Backbeginn bestätigen.');s.completed=true}
  const ordered=['preparation','bulk','cold','balls','acclimate','bake','complete'] as const;let previous=-Infinity;for(const phase of ordered){if(s.actual[phase]){const time=Date.parse(s.actual[phase]!);if(time<previous)throw Error('Ist-Zeiten müssen in ihrer Arbeitsreihenfolge liegen.');previous=time}}
  if(s.actual.preheat&&s.actual.bake&&Date.parse(s.actual.preheat)>Date.parse(s.actual.bake))throw Error('Vorheizen liegt nach dem Backbeginn.');
}
export function startCooking(s:PizzaSession){if(s.completed||s.scheduleRemoved)throw Error('Bitte eine offene Session mit Backtermin wählen.');s.locked=true;s.actual.preparation??=new Date().toISOString()}
export function advanceCooking(s:PizzaSession) {
  startCooking(s);const steps=guidedSteps(s),index=steps.indexOf(s.cooking.step);if(index<0)throw Error('Kochposition passt nicht zur Rezeptur.');
  const key=`${s.cooking.batch}:${s.cooking.step}`;if(!s.cooking.done.some(x=>x.key===key))s.cooking.done.push({key,at:new Date().toISOString()});
  if(s.cooking.step==='bulk'){if(!s.actual.bulk)recordActual(s,'bulk');return}
  if(index===steps.length-1){s.cooking.batch++;s.cooking.step='prepare'}else s.cooking.step=steps[index+1];
  s.cooking.timer={endAt:null,remainingMs:s.preparation.autolyseMinutes*60000};
}
export function remainingTimer(s:PizzaSession,now:number){return s.cooking.timer.endAt===null?s.cooking.timer.remainingMs:Math.max(0,Math.min(s.preparation.autolyseMinutes*60000,s.cooking.timer.endAt-now))}
export function sessionForecast(s:PizzaSession,now:number) {
  const forecast=maturityForecast(s.monitor,now);const differences=sessionTimeline(s).filter(event=>event.actualKey&&s.actual[event.actualKey]&&Date.parse(s.actual[event.actualKey]!)!==Date.parse(event.at));
  if(!s.actual.bulk){return {...forecast,status:'Frühe Reife' as const,certainty:'Gering',reasons:['Stockgare wurde noch nicht tatsächlich gestartet. Die Zeitkurve zeigt nur den Plan.',...forecast.reasons],recommendations:['Zubereitung und tatsächlichen Gärstart bestätigen; die Planzeit allein belegt keine Entwicklung.',...forecast.recommendations]}}
  if(differences.length)return {...forecast,status:forecast.status==='Voraussichtlich backbereit'?'Reife entwickelt sich' as const:forecast.status,certainty:'Gering',reasons:['Ist-Zeiten weichen vom Plan ab. Es wird keine biologische Zeitkorrektur berechnet.',...forecast.reasons],recommendations:['Teig prüfen und den Zeitplan bei Bedarf bewusst anpassen.',...forecast.recommendations]};return forecast;
}
export function nextSessionAction(s:PizzaSession,now:number){
  if(s.completed)return{label:'Session abgeschlossen',route:'/session',event:null};
  if(s.scheduleRemoved)return{label:'Backtermin planen',route:'/session/planen',event:null};
  if(!s.actual.bulk)return{label:s.locked?`${deviceProfiles[s.device].name}-Kochmodus fortsetzen`:'Teigzubereitung starten',route:'/kochen',event:sessionTimeline(s)[0]??null};
  const events=sessionTimeline(s).filter(e=>e.actualKey&&e.actualKey!=='preparation'&&e.actualKey!=='bulk'&&!s.actual[e.actualKey]);
  const event=events[0]??null;if(!event)return{label:'Session abschließen',route:'/session',event:null};
  const labels:Partial<Record<ActualPhase,string>>={cold:'Teig in den Kühlschrank geben',balls:'Teiglinge portionieren',acclimate:'Akklimatisierung starten',preheat:'Pizzaofen vorbereiten',bake:'Pizza backen'};
  if(Date.parse(event.at)>now&&event.actualKey!=='preheat')return{label:s.actual.balls?'Stückgare überprüfen':'Stockgare überprüfen',route:'/reife-monitor',event};
  return{label:labels[event.actualKey!]??'Session öffnen',route:'/session',event};
}
