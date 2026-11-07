import { describe, expect, it } from 'vitest';
import { addRecipe, assertEvening, assertPizzaNight, assertRecipe, emptyPizzaNight, pizzaCount, planningHint, recipeInput, type PizzaEvening, type ToppingRecipe } from './model';
const date = '2026-11-07T12:00:00.000Z';
const recipe = (): ToppingRecipe => ({ id: 'recipe-1', name: 'Margherita', ingredients: ['Tomate', 'Mozzarella'], preparation: '', createdAt: date, updatedAt: date });
const evening = (): PizzaEvening => ({ id: 'evening-1', name: 'Samstag', notes: '', items: addRecipe([], recipe(), () => 'item-1'), createdAt: date, updatedAt: date });
describe('P3 model and independent snapshots', () => {
  it('trims text and removes blank ingredient lines, retaining order and duplicates', () => {
    expect(recipeInput('  Bianca ', '\n Ricotta \r\n\n Basilikum \nRicotta', '  Ofen vorheizen\n  Belegen  ')).toEqual({ name: 'Bianca', ingredients: ['Ricotta', 'Basilikum', 'Ricotta'], preparation: 'Ofen vorheizen\n  Belegen' });
    expect(() => recipeInput(' ', 'Tomate', '')).toThrow();
    expect(() => recipeInput('Pizza', '\n \n', '')).toThrow();
    expect(() => recipeInput('Pizza', 'x'.repeat(301), '')).toThrow();
    expect(() => recipeInput('Pizza', 'Tomate', 'x'.repeat(4001))).toThrow();
  });
  it('creates an independent snapshot and increments an existing source without refreshing its content', () => {
    const source = recipe(); const items = addRecipe([], source, () => 'stable-item');
    source.ingredients.push('Neuer Belag'); source.name = 'Andere Pizza';
    const next = addRecipe(items, source);
    expect(next).toEqual([{ ...items[0], quantity: 2 }]);
    expect(next[0].id).toBe('stable-item'); expect(next[0].recipeSnapshot.name).toBe('Margherita');
    expect(next[0].recipeSnapshot.ingredients).toEqual(['Tomate', 'Mozzarella']);
    expect(items[0].quantity).toBe(1);
  });
  it('allows an empty evening and dangling source IDs after a recipe deletion', () => {
    expect(() => assertEvening({ ...evening(), items: [] })).not.toThrow();
    expect(() => assertPizzaNight({ ...emptyPizzaNight(), evening: evening() })).not.toThrow();
    expect(pizzaCount({ ...evening(), items: [] })).toBe(0);
    expect(planningHint(6, 8)).toContain('2 Teiglinge'); expect(planningHint(10, 8)).toContain('2 Pizzen mehr');
    expect(planningHint(8, 8)).toContain('Alle Teiglinge');
  });
  it.each([NaN, Infinity, 0, -1, .5, '2', 10001])('rejects invalid quantities %s', quantity => {
    const value = evening(); (value.items[0] as unknown as Record<string, unknown>).quantity = quantity;
    expect(() => assertEvening(value)).toThrow();
  });
  it.each([{ id: '' }, { name: '' }, { ingredients: [] }, { ingredients: [' '] }, { preparation: null }, { createdAt: '2026-11-07' }, { updatedAt: '2025-01-01T00:00:00.000Z' }, { id: 'a b' }, { unknownField: 'preserve instead of normalizing' }])('rejects malformed or unknown recipe data %j', patch => {
    expect(() => assertRecipe({ ...recipe(), ...patch })).toThrow();
  });
  it('rejects duplicate IDs, duplicate source references, malformed snapshots and unknown versions', () => {
    expect(() => assertPizzaNight({ version: 2, recipes: [], evening: null })).toThrow();
    expect(() => assertPizzaNight({ ...emptyPizzaNight(), recipes: [recipe(), recipe()] })).toThrow();
    const e = evening();
    expect(() => assertEvening({ ...e, items: [e.items[0], e.items[0]] })).toThrow();
    expect(() => assertEvening({ ...e, items: [e.items[0], { ...e.items[0], id: 'different-id' }] })).toThrow();
    expect(() => assertEvening({ ...e, items: [{ ...e.items[0], sourceRecipeId: undefined }] })).toThrow();
    expect(() => assertEvening({ ...e, items: [{ ...e.items[0], recipeSnapshot: { name: 'Pizza' } }] })).toThrow();
  });
});
