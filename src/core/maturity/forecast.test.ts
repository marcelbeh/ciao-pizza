import { describe, expect, it } from 'vitest';
import { calculateFormula, defaults } from '../dough/forno';
import { createSchedule, createTeichnerSchedule } from '../schedule/plan';
import { assertMaturity, assertMonitor, emptyMaturity, newMonitor, type DoughCheck } from './model';
import { checkSuggestions, maturityForecast, monitorPhases } from './forecast';
const bake = '2027-01-10T18:00:00.000Z';
const fixture = () => newMonitor(defaults, createTeichnerSchedule(bake, createSchedule()), '2027-01-07T12:00:00.000Z');
const at = (s: string) => Date.parse(s);
const check = (patch: Partial<DoughCheck> = {}): DoughCheck => ({ id:'check-1', slot:'bake', at:'2027-01-10T17:40:00.000Z', skipped:false, volume:'clear',surface:'bubbles',elasticity:'slow',...patch });
describe('Qualitative maturity model v1', () => {
  it('captures calculator/schedule data without mutation and preserves the source after later edits', () => {
    const formula = {...defaults}; const schedule = createTeichnerSchedule(bake,createSchedule()); const plan = newMonitor(formula,schedule);
    expect(plan.yeastGrams).toBe(calculateFormula(formula).ingredients.yeast); expect(plan.yeastKind).toBe('instant');
    formula.flourProfile='Different'; schedule.coldBallHours=21;
    expect(plan.formula.flourProfile).toBe('Caputo Pizzeria 00'); expect(plan.schedule.version===2&&plan.schedule.coldBallHours).toBe(20);
    expect(() => assertMonitor(plan)).not.toThrow();
  });
  it('copies only understood recipe fields and leaves unrelated metadata untouched', () => {
    const source = { ...defaults, futureMetadata: { preserve: true } };
    const snapshot = newMonitor(source,createTeichnerSchedule(bake,createSchedule()));
    expect(snapshot.formula).toEqual(defaults); expect(source.futureMetadata).toEqual({ preserve: true });
    expect(() => assertMonitor(snapshot)).not.toThrow();
  });
  it('separates bulk and pieces for both saved schedule versions with exact plan durations', () => {
    const plan=fixture(); const phases=monitorPhases(plan);
    expect(phases.map(p=>[p.id,p.group])).toEqual([['cold-bulk','bulk'],['cold-balls','piece'],['acclimate','piece']]);
    expect(phases.map(p=>(at(p.endsAt!)-at(p.at))/3600000)).toEqual([24,20,4]);
    const legacy={...plan,schedule:{...createSchedule(),bakeAt:bake}};
    expect(monitorPhases(legacy).map(p=>[p.id,p.group])).toEqual([['bulk','bulk'],['cold-bulk','bulk'],['balls','piece']]);
  });
  it('uses phase boundaries, not arbitrary percentages, and caps confidence without measurements', () => {
    const plan=fixture();
    expect(maturityForecast(plan,at('2027-01-07T12:00Z')).status).toBe('Frühe Reife');
    expect(maturityForecast(plan,at('2027-01-08T20:00Z')).phase).toBe('bulk');
    expect(maturityForecast(plan,at('2027-01-09T20:00Z')).status).toBe('Reife entwickelt sich');
    expect(maturityForecast(plan,at(bake)).status).toBe('Voraussichtlich backbereit');
    expect(maturityForecast(plan,at(bake)).certainty).toBe('Gering');
    expect(maturityForecast(plan,at('2027-01-12T18:00Z')).status).not.toBe('Möglicherweise überreif');
  });
  it('does not infer over-ripeness from one sign and uses two independent signs only as a possibility', () => {
    const plan=fixture(); plan.checks=[check({volume:null,surface:'collapsed',elasticity:null})];
    expect(maturityForecast(plan,at(bake)).status).not.toBe('Möglicherweise überreif');
    expect(maturityForecast(plan,at(bake)).status).not.toBe('Voraussichtlich backbereit');
    plan.checks=[check({volume:null,surface:'collapsed',elasticity:'soft',at:'2027-01-10T19:00:00.000Z'})];
    const result=maturityForecast(plan,at('2027-01-10T19:05Z')); expect(result.status).toBe('Möglicherweise überreif'); expect(result.certainty).toBe('Gering');
  });
  it('gives limited support only with converging current observations and actual temperatures', () => {
    const plan=fixture(); plan.checks=[check()]; plan.conditions={doughC:22,doughAt:'2027-01-08T18:00:00.000Z',roomC:22,fridgeC:4};
    const result=maturityForecast(plan,at('2027-01-10T17:45Z'));
    expect(result.status).toBe('Voraussichtlich backbereit'); expect(result.certainty).toBe('Eingeschränkt gestützt');
    plan.checks=[check({slot:'bulk',at:'2027-01-09T17:30:00.000Z'})];
    expect(maturityForecast(plan,at('2027-01-10T17:45Z')).certainty).toBe('Gering');
  });
  it('suggests optional bulk/piece/bake checks; skipped or future observations do not masquerade as evidence', () => {
    const plan=fixture(); expect(checkSuggestions(plan).map(c=>c.slot)).toEqual(['bulk','piece','bake']);
    const baseline=maturityForecast(plan,at('2027-01-10T17:45Z'));
    plan.checks=[check({skipped:true,volume:null,surface:null,elasticity:null})];
    expect(maturityForecast(plan,at('2027-01-10T17:45Z'))).toEqual(baseline);
    plan.checks=[check({at:'2027-01-11T17:40:00.000Z'})];
    expect(maturityForecast(plan,at('2027-01-10T17:45Z'))).toEqual(baseline);
  });
  it('handles temperature step changes with explanations but never adjusts schedule/recipe', () => {
    const plan=fixture(); plan.temperatures=[{id:'temp',kind:'fridge',at:'2027-01-09T01:00:00.000Z',celsius:9}];
    const before=structuredClone(plan); const result=maturityForecast(plan,at(bake));
    expect(result.reasons.join(' ')).toContain('9 °C'); expect(result.recommendations.join(' ')).toContain('Wärmere');
    expect(result.status).toBe('Reife entwickelt sich'); expect(plan).toEqual(before);
    plan.temperatures[0].celsius=2; expect(maturityForecast(plan,at(bake)).recommendations.join(' ')).toContain('Kühlere');
    plan.conditions.doughC=29; plan.conditions.doughAt='2027-01-08T18:00:00.000Z';
    expect(maturityForecast(plan,at(bake)).recommendations.join(' ')).toContain('Erwärmung');
  });
  it('does not extrapolate plan-only readiness beyond the bake date or call unknown environments measured', () => {
    const plan = fixture();
    expect(maturityForecast(plan,at(bake)+1).status).toBe('Reife entwickelt sich');
    expect(maturityForecast(plan,at(bake)+1).recommendations.join(' ')).toContain('aktuellen Teig-Check');
    plan.checks=[check({at:'2027-01-10T18:05:00.000Z'})];
    expect(maturityForecast(plan,at('2027-01-10T18:10Z')).status).toBe('Voraussichtlich backbereit');
    expect(maturityForecast(plan,at('2027-01-10T18:10Z')).certainty).toBe('Gering');
    plan.conditions={doughC:22,doughAt:'2027-01-08T18:00:00.000Z',roomC:22,fridgeC:null};plan.checks=[check()];
    expect(maturityForecast(plan,at('2027-01-10T17:45Z')).certainty).toBe('Gering');
    expect(maturityForecast(plan,at('2027-01-10T17:45Z')).reasons.join(' ')).toContain('Kühlschranktemperatur ist unbekannt');
  });
  it('distinguishes yeast kinds/amounts conservatively; no yeast cannot get a plan-only ready label', () => {
    const plan=fixture(); const dry=maturityForecast(plan,at(bake));
    const fresh={...plan,yeastKind:'fresh' as const,yeastGrams:plan.yeastGrams*3};
    expect(maturityForecast(fresh,at(bake))).toEqual(dry);
    expect(maturityForecast({...plan,yeastGrams:plan.yeastGrams*2},at(bake)).reasons.join(' ')).toContain('mehr Hefe');
    expect(maturityForecast({...plan,yeastGrams:0},at(bake)).status).not.toBe('Voraussichtlich backbereit');
  });
  it('is deterministic, supports missing measurements and protects unknown models/invalid inputs', () => {
    const plan=Object.freeze(fixture()); expect(maturityForecast(plan,at(bake))).toEqual(maturityForecast(plan,at(bake)));
    expect(maturityForecast(plan,at(bake)).reasons.join(' ')).toContain('Teigtemperatur fehlt');
    expect(()=>assertMaturity({...emptyMaturity(),modelVersion:99})).toThrow();
    expect(()=>assertMonitor({...fixture(),conditions:{doughC:22,doughAt:null,roomC:null,fridgeC:null}})).toThrow();
    expect(()=>maturityForecast(plan,NaN)).toThrow();
  });
});
