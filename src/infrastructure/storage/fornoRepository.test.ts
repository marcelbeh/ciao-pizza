import { describe, expect, it } from "vitest";
import { createFornoRepository, FORNO_KEY, LEGACY_KEYS, latestEvening } from "./fornoRepository";
import { createIndexedDbStore } from "./indexedDbStore";
import { defaults } from "../../core/dough/forno";
import { createPlan } from "../../core/dough/model";

const store = () => createIndexedDbStore(`forno-test-${crypto.randomUUID()}`);
const compatible = () => ({ ...createPlan(), count: 6, hydration: 68, yeastKind: "instant", yeastMode: "manual", yeastPercent: .12 });
describe("FORNO. additive migration and persistence", () => {
  it("starts fresh with the requested defaults and writes only on user edit", async () => {
    const db = store(); const repo = createFornoRepository(db);
    expect((await repo.load()).formula).toEqual(defaults);
    expect(await db.get(FORNO_KEY)).toBeUndefined();
    const formula = { ...defaults, count: 12, hydration: 70, yeastPercent: .035 };
    await repo.save(formula);
    expect((await createFornoRepository(db).load()).formula).toEqual(formula);
  });
  it("copies a compatible V2 plan and preserves personal recipes, photos, profiles and unknown fields exactly", async () => {
    const db = store();
    const original = { version: 2, dough: { active: compatible(), profiles: [{ id: "old", name: "Mein Teig" }] },
      recipes: [{ id: "personal", name: "Marcels Belag", ingredients: [{ name: "Käse", amount: 90 }] }],
      evenings: [], baking: { photos: ["data:image/png;base64,original"] }, future: { keep: true } };
    await db.set(LEGACY_KEYS[0], original);
    const oldCache = { document: { recipes: [{ id: "another-recipe" }] }, dirty: true };
    await db.set("cloud-cache:legacy-user", oldCache);
    const repo = createFornoRepository(db); const loaded = await repo.load();
    expect(loaded.copied).toBe(true);
    expect(loaded.formula).toMatchObject({ count: 6, hydration: 68, yeastPercent: .12 });
    await repo.save({ ...loaded.formula, count: 9 });
    expect(await db.get(LEGACY_KEYS[0])).toEqual(original);
    expect((await repo.backup()).entries[LEGACY_KEYS[0]]).toEqual(original);
    expect((await repo.backup()).entries["cloud-cache:legacy-user"]).toEqual(oldCache);
  });
  it("reads old P1-only storage and converts fresh yeast using the existing 3:1 convention", async () => {
    const db = store(); const old = { version: 1, active: { ...compatible(), yeastKind: "fresh", yeastPercent: .3 }, profiles: [] };
    await db.set(LEGACY_KEYS[1], old);
    const loaded = await createFornoRepository(db).load();
    expect(loaded.formula.yeastPercent).toBeCloseTo(.1);
    expect(await db.get(LEGACY_KEYS[1])).toEqual(old);
  });
  it.each([{ oil: 2 }, { sugar: 1 }, { massMode: "flour" }, { yeastMode: "guideline" }])("keeps incompatible old plans untouched: %j", async patch => {
    const db = store(); const old = { version: 1, active: { ...compatible(), ...patch }, profiles: [] };
    await db.set(LEGACY_KEYS[1], old);
    const loaded = await createFornoRepository(db).load();
    expect(loaded.formula).toEqual(defaults);
    expect(loaded.hasLegacy).toBe(true);
    expect(await db.get(LEGACY_KEYS[1])).toEqual(old);
  });
  it("never replaces invalid or unknown FORNO. data with defaults", async () => {
    const db = store(); const saved = { version: 99, formula: defaults };
    await db.set(FORNO_KEY, saved);
    const repo = createFornoRepository(db);
    await expect(repo.load()).rejects.toThrow("nicht überschrieben");
    expect((await repo.backup()).entries[FORNO_KEY]).toEqual(saved);
    await expect(repo.save({ ...defaults, count: NaN })).rejects.toThrow();
    expect(await db.get(FORNO_KEY)).toEqual(saved);
  });
  it("prefers saved FORNO. settings over the preserved old active plan", async () => {
    const db = store(); await db.set(LEGACY_KEYS[1], { active: compatible() });
    const repo = createFornoRepository(db); await repo.save(defaults);
    expect((await repo.load()).formula).toEqual(defaults);
  });
  it("projects the latest valid evening, ignoring malformed records and sorting by save date", () => {
    const dough = createPlan();
    const evening = { name: "Freitag", bakeAt: dough.bakeAt, timeZone: "Europe/Berlin", dough,
      updatedAt: "2026-11-03T10:00:00Z" };
    expect(latestEvening({ version: 2, evenings: [evening, { ...evening, name: "Samstag", updatedAt: "2026-11-04T10:00:00Z" },
      { ...evening, name: "Ungültig", timeZone: "invalid", updatedAt: "2026-11-05T10:00:00Z" }, null] }))
      .toMatchObject({ name: "Samstag", count: dough.count, ballGrams: dough.ballGrams });
    expect(latestEvening({ version: 2, evenings: [] })).toBeNull();
  });
});
