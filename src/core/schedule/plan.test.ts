import { describe, expect, it } from "vitest";
import { calculateSchedule, createSchedule, nextScheduleSteps, parseBakeInput, scheduleIssues, scheduleWarning } from "./plan";

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
