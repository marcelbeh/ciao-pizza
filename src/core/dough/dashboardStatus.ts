import type { DoughPlan } from "./model";
import { plannedPhases } from "./calculations";
/** Elapsed scheduled fermentation time, never a measurement of biological ripeness. */
export function dashboardStatus(plan: DoughPlan, now = Date.now()) {
  const phases = plannedPhases(plan);
  const start = Date.parse(phases.find((p) => p.id === "bulk")!.startsAt);
  const end = Date.parse(plan.bakeAt);
  const progress = Math.round(
    Math.max(0, Math.min(1, (now - start) / (end - start))) * 100,
  );
  const events = [
    ...phases.map((p) => ({ label: p.label, at: Date.parse(p.startsAt) })),
    { label: "Pizza backen", at: end },
  ].sort((a, b) => a.at - b.at);
  const next = events.find((e) => e.at > now) ?? null;
  return {
    progress,
    next,
    expired: now >= end,
    current:
      phases.filter(
        (p) =>
          p.id !== "preheat" &&
          Date.parse(p.startsAt) <= now &&
          Date.parse(p.endsAt) > now,
      )[0]?.label ?? (now < start ? "Vorbereitung" : "Backtermin erreicht"),
  };
}
export function timeUntil(milliseconds: number) {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60000));
  if (!minutes) return "jetzt";
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`
    : `${minutes} min`;
}
