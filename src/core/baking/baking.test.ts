import { describe, expect, it } from "vitest";
import { createPlan } from "../dough/model";
import { newEvening } from "../planning/calculations";
import {
  newSession,
  transition,
  freshTimer,
  startTimer,
  pauseTimer,
  elapsed,
  remaining,
  recommendations,
} from "./coach";
import { diagnose } from "./diagnosis";
import {
  newEntry,
  recipeFromEntry,
  successful,
  insights,
  compareEntries,
} from "./journal";
import { emptyObservations, type DiagnosticInput } from "./model";
import { assertBaking, assertEntry, assertSession } from "./validation";
import { assertRecipe } from "../planning/recipes";
const request = (problem: DiagnosticInput["problem"]): DiagnosticInput => ({
  problem,
  plan: createPlan(),
  actual: emptyObservations(),
  temperature: "unknown",
  rest: "unknown",
  rise: "unknown",
  browning: "both",
});
describe("persistent timestamp timer and coach state machine", () => {
  it("counts elapsed wall time across reload, pauses precisely and clamps remaining at zero", () => {
    let timer = startTimer(freshTimer(90), 1000);
    expect(remaining(timer, 31000)).toBe(60000);
    timer = JSON.parse(JSON.stringify(timer));
    expect(remaining(timer, 61000)).toBe(30000);
    timer = pauseTimer(timer, 61000);
    expect(remaining(timer, 999000)).toBe(30000);
    timer = startTimer(timer, 100000);
    expect(remaining(timer, 140000)).toBe(0);
    expect(elapsed(timer, 140000)).toBe(100000);
    expect(elapsed(timer, 90000)).toBe(60000);
  });
  it("requires explicit steps, preserves pizza distribution and never auto-completes on expiry", () => {
    const evening = newEvening();
    let s = newSession(undefined, evening);
    expect(s.pizzas).toEqual(Array(4).fill("Margherita"));
    expect(() => transition(s, "done")).toThrow();
    s = transition(s, "start", 1000);
    expect(remaining(s.timer, 99999999)).toBe(0);
    expect(s.step).toBe("preheat");
    s = transition(s, "ready", 2000);
    s = transition(s, "launch", 3000);
    s = transition(s, "turn", 33000);
    s = transition(s, "check", 93000);
    expect(s.step).toBe("check");
    s = transition(s, "continue", 100000);
    s = transition(s, "check", 110000);
    s = transition(s, "done", 120000);
    expect(s.completed[0].seconds).toBe(100);
    expect(s.lastTurnMs).toBe(0);
    expect(s.completed[0].name).toBe("Margherita");
    expect(s.step).toBe("prepare");
    expect(() => assertSession(s)).not.toThrow();
  });
  it("schedules the next turn from the confirmed turn, even if it was late", () => {
    let s = newSession();
    s = transition(s, "ready", 1000);
    s = transition(s, "launch", 2000);
    s = transition(s, "turn", 62000);
    expect(s.lastTurnMs).toBe(60000);
    expect(elapsed(s.timer, 70000) - s.lastTurnMs!).toBeLessThan(
      s.settings.turnSeconds * 1000,
    );
  });
  it("finishes exactly one planned pizza and restart does not erase completed pizzas", () => {
    let s = newSession({ ...createPlan(), count: 1 });
    s = transition(s, "ready");
    s = transition(s, "launch", 1000);
    s = transition(s, "restart", 2000);
    expect(s.step).toBe("bake");
    expect(s.timer.startedAt).toBeNull();
    s = transition(s, "start", 3000);
    s = transition(s, "check", 93000);
    s = transition(s, "done", 100000);
    expect(s.step).toBe("complete");
    expect(s.completed).toHaveLength(1);
    expect(() => transition(s, "done")).toThrow();
  });
  it("uses device/style defaults with adjustable targets and validates unsupported values", () => {
    const p = createPlan();
    expect(recommendations(p).turnSeconds).toBe(25);
    expect(recommendations({ ...p, oven: "home" }).ovenC).toBeLessThanOrEqual(
      350,
    );
    expect(recommendations({ ...p, oven: "grill" }).topC).toBeNull();
    const s = newSession();
    s.settings.bakeSeconds = 0;
    expect(() => assertSession(s)).toThrow("Backeinstellungen");
  });
});
describe("transparent local diagnostic rules", () => {
  it("provides concrete cause, evidence, immediate action, next action and parameter explanation for every problem", async () => {
    const { problems } = await import("./model");
    for (const problem of Object.keys(problems)) {
      const result = diagnose(request(problem as DiagnosticInput["problem"]));
      expect(result.engine).toBe("rules-v1");
      expect(result.findings[0].now.length).toBeGreaterThan(20);
      expect(result.findings[0].next.length).toBeGreaterThan(20);
      expect(result.findings[0].evidence).toContain("Plan:");
      expect(result.findings[0].parameter.length).toBeGreaterThan(20);
    }
  });
  it("applies hydration and temperature rules only when the actual context supports them", () => {
    const r = request("sticky");
    r.plan.hydration = 72;
    expect(diagnose(r).findings.some((f) => f.id === "high-water")).toBe(true);
    const cold = request("shrinking");
    cold.plan.doughC = 24;
    cold.actual.doughC = 15;
    expect(diagnose(cold).findings.some((f) => f.id === "cold")).toBe(true);
    cold.actual.doughC = 24;
    expect(diagnose(cold).findings.some((f) => f.id === "cold")).toBe(false);
  });
  it("does not invent measured heat or proofing deficits from missing values", () => {
    const r = request("soggy");
    const heat = diagnose(r).findings.find((f) => f.id === "heat-balance")!;
    expect(heat.evidence).toContain("Stein nicht gemessen");
    expect(heat.evidence).toContain("geplant");
    expect(diagnose(r).note).toContain("keine sichere Diagnose");
    r.actual.roomC = NaN;
    expect(() => diagnose(r)).toThrow("Messwerte");
  });
  it("uses observed collapse and long/warm conditions as named checks, not probabilities", () => {
    const r = request("overproof");
    r.rise = "collapsed";
    r.actual.roomC = 28;
    r.actual.bulkHours = 10;
    r.actual.ballHours = 10;
    const f = diagnose(r).findings.find((f) => f.id === "structure")!;
    expect(f.evidence).toContain("kollabiert");
    expect(f.parameter).toContain("keine Gärprognose");
  });
});
describe("journal snapshots and modest learning", () => {
  it("copies source recipe and plan; does not turn temperature targets into observations", () => {
    const evening = newEvening();
    const e = newEntry(undefined, evening);
    evening.dough.hydration = 90;
    evening.lines[0].recipe.name = "changed";
    expect(e.plan.hydration).toBe(60);
    expect(e.recipe?.name).toBe("Margherita");
    expect(Object.values(e.actual).every((v) => v === null)).toBe(true);
    expect(() => assertEntry(e)).not.toThrow();
  });
  it("takes the mean measured bake duration from a run, not its target heat", () => {
    const s = newSession();
    s.completed = [
      {
        name: "one",
        seconds: 90,
        finishedAt: new Date().toISOString(),
        settings: s.settings,
      },
      {
        name: "two",
        seconds: 120,
        finishedAt: new Date().toISOString(),
        settings: s.settings,
      },
    ];
    const e = newEntry(undefined, undefined, s);
    expect(e.actual.bakeSeconds).toBe(105);
    expect(e.actual.ovenC).toBeNull();
  });
  it("saves a reusable dough-only recipe without fabricating topping ingredients", () => {
    const e = newEntry();
    e.notes = "Gelungen";
    const recipe = recipeFromEntry(e);
    expect(recipe.ingredients).toEqual([]);
    expect(recipe.dough).toEqual(e.plan);
    expect(recipe.instructions).toContain("ohne Belag");
    expect(() => assertRecipe(recipe)).not.toThrow();
  });
  it("requires all ratings and no observed problem for a highlighted success", () => {
    const e = newEntry();
    expect(successful(e)).toBe(false);
    e.ratings = { taste: 4, structure: 5, bake: 4 };
    expect(successful(e)).toBe(true);
    e.problems = ["sticky"];
    expect(successful(e)).toBe(false);
  });
  it("finds only explicitly repeated problems and never infers problems from free text", () => {
    const a = newEntry(),
      b = newEntry();
    a.problems = ["soggy"];
    b.problems = ["soggy"];
    b.notes = "sticky";
    expect(insights([a])).toEqual([]);
    expect(insights([a, b])).toHaveLength(1);
    expect(insights([a, b])[0].id).toBe("repeat:soggy");
  });
  it("compares deltas without substituting unknown measurements", () => {
    const a = newEntry(),
      b = newEntry();
    a.plan.hydration = 60;
    b.plan.hydration = 65;
    a.actual.bakeSeconds = 90;
    const rows = compareEntries(a, b);
    expect(rows.find((r) => r.label === "Hydration")?.delta).toBe(5);
    expect(rows.find((r) => r.label === "bakeSeconds")?.delta).toBeNull();
  });
  it("rejects invalid ratings, impossible measurements and inconsistent timer progress", () => {
    const e = newEntry();
    e.ratings.taste = 6;
    expect(() => assertEntry(e)).toThrow();
    e.ratings.taste = null;
    e.actual.bulkHours = -1;
    expect(() => assertEntry(e)).toThrow("Messwerte");
    const s = newSession();
    s.step = "complete";
    expect(() => assertSession(s)).toThrow("Backfortschritt");
    expect(() =>
      assertBaking({
        version: 1,
        entries: [],
        sessions: Array(31).fill(newSession()),
        diagnoses: [],
      }),
    ).toThrow();
  });
});
