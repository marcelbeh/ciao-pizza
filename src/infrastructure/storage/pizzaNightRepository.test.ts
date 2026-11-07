import { describe, expect, it, vi } from 'vitest';
import { createIndexedDbStore } from './indexedDbStore';
import { createFornoRepository, FORNO_KEY, LEGACY_KEYS } from './fornoRepository';
import { createPizzaNightRepository, PIZZA_NIGHT_KEY } from './pizzaNightRepository';
import { createSchedule } from '../../core/schedule/plan';
import { SCHEDULE_KEY } from './scheduleRepository';
import { defaults } from '../../core/dough/forno';
import { emptyPizzaNight, addRecipe, type ToppingRecipe, type PizzaEvening } from '../../core/pizzaNight/model';
import { withStandardRecipes } from '../../core/pizzaNight/standardRecipes';
const date = '2026-11-07T12:00:00.000Z';
const recipe = (id = 'recipe-1'): ToppingRecipe => ({ id, name: 'Bianca', ingredients: ['Ricotta'], preparation: 'Belegen', createdAt: date, updatedAt: date });
const evening = (): PizzaEvening => ({ id: 'evening-1', name: 'Samstag', notes: 'Privat', items: addRecipe([], recipe(), () => 'item-1'), createdAt: date, updatedAt: date });
const store = async () => {
  const db = createIndexedDbStore(`p3-test-${crypto.randomUUID()}`);
  await db.set(PIZZA_NIGHT_KEY, emptyPizzaNight()); return db;
};
describe('P3 atomic, isolated persistence and backup', () => {
  it('leaves an existing empty collection untouched and restores recipes/evening after recreation', async () => {
    const db = await store(); const update = vi.spyOn(db, 'update'); const repo = createPizzaNightRepository(db);
    expect((await repo.load()).pizzaNight).toEqual({ version: 1, recipes: [], evening: null }); expect(update).not.toHaveBeenCalled();
    expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(emptyPizzaNight());
    await repo.saveRecipe(recipe(), null); await repo.saveEvening(evening(), null);
    expect((await createPizzaNightRepository(db).load()).pizzaNight).toEqual({ version: 1, recipes: [recipe()], evening: evening() });
  });
  it('retains snapshots through library edits/deletion and changes only the P3 key', async () => {
    const db = await store(); const app = createFornoRepository(db); const repo = app.pizzaNight;
    await db.set(FORNO_KEY, { version: 1, formula: defaults }); await db.set(SCHEDULE_KEY, createSchedule());
    await db.set(LEGACY_KEYS[0], { version: 99, recipes: [{ personal: true }], evenings: ['archive'] });
    await db.set(LEGACY_KEYS[1], { unknown: ['unchanged'] }); await db.set('unknown-cache:secret', { preserve: 'exactly' });
    const before = await db.entries!();
    await repo.saveRecipe(recipe(), null); await repo.saveEvening(evening(), null);
    const edited = { ...recipe(), name: 'Neu', ingredients: ['Andere Zutat'], updatedAt: '2026-11-07T13:00:00.000Z' };
    await repo.saveRecipe(edited, recipe()); await repo.deleteRecipe(edited);
    expect((await repo.load()).pizzaNight?.evening).toEqual(evening());
    expect(await db.entries!()).toEqual({ ...before, [PIZZA_NIGHT_KEY]: { version: 1, recipes: [], evening: evening() } });
    expect((await app.backup()).entries).toEqual(await db.entries!());
    await repo.deleteEvening(evening()); expect((await repo.load()).pizzaNight?.evening).toBeNull();
  });
  it('serializes simultaneous operations on the shared dataset without losing either change', async () => {
    const db = await store(); const repo = createPizzaNightRepository(db);
    await Promise.all([repo.saveRecipe(recipe(), null), repo.saveRecipe(recipe('recipe-2'), null), repo.saveEvening(evening(), null)]);
    expect((await repo.load()).pizzaNight?.recipes).toHaveLength(2);
    expect((await repo.load()).pizzaNight?.evening).toEqual(evening());
  });
  it.each([{ version: 99, future: { keep: true } }, { version: 1, recipes: [], evening: { name: 'broken' } }, { version: 1, recipes: [], evening: null, standardRecipesVersion: 2 }, null])('protects unknown/corrupt P3 data on every mutation and exports original %j', async raw => {
    const db = await store(); const app = createFornoRepository(db); await db.set(PIZZA_NIGHT_KEY, raw);
    const loaded = await app.load(); expect(loaded.pizzaNight).toBeNull(); expect(loaded.pizzaNightError).toContain('nicht überschrieben'); expect(loaded.formula).toEqual(defaults);
    const repo = app.pizzaNight;
    await expect(repo.saveRecipe(recipe(), null)).rejects.toThrow(); await expect(repo.deleteRecipe(recipe())).rejects.toThrow();
    await expect(repo.saveEvening(evening(), null)).rejects.toThrow(); await expect(repo.deleteEvening(evening())).rejects.toThrow();
    expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(raw); expect((await app.backup()).entries[PIZZA_NIGHT_KEY]).toEqual(raw);
    await app.save({ ...defaults, count: 9 }); expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(raw);
  });
  it('keeps the last valid state on invalid writes, transaction failures and stale editors', async () => {
    const db = await store(); const repo = createPizzaNightRepository(db); await repo.saveRecipe(recipe(), null);
    await expect(repo.saveEvening({ ...evening(), items: [{ ...evening().items[0], quantity: 0 }] }, null)).rejects.toThrow();
    const edited = { ...recipe(), name: 'Neu' }; await repo.saveRecipe(edited, recipe());
    await expect(repo.saveRecipe({ ...recipe(), name: 'Stale' }, recipe())).rejects.toThrow('inzwischen');
    await expect(repo.deleteRecipe(recipe())).rejects.toThrow('inzwischen');
    await repo.saveEvening(evening(), null); await expect(repo.saveEvening({ ...evening(), name: 'Stale' }, null)).rejects.toThrow('inzwischen');
    const previous = await db.get(PIZZA_NIGHT_KEY); vi.spyOn(db, 'update').mockRejectedValueOnce(Error('QuotaExceededError'));
    await expect(repo.deleteEvening(evening())).rejects.toThrow('Quota'); expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(previous);
  });
  it('includes P3 and legacy data in fallback export without entries, and refuses non-atomic writes', async () => {
    const db = await store(); await db.set(PIZZA_NIGHT_KEY, { version: 999, opaque: ['original'] }); await db.set(LEGACY_KEYS[0], { personal: true });
    const fallback = { get: db.get, set: db.set, remove: db.remove };
    const app = createFornoRepository(fallback);
    expect((await app.backup()).entries).toMatchObject({ [PIZZA_NIGHT_KEY]: { version: 999, opaque: ['original'] }, [LEGACY_KEYS[0]]: { personal: true } });
    await expect(app.pizzaNight.saveRecipe(recipe(), null)).rejects.toThrow('Atomarer');
  });
});

describe('Atomic, one-time standard pizza initialization', () => {
  const fresh = () => createIndexedDbStore(`standard-pizzas-${crypto.randomUUID()}`);
  it('initializes a missing P3 key once, even with simultaneous loads, and no other key changes', async () => {
    const db = fresh(); const repo = createPizzaNightRepository(db);
    await db.set(FORNO_KEY, { version: 1, formula: defaults }); await db.set(SCHEDULE_KEY, createSchedule());
    await db.set(LEGACY_KEYS[0], { personal: ['old recipes', 'old evenings'] }); await db.set('unknown:archive', { opaque: true });
    const before = await db.entries!();
    const loads = await Promise.all([repo.load(), createPizzaNightRepository(db).load()]);
    for (const { pizzaNight } of loads) { expect(pizzaNight?.recipes).toHaveLength(7); expect(pizzaNight?.standardRecipesVersion).toBe(1); }
    const saved = await db.get(PIZZA_NIGHT_KEY); expect(await db.entries!()).toEqual({ ...before, [PIZZA_NIGHT_KEY]: saved });
    const update = vi.spyOn(db, 'update'); await repo.load(); expect(update).not.toHaveBeenCalled();
    expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(saved);
  });
  it('does not initialize an existing unmarked collection, including an empty one', async () => {
    const db = fresh(); const repo = createPizzaNightRepository(db); const original = { version: 1, recipes: [recipe()], evening: evening() };
    await db.set(PIZZA_NIGHT_KEY, original); const update = vi.spyOn(db, 'update');
    expect((await repo.load()).pizzaNight).toEqual(original); expect(update).not.toHaveBeenCalled();
    await db.set(PIZZA_NIGHT_KEY, emptyPizzaNight()); expect((await repo.load()).pizzaNight).toEqual(emptyPizzaNight());
    expect(update).not.toHaveBeenCalled();
  });
  it('adds explicitly to existing data atomically, avoiding duplicate IDs and preserving user changes/deletions forever', async () => {
    const db = fresh(); const repo = createPizzaNightRepository(db);
    const standard = withStandardRecipes(emptyPizzaNight(), date).recipes[0];
    const edited = { ...standard, name: 'Meine Margherita', ingredients: ['Eigener Belag'] };
    const original = { version: 1, recipes: [edited, recipe()], evening: evening() };
    await db.set(PIZZA_NIGHT_KEY, original); await db.set('archive:unknown', { preserve: true });
    const first = await repo.addStandardRecipes(); expect(first.recipes).toHaveLength(8);
    expect(first.recipes.find(row => row.id === edited.id)).toEqual(edited); expect(first.evening).toEqual(original.evening);
    await repo.deleteRecipe(edited);
    const second = first.recipes.find(row => row.name === 'Salami')!;
    const changed = { ...second, ingredients: ['Eigene Salami'] }; await repo.saveRecipe(changed, second);
    const beforeReload = await db.entries!();
    for (let i = 0; i < 2; i++) {
      const loaded = (await createPizzaNightRepository(db).load()).pizzaNight!;
      expect(loaded.recipes.some(row => row.id === edited.id)).toBe(false);
      expect(loaded.recipes.find(row => row.id === second.id)).toEqual(changed);
    }
    expect(await repo.addStandardRecipes()).toEqual((await repo.load()).pizzaNight);
    expect(await db.entries!()).toEqual(beforeReload);
    expect((await createFornoRepository(db).backup()).entries).toEqual(beforeReload);
  });
  it('does not add a marker or partial recipes on write failures and retries safely', async () => {
    const db = fresh(); const repo = createPizzaNightRepository(db);
    vi.spyOn(db, 'update').mockRejectedValueOnce(Error('QuotaExceededError'));
    expect((await repo.load()).pizzaNightError).toContain('nicht initialisiert'); expect(await db.get(PIZZA_NIGHT_KEY)).toBeUndefined();
    expect((await repo.load()).pizzaNight?.recipes).toHaveLength(7);
    const existing = { ...emptyPizzaNight(), recipes: [recipe()] }; await db.set(PIZZA_NIGHT_KEY, existing);
    vi.spyOn(db, 'update').mockRejectedValueOnce(Error('QuotaExceededError'));
    await expect(repo.addStandardRecipes()).rejects.toThrow('Quota'); expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(existing);
    expect((await repo.addStandardRecipes()).standardRecipesVersion).toBe(1);
  });
  it('refuses unknown/corrupt data and markers during explicit addition', async () => {
    const db = fresh(); const repo = createPizzaNightRepository(db);
    for (const raw of [{ version: 88, personal: true }, { ...emptyPizzaNight(), standardRecipesVersion: 2 }, null]) {
      await db.set(PIZZA_NIGHT_KEY, raw); await expect(repo.addStandardRecipes()).rejects.toThrow();
      expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(raw);
    }
  });
  it('does not add defaults if a collection appeared between the missing-key read and atomic initialization', async () => {
    const db = fresh(); const original = { ...emptyPizzaNight(), recipes: [recipe()] }; const get = db.get;
    vi.spyOn(db, 'get').mockImplementationOnce(async key => { await db.set(key, original); return undefined; });
    const repo = createPizzaNightRepository(db);
    expect((await repo.load()).pizzaNight).toEqual(original); expect(await get(PIZZA_NIGHT_KEY)).toEqual(original);
  });
});
