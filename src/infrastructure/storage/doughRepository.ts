import type { KeyValueStore } from "../../core/storage/KeyValueStore";
import type { DoughState } from "../../core/dough/model";
import { assertPlan } from "../../core/dough/calculations";
export const DOUGH_KEY = "dough-workspace:v1";
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
export function createDoughRepository(store: KeyValueStore) {
  return {
    async load(): Promise<DoughState> {
      const saved = await store.get<unknown>(DOUGH_KEY);
      if (saved === undefined)
        return { version: 1, active: null, profiles: [] };
      assertState(saved);
      return saved;
    },
    async save(state: DoughState) {
      assertState(state);
      await store.set(DOUGH_KEY, state);
    },
  };
}
