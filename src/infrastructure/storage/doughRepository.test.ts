import { describe, expect, it } from "vitest";
import { createPlan, type DoughState } from "../../core/dough/model";
import { createIndexedDbStore } from "./indexedDbStore";
import { createDoughRepository, DOUGH_KEY } from "./doughRepository";
describe("versioned dough workspace in IndexedDB", () => {
  it("persists active plan and profile CRUD across repository instances", async () => {
    const name = crypto.randomUUID();
    const store = createIndexedDbStore(name);
    const repo = createDoughRepository(store);
    expect(await repo.load()).toEqual({
      version: 1,
      active: null,
      profiles: [],
    });
    const plan = createPlan();
    const state: DoughState = {
      version: 1,
      active: plan,
      profiles: [
        {
          id: "one",
          name: "Freitag",
          plan: structuredClone(plan),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    await repo.save(state);
    const reloaded = await createDoughRepository(
      createIndexedDbStore(name),
    ).load();
    expect(reloaded).toEqual(state);
    reloaded.active!.hydration = 72;
    expect(reloaded.profiles[0].plan.hydration).toBe(60);
    reloaded.profiles[0] = {
      ...reloaded.profiles[0],
      name: "Samstag",
      plan: structuredClone(reloaded.active!),
    };
    await repo.save(reloaded);
    expect((await repo.load()).profiles[0].plan.hydration).toBe(72);
    reloaded.profiles = [];
    await repo.save(reloaded);
    expect((await repo.load()).profiles).toEqual([]);
    expect((await repo.load()).active?.hydration).toBe(72);
  });
  it("does not replace corrupt or unknown data with defaults", async () => {
    const store = createIndexedDbStore(crypto.randomUUID());
    const repo = createDoughRepository(store);
    await store.set(DOUGH_KEY, { version: 9, active: null, profiles: [] });
    await expect(repo.load()).rejects.toThrow();
    expect(await store.get(DOUGH_KEY)).toMatchObject({ version: 9 });
    await expect(
      repo.save({
        version: 1,
        active: { ...createPlan(), hydration: NaN },
        profiles: [],
      }),
    ).rejects.toThrow();
  });
  it("surfaces write failures to the caller", async () => {
    const repo = createDoughRepository({
      get: async () => undefined,
      set: async () => {
        throw Error("Quota");
      },
      remove: async () => {},
    });
    await expect(
      repo.save({ version: 1, active: createPlan(), profiles: [] }),
    ).rejects.toThrow("Quota");
  });
});
