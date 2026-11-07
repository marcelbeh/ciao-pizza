import { describe, expect, it, vi } from 'vitest';
import { createIndexedDbStore } from './indexedDbStore';
import { createFornoRepository, FORNO_KEY, LEGACY_KEYS } from './fornoRepository';
import { createPizzaNightRepository, PIZZA_NIGHT_KEY } from './pizzaNightRepository';
import { createSchedule } from '../../core/schedule/plan';
import { SCHEDULE_KEY } from './scheduleRepository';
import { defaults } from '../../core/dough/forno';
import { addRecipe, type ToppingRecipe, type PizzaEvening } from '../../core/pizzaNight/model';
const date = '2026-11-07T12:00:00.000Z';
const recipe = (id = 'recipe-1'): ToppingRecipe => ({ id, name: 'Bianca', ingredients: ['Ricotta'], preparation: 'Belegen', createdAt: date, updatedAt: date });
const evening = (): PizzaEvening => ({ id: 'evening-1', name: 'Samstag', notes: 'Privat', items: addRecipe([], recipe(), () => 'item-1'), createdAt: date, updatedAt: date });
const store = () => createIndexedDbStore(`p3-test-${crypto.randomUUID()}`);
describe('P3 atomic, isolated persistence and backup', () => {
  it('loads a missing key without writes and restores recipes/evening after recreation', async () => {
    const db = store(); const update = vi.spyOn(db, 'update'); const repo = createPizzaNightRepository(db);
    expect((await repo.load()).pizzaNight).toEqual({ version: 1, recipes: [], evening: null }); expect(update).not.toHaveBeenCalled();
    expect(await db.get(PIZZA_NIGHT_KEY)).toBeUndefined();
    await repo.saveRecipe(recipe(), null); await repo.saveEvening(evening(), null);
    expect((await createPizzaNightRepository(db).load()).pizzaNight).toEqual({ version: 1, recipes: [recipe()], evening: evening() });
  });
  it('retains snapshots through library edits/deletion and changes only the P3 key', async () => {
    const db = store(); const app = createFornoRepository(db); const repo = app.pizzaNight;
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
    const db = store(); const repo = createPizzaNightRepository(db);
    await Promise.all([repo.saveRecipe(recipe(), null), repo.saveRecipe(recipe('recipe-2'), null), repo.saveEvening(evening(), null)]);
    expect((await repo.load()).pizzaNight?.recipes).toHaveLength(2);
    expect((await repo.load()).pizzaNight?.evening).toEqual(evening());
  });
  it.each([{ version: 99, future: { keep: true } }, { version: 1, recipes: [], evening: { name: 'broken' } }, null])('protects unknown/corrupt P3 data on every mutation and exports original %j', async raw => {
    const db = store(); const app = createFornoRepository(db); await db.set(PIZZA_NIGHT_KEY, raw);
    const loaded = await app.load(); expect(loaded.pizzaNight).toBeNull(); expect(loaded.pizzaNightError).toContain('nicht überschrieben'); expect(loaded.formula).toEqual(defaults);
    const repo = app.pizzaNight;
    await expect(repo.saveRecipe(recipe(), null)).rejects.toThrow(); await expect(repo.deleteRecipe(recipe())).rejects.toThrow();
    await expect(repo.saveEvening(evening(), null)).rejects.toThrow(); await expect(repo.deleteEvening(evening())).rejects.toThrow();
    expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(raw); expect((await app.backup()).entries[PIZZA_NIGHT_KEY]).toEqual(raw);
    await app.save({ ...defaults, count: 9 }); expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(raw);
  });
  it('keeps the last valid state on invalid writes, transaction failures and stale editors', async () => {
    const db = store(); const repo = createPizzaNightRepository(db); await repo.saveRecipe(recipe(), null);
    await expect(repo.saveEvening({ ...evening(), items: [{ ...evening().items[0], quantity: 0 }] }, null)).rejects.toThrow();
    const edited = { ...recipe(), name: 'Neu' }; await repo.saveRecipe(edited, recipe());
    await expect(repo.saveRecipe({ ...recipe(), name: 'Stale' }, recipe())).rejects.toThrow('inzwischen');
    await expect(repo.deleteRecipe(recipe())).rejects.toThrow('inzwischen');
    await repo.saveEvening(evening(), null); await expect(repo.saveEvening({ ...evening(), name: 'Stale' }, null)).rejects.toThrow('inzwischen');
    const previous = await db.get(PIZZA_NIGHT_KEY); vi.spyOn(db, 'update').mockRejectedValueOnce(Error('QuotaExceededError'));
    await expect(repo.deleteEvening(evening())).rejects.toThrow('Quota'); expect(await db.get(PIZZA_NIGHT_KEY)).toEqual(previous);
  });
  it('includes P3 and legacy data in fallback export without entries, and refuses non-atomic writes', async () => {
    const db = store(); await db.set(PIZZA_NIGHT_KEY, { version: 999, opaque: ['original'] }); await db.set(LEGACY_KEYS[0], { personal: true });
    const fallback = { get: db.get, set: db.set, remove: db.remove };
    const app = createFornoRepository(fallback);
    expect((await app.backup()).entries).toMatchObject({ [PIZZA_NIGHT_KEY]: { version: 999, opaque: ['original'] }, [LEGACY_KEYS[0]]: { personal: true } });
    await expect(app.pizzaNight.saveRecipe(recipe(), null)).rejects.toThrow('Atomarer');
  });
});
