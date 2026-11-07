import { describe, expect, it } from "vitest";
import { calculateSchedule, createSchedule, createTeichnerSchedule } from "../../core/schedule/plan";
import { defaults } from "../../core/dough/forno";
import { createIndexedDbStore } from "./indexedDbStore";
import { createFornoRepository, FORNO_KEY, LEGACY_KEYS } from "./fornoRepository";
import { SCHEDULE_KEY } from "./scheduleRepository";

const store = () => createIndexedDbStore(`schedule-test-${crypto.randomUUID()}`);
describe("P2 isolated local storage", () => {
  it("starts without writing a plan and restores an explicitly saved one after reload", async () => {
    const db = store(); const repo = createFornoRepository(db);
    expect((await repo.load()).schedule).toBeNull();
    expect(await db.get(SCHEDULE_KEY)).toBeUndefined();
    const plan = { ...createSchedule(), bulkHours: 3.5 };
    await repo.saveSchedule(plan);
    expect((await createFornoRepository(db).load()).schedule).toEqual(plan);
  });
  it("keeps formula, personal recipes, legacy keys and caches intact", async () => {
    const db = store(); const repo = createFornoRepository(db);
    const original = { version: 2, recipes: [{ name: "Mein Belag" }], unknown: "preserve" };
    await db.set(LEGACY_KEYS[0], original);
    await db.set("cloud-cache:old", { private: "local archive" });
    await repo.save(defaults);
    const before = await db.entries!(); const plan = createSchedule();
    await repo.saveSchedule(plan);
    const after = await db.entries!();
    expect(after).toEqual({ ...before, [SCHEDULE_KEY]: plan });
    expect((await repo.backup()).entries).toEqual(after);
    await repo.save({ ...defaults, count: 12 });
    expect(await db.get(SCHEDULE_KEY)).toEqual(plan);
    expect(await db.get(LEGACY_KEYS[0])).toEqual(original);
  });
  it("preserves unknown time-plan versions while keeping the calculator usable", async () => {
    const db = store(); const repo = createFornoRepository(db);
    const raw = { version: 99, future: "keep me" };
    await db.set(SCHEDULE_KEY, raw);
    const loaded = await repo.load();
    expect(loaded.formula).toEqual(defaults);
    expect(loaded.schedule).toBeNull();
    expect(loaded.scheduleError).toContain("nicht überschrieben");
    await expect(repo.saveSchedule(createSchedule())).rejects.toThrow();
    await repo.save({ ...defaults, hydration: 68 });
    expect(await db.get(SCHEDULE_KEY)).toEqual(raw);
    expect((await repo.backup()).entries[SCHEDULE_KEY]).toEqual(raw);
  });
  it("refuses invalid edits without replacing the last valid schedule", async () => {
    const db = store(); const repo = createFornoRepository(db); const valid = createSchedule();
    await repo.saveSchedule(valid);
    await expect(repo.saveSchedule({ ...valid, bulkHours: NaN })).rejects.toThrow();
    expect(await db.get(SCHEDULE_KEY)).toEqual(valid);
  });
  it("includes schedules in backup even for older stores without full-snapshot support", async () => {
    const db = store();
    const repo = createFornoRepository({ get: db.get, set: db.set, remove: db.remove });
    const plan = createSchedule(); await repo.saveSchedule(plan);
    await repo.save(defaults);
    expect((await repo.backup()).entries).toMatchObject({ [FORNO_KEY]: { formula: defaults }, [SCHEDULE_KEY]: plan });
  });
});

it("retains legacy meaning and all personal data until explicitly saving the staged template", async () => {
  const db = store(); const repo = createFornoRepository(db);
  const legacy = { ...createSchedule(), bulkHours: 3, coldHours: 36, ballHours: 6, retained: { untouched: true } };
  await db.set(SCHEDULE_KEY, legacy); await repo.save(defaults);
  await db.set("forno:pizza-night:v1", { version: 1, recipes: [], evening: null });
  await db.set(LEGACY_KEYS[0], { recipes: ["personal"], future: true });
  await db.set("unknown:cache", { opaque: true });
  const before = await db.entries!(); const expectedSteps = calculateSchedule(legacy);
  expect((await repo.load()).schedule).toEqual(legacy);
  expect(calculateSchedule((await repo.load()).schedule!)).toEqual(expectedSteps);
  const template = createTeichnerSchedule(legacy.bakeAt, legacy);
  calculateSchedule(template); expect(await db.entries!()).toEqual(before);
  await repo.saveSchedule(template);
  expect(await db.entries!()).toEqual({ ...before, [SCHEDULE_KEY]: template });
  expect((await createFornoRepository(db).load()).schedule).toEqual(template);
  expect((await repo.backup()).entries).toEqual(await db.entries!());
  await expect(repo.saveSchedule({ ...template, coldBallHours: 0 })).rejects.toThrow();
  expect(await db.get(SCHEDULE_KEY)).toEqual(template);
});
