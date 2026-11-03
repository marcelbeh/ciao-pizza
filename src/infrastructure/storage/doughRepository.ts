import type { KeyValueStore } from "../../core/storage/KeyValueStore";
import type { DoughState } from "../../core/dough/model";
import { assertState } from "../../core/dough/stateValidation";
export { assertState } from "../../core/dough/stateValidation";
export const DOUGH_KEY = "dough-workspace:v1";
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
