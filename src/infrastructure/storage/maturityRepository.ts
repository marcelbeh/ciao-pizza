import type { KeyValueStore } from '../../core/storage/KeyValueStore';
import { activeMonitor, assertCheck, assertConditions, assertMaturity, assertMonitor, assertTemperatureEvent, emptyMaturity, type Conditions, type DoughCheck, type MaturityState, type MonitorPlan, type TemperatureEvent } from '../../core/maturity/model';
export const MATURITY_KEY = 'forno:maturity:v1';
const unreadable = 'Reifemonitor-Daten sind nicht lesbar oder haben eine unbekannte Version. Sie bleiben unverändert; bitte eine vollständige Sicherung herunterladen.';
const conflict = () => { throw Error('Diese Planung wurde inzwischen geändert. Entwurf sichern und Ansicht neu laden.'); };
export function createMaturityRepository(store: KeyValueStore) {
  async function update(change: (state: MaturityState) => void) {
    if (!store.update) throw Error('Atomarer Speicherzugriff nicht verfügbar.');
    return store.update<MaturityState>(MATURITY_KEY, raw => {
      if (raw !== undefined) assertMaturity(raw);
      const state = raw === undefined ? emptyMaturity() : structuredClone(raw);
      change(state); assertMaturity(state); return state;
    });
  }
  function planIn(state: MaturityState, id: string) { const plan = activeMonitor(state); if (!plan || plan.id !== id) return conflict(); return plan; }
  const touch = (plan: MonitorPlan) => { plan.updatedAt = new Date(Math.max(Date.now(), Date.parse(plan.updatedAt) + 1)).toISOString(); };
  return {
    async load(): Promise<{ maturity: MaturityState | null; maturityError: string }> {
      try { const raw = await store.get(MATURITY_KEY); if (raw === undefined) return { maturity: emptyMaturity(), maturityError: '' };
        assertMaturity(raw); return { maturity: raw, maturityError: '' };
      } catch { return { maturity: null, maturityError: unreadable }; }
    },
    async activate(plan: MonitorPlan, expectedId: string | null) {
      assertMonitor(plan);
      return update(state => { if (state.activeId !== expectedId || state.plans.some(p => p.id === plan.id)) conflict();
        state.plans.push(structuredClone(plan)); state.activeId = plan.id; });
    },
    async conditions(id: string, value: Conditions, expected: Conditions) {
      assertConditions(value);
      return update(state => { const plan = planIn(state, id); if (JSON.stringify(plan.conditions) !== JSON.stringify(expected)) conflict();
        plan.conditions = structuredClone(value); touch(plan); });
    },
    async temperature(id: string, value: TemperatureEvent, expected: TemperatureEvent | null) {
      assertTemperatureEvent(value);
      return update(state => { const plan = planIn(state, id); const index = plan.temperatures.findIndex(e => e.id === value.id);
        if (expected ? JSON.stringify(plan.temperatures[index]) !== JSON.stringify(expected) : index >= 0) conflict();
        if (index < 0) plan.temperatures.push(structuredClone(value)); else plan.temperatures[index] = structuredClone(value); touch(plan); });
    },
    async check(id: string, value: DoughCheck, expected: DoughCheck | null) {
      assertCheck(value);
      return update(state => { const plan = planIn(state, id); const index = plan.checks.findIndex(c => c.slot === value.slot);
        if (expected ? JSON.stringify(plan.checks[index]) !== JSON.stringify(expected) || value.id !== expected.id : index >= 0) conflict();
        if (index < 0) plan.checks.push(structuredClone(value)); else plan.checks[index] = structuredClone(value); touch(plan); });
    },
    async autolyse(minutes: number) { return update(state => { state.autolyseMinutes = minutes; }); },
  };
}
export type MaturityRepository = ReturnType<typeof createMaturityRepository>;
