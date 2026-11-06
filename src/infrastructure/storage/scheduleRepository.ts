import type { KeyValueStore } from "../../core/storage/KeyValueStore";
import { assertSchedule, type SchedulePlan } from "../../core/schedule/plan";

export const SCHEDULE_KEY = "forno:schedule:v1";
export function readSchedule(raw: unknown): { schedule: SchedulePlan | null; scheduleError: string } {
  if (raw === undefined) return { schedule: null, scheduleError: "" };
  try {
    assertSchedule(raw);
    return { schedule: raw, scheduleError: "" };
  } catch {
    return { schedule: null, scheduleError: "Der gespeicherte Zeitplan ist nicht lesbar und wurde nicht überschrieben. Bitte unter Einstellungen eine Sicherung herunterladen." };
  }
}
export async function saveSchedule(store: KeyValueStore, plan: SchedulePlan) {
  assertSchedule(plan);
  if (store.update) {
    await store.update<SchedulePlan>(SCHEDULE_KEY, previous => {
      if (previous !== undefined) assertSchedule(previous);
      return plan;
    });
  } else {
    const previous = await store.get(SCHEDULE_KEY);
    if (previous !== undefined) assertSchedule(previous);
    await store.set(SCHEDULE_KEY, plan);
  }
}
