import { describe, expect, it } from "vitest";
import { applyStyle, createPlan, styles } from "./model";
import {
  calculateDough,
  convertYeast,
  formatGrams,
  fromLocalInput,
  pizzaCount,
  plannedPhases,
  planWarnings,
  validatePlan,
  yeastGuideline,
} from "./calculations";
describe("dough mass and baker percentages", () => {
  it("includes every ingredient in the desired total mass", () => {
    const plan = {
      ...createPlan(),
      count: 5,
      ballGrams: 340,
      hydration: 60,
      salt: 3,
      oil: 2,
      sugar: 4,
      yeastMode: "manual" as const,
      yeastPercent: 1,
    };
    const result = calculateDough(plan);
    expect(result.ingredients).toEqual({
      flour: 1000,
      water: 600,
      salt: 30,
      oil: 20,
      sugar: 40,
      yeast: 10,
    });
    expect(result.total).toBe(1700);
    expect(result.ballGrams).toBe(340);
  });
  it("scales from flour without losing oil, sugar or yeast", () => {
    const result = calculateDough({
      ...createPlan(),
      massMode: "flour",
      flourGrams: 1000,
      hydration: 65,
      salt: 2.5,
      oil: 3,
      sugar: 1,
      yeastMode: "manual",
      yeastPercent: 0.5,
    });
    expect(result.total).toBe(1720);
    expect(result.ballGrams).toBe(430);
  });
  it.each(Object.keys(styles) as (keyof typeof styles)[])(
    "preserves requested mass across %s sizes and yeast kinds",
    (style) => {
      for (const kind of ["fresh", "instant"] as const)
        for (const count of [1, 4, 100])
          for (const ballGrams of [50, 251.3, 2000]) {
            const p = {
              ...applyStyle(createPlan(), style),
              yeastKind: kind,
              count,
              ballGrams,
            };
            const r = calculateDough(p);
            expect(r.total).toBeCloseTo(count * ballGrams, 8);
            expect(
              (r.ingredients.water / r.ingredients.flour) * 100,
            ).toBeCloseTo(p.hydration, 10);
            expect(Object.values(r.ingredients).every(Number.isFinite)).toBe(
              true,
            );
          }
    },
  );
  it.each([0, -1, Infinity, NaN])(
    "rejects invalid count %s before division",
    (count) =>
      expect(() => calculateDough({ ...createPlan(), count })).toThrow(),
  );
  it("validates types, enum values, bounds, fractions and malformed saved data", () => {
    expect(
      validatePlan({
        ...createPlan(),
        hydration: 101,
        count: 1.5,
        oil: -1,
        name: " ",
        style: "constructor",
      }),
    ).toMatchObject({
      hydration: expect.any(String),
      count: expect.any(String),
      oil: expect.any(String),
      name: expect.any(String),
      style: expect.any(String),
    });
    expect(() => calculateDough(null as never)).toThrow();
    expect(validatePlan({ ...createPlan(), fridgeC: NaN })).toHaveProperty(
      "fridgeC",
    );
  });
  it("rounds only for display and keeps fractional yeast visible", () => {
    expect(formatGrams(0.0367, true)).toBe("0,037");
    expect(formatGrams(0.0001, true)).toBe("<0,001");
    expect(formatGrams(125.26)).toBe("125,3");
    expect(calculateDough(createPlan()).ingredients.flour).not.toBe(
      Math.round(calculateDough(createPlan()).ingredients.flour * 10) / 10,
    );
  });
  it("rounds pizzas upwards before adding whole reserve", () => {
    expect(pizzaCount(3, 1.5, 2)).toBe(7);
    expect(() => pizzaCount(0, 1, 0)).toThrow();
  });
});
describe("transparent yeast guidelines and planning", () => {
  it("uses coarse duration tiers and explicit temperature factors", () => {
    const p = createPlan();
    expect(yeastGuideline(p).percent).toBe(0.2);
    expect(yeastGuideline({ ...p, bulkHours: 2, ballHours: 4 }).percent).toBe(
      0.6,
    );
    expect(yeastGuideline({ ...p, ballHours: 16 }).percent).toBe(0.1);
    expect(yeastGuideline({ ...p, roomC: 18 }).percent).toBeCloseTo(0.3);
    expect(yeastGuideline({ ...p, roomC: 27 }).percent).toBeCloseTo(0.13);
    expect(
      yeastGuideline({ ...p, method: "cold", coldHours: 48 }).percent,
    ).toBe(0.15);
    expect(
      yeastGuideline({
        ...p,
        method: "cold",
        coldHours: 24,
        yeastKind: "instant",
      }).percent,
    ).toBeCloseTo(0.1);
  });
  it("converts yeast dosage while recalculating total mass", () => {
    expect(convertYeast(0.3, "fresh", "instant")).toBeCloseTo(0.1);
    expect(convertYeast(0.1, "instant", "fresh")).toBeCloseTo(0.3);
    const p = {
      ...createPlan(),
      yeastMode: "manual" as const,
      yeastPercent: 0.3,
    };
    const a = calculateDough(p),
      b = calculateDough({ ...p, yeastKind: "instant", yeastPercent: 0.1 });
    expect(a.total).toBeCloseTo(b.total);
    expect(b.ingredients.flour).toBeGreaterThan(a.ingredients.flour);
  });
  it("derives contiguous phases backwards with parallel preheating", () => {
    const p = {
      ...createPlan(),
      method: "cold" as const,
      bulkHours: 2,
      coldHours: 24,
      ballHours: 3,
      bakeAt: "2026-11-06T18:00:00.000Z",
    };
    const phases = plannedPhases(p);
    expect(phases.map((s) => s.id)).toEqual([
      "mix",
      "bulk",
      "cold-bulk",
      "balls",
      "preheat",
    ]);
    expect(phases[0].startsAt).toBe("2026-11-05T12:40:00.000Z");
    for (let i = 0; i < 3; i++)
      expect(phases[i].endsAt).toBe(phases[i + 1].startsAt);
    expect(phases[3].endsAt).toBe(p.bakeAt);
    expect(phases[4].endsAt).toBe(p.bakeAt);
    expect(phases.every((s) => s.estimated)).toBe(true);
  });
  it("warns rather than silently changing infeasible or uncertain plans", () => {
    const p = {
      ...createPlan(),
      method: "cold" as const,
      fridgeC: 9,
      roomC: 32,
      bakeAt: "2020-01-01T00:00:00.000Z",
      sugar: 2,
      ovenC: 450,
    };
    const warnings = planWarnings(p);
    expect(warnings.some((w) => w.includes("Vergangenheit"))).toBe(true);
    expect(warnings.some((w) => w.includes("6 °C"))).toBe(true);
    expect(warnings.some((w) => w.includes("verbrennen"))).toBe(true);
  });
  it("rejects invalid local calendar dates", () => {
    expect(() => fromLocalInput("2026-02-30T18:00")).toThrow();
    expect(() => fromLocalInput("")).toThrow();
  });
});
