import { calculateDough } from "./calculations";
import { createPlan } from "./model";

export interface Formula {
  count: number;
  ballGrams: number;
  hydration: number;
  salt: number;
  yeastPercent: number;
  flourProfile: string;
}
export const defaults: Formula = {
  count: 8, ballGrams: 280, hydration: 66, salt: 3,
  yeastPercent: 0.1, flourProfile: "Caputo Pizzeria 00",
};
export const ranges = {
  count: [1, 500], ballGrams: [50, 2000], hydration: [40, 100],
  salt: [0, 5], yeastPercent: [0, 5],
} as const;
export type NumericField = keyof typeof ranges;
export function formulaIssues(value: Formula): Partial<Record<keyof Formula, string>> {
  const issues: Partial<Record<keyof Formula, string>> = {};
  for (const key of Object.keys(ranges) as NumericField[]) {
    const [min, max] = ranges[key];
    if (!Number.isFinite(value[key]) || value[key] < min || value[key] > max ||
      (key === "count" && !Number.isInteger(value[key]))) {
      issues[key] = `Bitte ${min} bis ${max}${key === "count" ? " (ganze Zahl)" : ""} eingeben.`;
    }
  }
  if (typeof value.flourProfile !== "string" || !value.flourProfile.trim() || value.flourProfile.length > 80)
    issues.flourProfile = "Bitte 1 bis 80 Zeichen eingeben.";
  return issues;
}
/** Use the proven mass balance with fixed P1 constraints: dry yeast, no oil/sugar. */
export function calculateFormula(formula: Formula) {
  if (Object.keys(formulaIssues(formula)).length) throw Error("Ungültige Rezeptur.");
  return calculateDough({
    ...createPlan(new Date("2026-01-01T12:00:00.000Z")), ...formula,
    massMode: "balls", yeastKind: "instant", yeastMode: "manual", oil: 0, sugar: 0,
  });
}
