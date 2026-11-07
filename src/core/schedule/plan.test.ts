import { describe, expect, it } from "vitest";
import { calculateSchedule, createSchedule, createTeichnerSchedule, type SchedulePlan, nextScheduleSteps, parseBakeInput, scheduleIssues, scheduleWarning } from "./plan";

const plan = () => ({ ...createSchedule(), bakeAt: "2027-01-10T18:00:00.000Z" });
describe("P2 elapsed-time planning", () => {
  it("proposes a rounded bake 48 hours ahead without any storage operation", () => {
    expect(createSchedule(Date.parse("2027-01-01T12:34:56Z")).bakeAt).toBe("2027-01-03T12:34:00.000Z");
  });
  it("calculates the complete cold timeline from the bake backwards", () => {
    const steps = calculateSchedule(plan());
    expect(steps.map(({ id, at }) => [id, at])).toEqual([
      ["mix", "2027-01-09T11:40:00.000Z"], ["bulk", "2027-01-09T12:00:00.000Z"],
      ["cold-bulk", "2027-01-09T14:00:00.000Z"], ["balls", "2027-01-10T14:00:00.000Z"],
      ["preheat", "2027-01-10T17:30:00.000Z"], ["bake", "2027-01-10T18:00:00.000Z"],
    ]);
    expect(steps.find(step => step.id === "cold-bulk")?.temperatureC).toBe(4);
    expect(steps.find(step => step.id === "balls")?.temperatureC).toBe(22);
    expect(steps.find(step => step.id === "preheat")?.temperatureC).toBeUndefined();
  });
  it("ignores the retained cold duration for a room-only plan", () => {
    const steps = calculateSchedule({ ...plan(), method: "direct", coldHours: 72 });
    expect(steps.map(step => step.id)).not.toContain("cold-bulk");
    expect(steps[0].at).toBe("2027-01-10T11:40:00.000Z");
  });
  it("orders preheating chronologically even if it starts before mixing", () => {
    const steps = calculateSchedule({ ...plan(), method: "direct", bulkHours: .25, ballHours: .25, mixMinutes: 5, preheatMinutes: 120 });
    expect(steps[0]).toMatchObject({ id: "preheat", at: "2027-01-10T16:00:00.000Z" });
    expect(steps[1].at).toBe("2027-01-10T17:25:00.000Z");
    expect(steps.at(-1)?.id).toBe("bake");
  });
  it("returns simultaneous next events and never claims overdue actions are completed", () => {
    const p = { ...plan(), ballHours: 1, preheatMinutes: 60 };
    expect(nextScheduleSteps(p, Date.parse("2027-01-10T16:59:00Z")).map(step => step.id)).toEqual(["balls", "preheat"]);
    expect(nextScheduleSteps(p, Date.parse(p.bakeAt)).map(step => step.id)).toEqual(["bake"]);
    expect(nextScheduleSteps(p, Date.parse(p.bakeAt) + 1)).toEqual([]);
    expect(scheduleWarning(p, Date.parse(p.bakeAt) + 1)).toContain("Vergangenheit");
    expect(scheduleWarning(p, Date.parse("2027-01-10T16:00:00Z"))).toContain("Beginn");
    expect(scheduleWarning(p, Date.parse("2027-01-01T00:00:00Z"))).toBeNull();
  });
  it.each([{ version: 2 }, { method: "unknown" }, { bulkHours: NaN }, { coldHours: 11 },
    { ballHours: 0 }, { mixMinutes: 5.5 }, { preheatMinutes: Infinity }, { roomC: 36 },
    { fridgeC: 0 }, { bakeAt: "2027-02-31T18:00:00.000Z" }, { bakeAt: "not a date" }])("rejects invalid plans: %j", patch => {
    const value = { ...plan(), ...patch };
    expect(Object.keys(scheduleIssues(value)).length).toBeGreaterThan(0);
    expect(() => calculateSchedule(value as ReturnType<typeof plan>)).toThrow();
  });
  it("does not mutate the plan during preview or next-step calculation", () => {
    const p = Object.freeze(plan()); const original = structuredClone(p);
    calculateSchedule(p); nextScheduleSteps(p); expect(p).toEqual(original);
  });
  it("ignores unknown stored fields instead of letting them overwrite the reused dough contract", () => {
    expect(calculateSchedule({ ...plan(), id: null, oil: "unknown" } as ReturnType<typeof plan>))
      .toEqual(calculateSchedule(plan()));
  });
  it("preserves elapsed hours through a DST transition", () => {
    const p = { ...plan(), bakeAt: "2027-03-28T16:00:00.000Z" };
    const steps = calculateSchedule(p);
    const cold = steps.find(step => step.id === "cold-bulk")!;
    expect((Date.parse(cold.endsAt!) - Date.parse(cold.at)) / 3600000).toBe(24);
    expect((Date.parse(p.bakeAt) - Date.parse(steps.find(step => step.id === "balls")!.at)) / 3600000).toBe(4);
  });
  it("rejects nonexistent and duplicate local times around Europe/Berlin DST", () => {
    const previous = process.env.TZ;
    process.env.TZ = "Europe/Berlin";
    try {
      expect(() => parseBakeInput("2027-03-28T02:30")).toThrow();
      expect(() => parseBakeInput("2027-10-31T02:30")).toThrow("doppelt");
      expect(parseBakeInput("2027-03-28T03:30")).toBe("2027-03-28T01:30:00.000Z");
    } finally {
      if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
    }
  });
});

describe("Teichner · 48 Stunden", () => {
  const teichner = () => createTeichnerSchedule("2027-01-10T18:00:00.000Z", { mixMinutes: 20, roomC: 22, fridgeC: 4 });
  it("places every transition exactly, with mixing before 48h and parallel preheating", () => {
    const p = teichner(); const before = structuredClone(p); const steps = calculateSchedule(p);
    expect(steps.map(({ id, at, endsAt }) => [id, at, endsAt])).toEqual([
      ["mix", "2027-01-08T17:40:00.000Z", "2027-01-08T18:00:00.000Z"],
      ["cold-bulk", "2027-01-08T18:00:00.000Z", "2027-01-09T18:00:00.000Z"],
      ["cold-balls", "2027-01-09T18:00:00.000Z", "2027-01-10T14:00:00.000Z"],
      ["acclimate", "2027-01-10T14:00:00.000Z", "2027-01-10T18:00:00.000Z"],
      ["preheat", "2027-01-10T17:30:00.000Z", "2027-01-10T18:00:00.000Z"],
      ["bake", "2027-01-10T18:00:00.000Z", undefined],
    ]);
    const phases = steps.filter(step => ["cold-bulk", "cold-balls", "acclimate"].includes(step.id));
    expect(phases.map(step => (Date.parse(step.endsAt!) - Date.parse(step.at)) / 3600000)).toEqual([24, 20, 4]);
    expect(phases.reduce((sum, step) => sum + Date.parse(step.endsAt!) - Date.parse(step.at), 0)).toBe(48 * 3600000);
    expect(Date.parse(p.bakeAt) - Date.parse(steps[0].at)).toBe(48 * 3600000 + 20 * 60000);
    expect(phases.map(step => step.temperatureC)).toEqual([4, 4, 22]);
    expect(steps.find(step => step.id === "cold-balls")?.label).toContain("Portionieren/Rundschleifen");
    expect(steps.at(-1)?.label).toBe("Formen, Belegen und Backen"); expect(p).toEqual(before);
  });
  it("copies only explicit common settings, never the old version or legacy phases", () => {
    const old = { ...plan(), mixMinutes: 35, roomC: 23, fridgeC: 5, preheatMinutes: 90 };
    const copy = structuredClone(old); const next = createTeichnerSchedule(old.bakeAt, old);
    expect(next).toMatchObject({ version: 2, method: "cold-staged", mixMinutes: 35, roomC: 23, fridgeC: 5, preheatMinutes: 30 });
    expect(next).not.toHaveProperty("bulkHours"); expect(next).not.toHaveProperty("coldHours"); expect(old).toEqual(copy);
  });
  it("keeps next steps consistent at every transition and counts no separate portioning duration", () => {
    const p = teichner();
    for (const [now, expected] of [["2027-01-08T18:00:00Z", "cold-bulk"], ["2027-01-09T18:00:00Z", "cold-balls"], ["2027-01-10T14:00:00Z", "acclimate"], ["2027-01-10T17:30:00Z", "preheat"], [p.bakeAt, "bake"]])
      expect(nextScheduleSteps(p, Date.parse(now)).map(step => step.id)).toEqual([expected]);
    expect(calculateSchedule(p)).toHaveLength(6);
  });
  it("keeps the 48 elapsed hours across DST and treats changed durations as an individual schedule", () => {
    const p = { ...teichner(), bakeAt: "2027-03-28T16:00:00.000Z" };
    const steps = calculateSchedule(p);
    expect(Date.parse(p.bakeAt) - Date.parse(steps.find(step => step.id === "cold-bulk")!.at)).toBe(48 * 3600000);
    const changed = { ...p, coldBallHours: 21, mixMinutes: 40, preheatMinutes: 60 };
    const edited = calculateSchedule(changed);
    expect(Date.parse(changed.bakeAt) - Date.parse(edited.find(step => step.id === "cold-bulk")!.at)).toBe(49 * 3600000);
    expect(edited.find(step => step.id === "mix")?.endsAt).toBe(edited.find(step => step.id === "cold-bulk")?.at);
  });
  it.each([{ coldBulkHours: 0 }, { coldBallHours: NaN }, { acclimationHours: 0 }, { roomC: 40 }, { fridgeC: 0 }, { method: "cold" }, { version: 3 }])("rejects invalid staged data %j", patch => {
    expect(() => calculateSchedule({ ...teichner(), ...patch } as SchedulePlan)).toThrow();
  });
});
