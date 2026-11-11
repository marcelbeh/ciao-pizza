import type { KeyValueStore } from "../../core/storage/KeyValueStore";
import { defaults, formulaIssues, type Formula } from "../../core/dough/forno";
import { validatePlan, calculateDough, convertYeast } from "../../core/dough/calculations";
import type { DoughPlan } from "../../core/dough/model";
import { readSchedule, saveSchedule, SCHEDULE_KEY } from "./scheduleRepository";
import { createPizzaNightRepository, PIZZA_NIGHT_KEY } from "./pizzaNightRepository";
import type { SchedulePlan } from "../../core/schedule/plan";

import { createMaturityRepository, MATURITY_KEY } from "./maturityRepository";

export const FORNO_KEY = "forno:calculator:v1";
export const LEGACY_KEYS = ["ciao-workspace:v2", "dough-workspace:v1"] as const;
export interface SavedFormula { version: 1; formula: Formula }
export interface EveningSummary {
  name: string; bakeAt: string; timeZone: string; count: number; ballGrams: number;
}
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : undefined;
}
/** Read-only projection. Originals, including unknown fields and personal recipes, are never rewritten. */
export function latestEvening(workspace: unknown): EveningSummary | null {
  const raw = record(workspace);
  if (!raw || raw.version !== 2 || !Array.isArray(raw.evenings)) return null;
  const candidates = raw.evenings.flatMap(value => {
    const e = record(value);
    if (!e || typeof e.name !== "string" || !e.name.trim() ||
      typeof e.bakeAt !== "string" || !Number.isFinite(Date.parse(e.bakeAt)) ||
      typeof e.updatedAt !== "string" || !Number.isFinite(Date.parse(e.updatedAt)) ||
      typeof e.timeZone !== "string") return [];
    try { new Intl.DateTimeFormat("de", { timeZone: e.timeZone }); } catch { return []; }
    const dough = e.dough as DoughPlan;
    if (Object.keys(validatePlan(dough)).length) return [];
    const result = calculateDough(dough);
    return [{ summary: { name: e.name, bakeAt: e.bakeAt, timeZone: e.timeZone,
      count: dough.count, ballGrams: result.ballGrams }, updated: Date.parse(e.updatedAt) }];
  });
  return candidates.sort((a, b) => b.updated - a.updated)[0]?.summary ?? null;
}
export function copyCompatibleFormula(value: unknown): Formula | null {
  const plan = record(value);
  // Recipes with oil/sugar or flour-based amounts cannot be represented faithfully in P1.
  if (!plan || plan.version !== 1 || plan.massMode !== "balls" || plan.oil !== 0 || plan.sugar !== 0 ||
    plan.yeastMode !== "manual" || !["instant", "fresh"].includes(String(plan.yeastKind))) return null;
  const formula = {
    count: plan.count, ballGrams: plan.ballGrams, hydration: plan.hydration,
    salt: plan.salt, flourProfile: plan.flourProfile,
    yeastPercent: typeof plan.yeastPercent === "number"
      ? convertYeast(plan.yeastPercent, plan.yeastKind as "fresh" | "instant", "instant") : NaN,
  } as Formula;
  return Object.keys(formulaIssues(formula)).length ? null : formula;
}
export function createFornoRepository(store: KeyValueStore) {
  const pizzaNight = createPizzaNightRepository(store);
  const maturity = createMaturityRepository(store);
  return {
    pizzaNight, maturity,
    async load() {
      const [saved, workspace, oldDough, rawSchedule] = await Promise.all([
        store.get<unknown>(FORNO_KEY), store.get<unknown>(LEGACY_KEYS[0]), store.get<unknown>(LEGACY_KEYS[1]),
        store.get<unknown>(SCHEDULE_KEY),
      ]);
      const pizza = await pizzaNight.load();
      const monitoring = await maturity.load();
      let formula: Formula;
      let copied = false;
      if (saved !== undefined) {
        const data = record(saved);
        const candidate = record(data?.formula);
        if (data?.version !== 1 || !candidate || Object.keys(formulaIssues(candidate as unknown as Formula)).length)
          throw Error("Gespeicherte FORNO.-Einstellungen sind nicht lesbar. Sie wurden nicht überschrieben. Bitte zuerst eine Sicherung herunterladen.");
        formula = candidate as unknown as Formula;
      } else {
        const active = workspace !== undefined
          ? record(record(workspace)?.dough)?.active : record(oldDough)?.active;
        const compatible = copyCompatibleFormula(active);
        formula = compatible ?? { ...defaults };
        copied = !!compatible;
        // No write on load. A user edit creates the separate FORNO. entry.
      }
      return { ...pizza, ...monitoring, formula, evening: latestEvening(workspace), copied, ...readSchedule(rawSchedule),
        hasLegacy: workspace !== undefined || oldDough !== undefined };
    },
    async save(formula: Formula) {
      if (Object.keys(formulaIssues(formula)).length) throw Error("Ungültige Rezeptur wird nicht gespeichert.");
      await store.set<SavedFormula>(FORNO_KEY, { version: 1, formula });
    },
    saveSchedule: (plan: SchedulePlan) => saveSchedule(store, plan),
    async backup() {
      const keys = [FORNO_KEY, ...LEGACY_KEYS, SCHEDULE_KEY, PIZZA_NIGHT_KEY, MATURITY_KEY];
      const entries = store.entries ? await store.entries() : Object.fromEntries(
        (await Promise.all(keys.map(async key => [key, await store.get(key)] as const)))
          .filter(([, value]) => value !== undefined),
      );
      return { format: "forno-preserved-data", version: 1, entries };
    },
  };
}
export type FornoRepository = ReturnType<typeof createFornoRepository>;
