import { describe, it, expect } from "vitest";
import { createPlan } from "./model";
import { plannedPhases } from "./calculations";
import { dashboardStatus, timeUntil } from "./dashboardStatus";
describe("dashboard uses actual schedule rather than example ripeness", () => {
  const plan = {
    ...createPlan(),
    bakeAt: "2026-11-05T18:00:00.000Z",
    timeZone: "Europe/Berlin",
    bulkHours: 2,
    ballHours: 10,
  };
  it("shows zero before the scheduled fermentation and the first real work step", () => {
    const phases = plannedPhases(plan);
    const before = Date.parse(phases[0].startsAt) - 3600000;
    const s = dashboardStatus(plan, before);
    expect(s.progress).toBe(0);
    expect(s.next?.label).toBe("Mischen & Kneten");
    expect(s.expired).toBe(false);
  });
  it("calculates elapsed scheduled time and accounts for parallel preheating", () => {
    const end = Date.parse(plan.bakeAt);
    const half = dashboardStatus(plan, end - 6 * 3600000);
    expect(half.progress).toBe(50);
    expect(half.next?.label).toBe("Ofen vorheizen");
    const preheated = dashboardStatus(plan, end - 10 * 60000);
    expect(preheated.next?.label).toBe("Pizza backen");
  });
  it("does not call a past baking date ready or invent a next step", () => {
    const s = dashboardStatus(plan, Date.parse(plan.bakeAt) + 3600000);
    expect(s.progress).toBe(100);
    expect(s.expired).toBe(true);
    expect(s.next).toBeNull();
  });
  it("includes cold fermentation in the actual timeline and formats nonnegative countdowns", () => {
    const cold = { ...plan, method: "cold" as const, coldHours: 24 };
    const end = Date.parse(cold.bakeAt);
    expect(dashboardStatus(cold, end - 18 * 3600000).progress).toBe(50);
    expect(timeUntil(-60000)).toBe("jetzt");
    expect(timeUntil(121 * 60000)).toBe("2 h 1 min");
  });
});
