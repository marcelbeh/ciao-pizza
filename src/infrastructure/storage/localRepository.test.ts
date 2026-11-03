import { describe, it, expect } from "vitest";
import { createIndexedDbStore } from "./indexedDbStore";
import { LocalRepository, LOCAL_KEY } from "./localRepository";
import { DOUGH_KEY } from "./doughRepository";
import { createPlan } from "../../core/dough/model";
import { duplicateRecipe, builtInRecipes } from "../../core/planning/recipes";
import { newEvening, generateShopping } from "../../core/planning/calculations";
const setup = () => {
  const store = createIndexedDbStore("p3-" + crypto.randomUUID());
  return { store, repo: new LocalRepository(store) };
};
describe("local-first IndexedDB workspace", () => {
  it("migrates legacy dough without deleting or mutating its source", async () => {
    const { store, repo } = setup();
    const legacy = { version: 1, active: createPlan(), profiles: [] };
    await store.set(DOUGH_KEY, legacy);
    const w = await repo.load();
    expect(w.dough).toEqual(legacy);
    expect(w.legacyOriginal).toEqual(legacy);
    expect(await store.get(DOUGH_KEY)).toEqual(legacy);
    expect(await store.get(LOCAL_KEY)).toEqual(w);
  });
  it("persists all modules across fresh instances without a network", async () => {
    const { store, repo } = setup();
    await repo.load();
    const e = newEvening();
    await repo.change((w) => ({
      ...w,
      recipes: [duplicateRecipe(builtInRecipes[0])],
      evenings: [e],
      shopping: [generateShopping(e)],
      settings: { theme: "classico" },
      fermentations: [{ id: "future", phase: "bulk" }],
    }));
    const reloaded = await new LocalRepository(store).load();
    expect(reloaded).toEqual(repo.getSnapshot());
  });
  it("serializes concurrent independent edits across adapters atomically", async () => {
    const { store, repo } = setup();
    await repo.load();
    const other = new LocalRepository(store);
    await other.load();
    await Promise.all([
      repo.change((w) => {
        w.recipes.push(duplicateRecipe(builtInRecipes[0]));
        return w;
      }),
      other.change((w) => {
        w.evenings.push(newEvening());
        return w;
      }),
    ]);
    const loaded = await new LocalRepository(store).load();
    expect(loaded.recipes).toHaveLength(1);
    expect(loaded.evenings).toHaveLength(1);
  });
  it("rejects stale dough writes rather than overwriting another tab", async () => {
    const { store, repo } = setup();
    const other = new LocalRepository(store);
    await repo.doughRepository.load();
    await other.doughRepository.load();
    await repo.doughRepository.save({
      version: 1,
      active: createPlan(),
      profiles: [],
    });
    await expect(
      other.doughRepository.save({
        version: 1,
        active: createPlan(),
        profiles: [],
      }),
    ).rejects.toThrow("anderen Tab");
  });
  it("keeps stored data untouched after invalid updates or unsupported versions", async () => {
    const { store, repo } = setup();
    const original = await repo.load();
    await expect(
      repo.change((w) => ({ ...w, recipes: [builtInRecipes[0]] })),
    ).rejects.toThrow();
    expect(await store.get(LOCAL_KEY)).toEqual(original);
    await store.set(LOCAL_KEY, { version: 99 });
    await expect(new LocalRepository(store).load()).rejects.toThrow(
      "Datenversion",
    );
    expect(await store.get(LOCAL_KEY)).toEqual({ version: 99 });
  });
  it("imports full backups additively, preserves current plan and links imported shopping", async () => {
    const { repo } = setup();
    await repo.load();
    const active = createPlan();
    const e = newEvening();
    await repo.change((w) => ({
      ...w,
      dough: { ...w.dough, active },
      evenings: [e],
      shopping: [generateShopping(e)],
      settings: { name: "existing" },
    }));
    const backup = structuredClone(repo.getSnapshot()!);
    backup.settings.name = "incoming";
    await repo.importBackup(backup);
    const w = repo.getSnapshot()!;
    expect(w.dough.active).toEqual(active);
    expect(w.dough.profiles).toHaveLength(1);
    expect(w.evenings).toHaveLength(2);
    expect(w.shopping[1].eveningId).toBe(w.evenings[1].id);
    expect(w.settings.name).toBe("existing");
    expect(w.settings.importArchives).toEqual([backup]);
  });
});
