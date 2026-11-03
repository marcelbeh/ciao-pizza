import type { DoughState } from "./model";
import { assertPlan } from "./calculations";
export function assertState(value: unknown): asserts value is DoughState {
  if (!value || typeof value !== "object")
    throw Error("Gespeicherte Teigdaten sind ungültig.");
  const s = value as DoughState;
  if (s.version !== 1 || !Array.isArray(s.profiles) || s.profiles.length > 100)
    throw Error("Unbekannte oder ungültige Teigdaten-Version.");
  if (s.active !== null) assertPlan(s.active);
  const ids = new Set<string>();
  for (const profile of s.profiles) {
    if (
      !profile ||
      typeof profile.id !== "string" ||
      !profile.id ||
      ids.has(profile.id) ||
      typeof profile.name !== "string" ||
      !profile.name.trim() ||
      profile.name.length > 80 ||
      !Number.isFinite(Date.parse(profile.updatedAt))
    )
      throw Error("Gespeichertes Profil ist ungültig.");
    assertPlan(profile.plan);
    ids.add(profile.id);
  }
}
