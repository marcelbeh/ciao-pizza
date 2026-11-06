import { fromLocalInput, limits, plannedPhases, toLocalInput } from "../dough/calculations";
import { createPlan } from "../dough/model";

export interface SchedulePlan {
  version: 1;
  bakeAt: string;
  method: "direct" | "cold";
  bulkHours: number;
  coldHours: number;
  ballHours: number;
  mixMinutes: number;
  preheatMinutes: number;
  roomC: number;
  fridgeC: number;
}
export const scheduleRanges = {
  bulkHours: limits.bulkHours, coldHours: limits.coldHours, ballHours: limits.ballHours,
  mixMinutes: limits.mixMinutes, preheatMinutes: limits.preheatMinutes,
  roomC: limits.roomC, fridgeC: limits.fridgeC,
} as const;
export type ScheduleNumber = keyof typeof scheduleRanges;
export type ScheduleIssues = Partial<Record<keyof SchedulePlan | "plan", string>>;

export function createSchedule(now = Date.now()): SchedulePlan {
  return {
    version: 1, bakeAt: new Date(Math.floor((now + 48 * 3600000) / 60000) * 60000).toISOString(),
    method: "cold", bulkHours: 2, coldHours: 24, ballHours: 4,
    mixMinutes: 20, preheatMinutes: 30, roomC: 22, fridgeC: 4,
  };
}
export function scheduleIssues(value: unknown): ScheduleIssues {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { plan: "Ungültiger Zeitplan." };
  const plan = value as SchedulePlan;
  const issues: ScheduleIssues = {};
  if (plan.version !== 1) issues.version = "Unbekannte Zeitplanversion.";
  if (!["direct", "cold"].includes(plan.method)) issues.method = "Teigführung wählen.";
  if (typeof plan.bakeAt !== "string" || !/^\d{4}-\d\d-\d\dT/.test(plan.bakeAt) || !Number.isFinite(Date.parse(plan.bakeAt)) ||
    new Date(plan.bakeAt).toISOString() !== plan.bakeAt) issues.bakeAt = "Gültigen Backtermin wählen.";
  for (const key of Object.keys(scheduleRanges) as ScheduleNumber[]) {
    const [min, max] = scheduleRanges[key];
    if (!Number.isFinite(plan[key]) || plan[key] < min || plan[key] > max ||
      ((key === "mixMinutes" || key === "preheatMinutes") && !Number.isInteger(plan[key])))
      issues[key] = `Bitte ${min} bis ${max}${key.endsWith("Minutes") ? " ganze Minuten" : ""} eingeben.`;
  }
  return issues;
}
export function assertSchedule(value: unknown): asserts value is SchedulePlan {
  if (Object.keys(scheduleIssues(value)).length) throw Error("Der Zeitplan enthält ungültige Werte.");
}

/** Reject missing spring times and ambiguous autumn times instead of silently shifting a bake. */
export function parseBakeInput(value: string): string {
  const iso = fromLocalInput(value);
  for (const minutes of [30, 60, 90, 120]) {
    if (toLocalInput(new Date(Date.parse(iso) + minutes * 60000).toISOString()) === value)
      throw Error("Diese Uhrzeit kommt durch die Zeitumstellung doppelt vor. Bitte eine eindeutige Uhrzeit wählen.");
  }
  return iso;
}
export interface ScheduleStep {
  id: "mix" | "bulk" | "cold-bulk" | "balls" | "preheat" | "bake";
  label: string;
  at: string;
  endsAt?: string;
  temperatureC?: number;
}
/** Reuse P1's elapsed-time arithmetic. Durations are user choices, not fermentation predictions. */
export function calculateSchedule(plan: SchedulePlan): ScheduleStep[] {
  assertSchedule(plan);
  const times = Object.fromEntries((Object.keys(scheduleRanges) as ScheduleNumber[]).map(key => [key, plan[key]]));
  const phases = plannedPhases({
    ...createPlan(new Date("2026-01-01T12:00:00.000Z")), ...times,
    method: plan.method, bakeAt: plan.bakeAt,
  });
  const labels = {
    mix: "Teig mischen und kneten", bulk: "Stockgare bei Raumtemperatur",
    "cold-bulk": "Teig in den Kühlschrank", balls: "Portionieren und Stückgare",
    preheat: "Ofen vorheizen",
  };
  const steps: ScheduleStep[] = phases.map(phase => ({
    id: phase.id, label: labels[phase.id], at: phase.startsAt, endsAt: phase.endsAt,
    ...(["bulk", "cold-bulk", "balls"].includes(phase.id) ? { temperatureC: phase.temperatureC } : {}),
  }));
  steps.push({ id: "bake", label: "Pizza backen", at: plan.bakeAt });
  return steps.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
export function nextScheduleSteps(plan: SchedulePlan, now = Date.now()): ScheduleStep[] {
  const steps = calculateSchedule(plan).filter(step => Date.parse(step.at) >= now);
  return steps.filter(step => step.at === steps[0]?.at);
}
export function scheduleWarning(plan: SchedulePlan, now = Date.now()): string | null {
  if (Date.parse(plan.bakeAt) <= now) return "Der Backtermin ist erreicht oder liegt in der Vergangenheit. Bitte den Termin bei Bedarf aktualisieren.";
  if (Date.parse(calculateSchedule(plan)[0].at) < now)
    return "Der geplante Beginn liegt bereits in der Vergangenheit. Prüfe Backtermin und Phasendauern.";
  return null;
}
