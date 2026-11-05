import { describe, expect, it } from "vitest";
import { calculateFormula, defaults, formulaIssues } from "./forno";

describe("FORNO. mass balance", () => {
  it("calculates the requested defaults, including precise dry yeast", () => {
    const result = calculateFormula(defaults);
    const flour = 2240 / 1.691;
    expect(result.ingredients.flour).toBeCloseTo(flour, 10);
    expect(result.ingredients.water).toBeCloseTo(flour * .66, 10);
    expect(result.ingredients.salt).toBeCloseTo(flour * .03, 10);
    expect(result.ingredients.yeast).toBeCloseTo(flour * .001, 10);
    expect(result.total).toBeCloseTo(2240, 10);
    expect(result.ballGrams).toBeCloseTo(280, 10);
    expect(result.ingredients.oil + result.ingredients.sugar).toBe(0);
  });
  it("scales all ingredients without rounding intermediate quantities", () => {
    const first = calculateFormula({ ...defaults, count: 1 });
    const eight = calculateFormula(defaults);
    for (const key of ["flour", "water", "salt", "yeast"] as const)
      expect(eight.ingredients[key]).toBeCloseTo(first.ingredients[key] * 8, 10);
    const changed = calculateFormula({ ...defaults, count: 3, ballGrams: 250, hydration: 72, salt: 2.5, yeastPercent: .025 });
    expect(changed.total).toBeCloseTo(750, 10);
    expect(changed.ingredients.yeast).toBeGreaterThan(0);
    expect(changed.ingredients.yeast).toBeLessThan(1);
  });
  it("allows zero salt/yeast and supported boundary values", () => {
    const result = calculateFormula({ ...defaults, count: 1, ballGrams: 50, hydration: 40, salt: 0, yeastPercent: 0 });
    expect(result.total).toBeCloseTo(50);
    expect(result.ingredients.yeast).toBe(0);
    expect(result.ingredients.salt).toBe(0);
    expect(calculateFormula({ ...defaults, count: 500, ballGrams: 2000, hydration: 100, salt: 5, yeastPercent: 5 }).total).toBeCloseTo(1000000);
  });
  it.each([
    { count: 0 }, { count: 1.5 }, { ballGrams: -1 }, { hydration: 101 },
    { salt: -1 }, { yeastPercent: NaN }, { hydration: Infinity }, { flourProfile: "" },
  ])("rejects invalid values without returning misleading quantities: %j", patch => {
    const formula = { ...defaults, ...patch };
    expect(Object.keys(formulaIssues(formula)).length).toBeGreaterThan(0);
    expect(() => calculateFormula(formula)).toThrow("Ungültige Rezeptur");
  });
});
