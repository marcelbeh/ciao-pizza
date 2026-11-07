import { describe, expect, it } from 'vitest';
import { addRecipe, assertEvening, assertPizzaNight, assertRecipe, emptyPizzaNight, pizzaCount, planningHint, recipeInput, type PizzaEvening, type ToppingRecipe } from './model';
import { withStandardRecipes } from './standardRecipes';
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

describe('Seven standard pizzas, catalog version 1', () => {
  it('contains exactly the requested content, stable unique IDs and no invented preparation', () => {
    const state = withStandardRecipes(emptyPizzaNight(), date);
    expect(state.standardRecipesVersion).toBe(1);
    expect(state.recipes.map(({ name, ingredients, preparation }) => ({ name, ingredients, preparation }))).toEqual([
      { name: 'Margherita', ingredients: ['San Marzano', 'Fior di Latte', 'Basilikum'], preparation: '' },
      { name: 'Salami', ingredients: ['San Marzano', 'Fior di Latte', 'Salami Milano'], preparation: '' },
      { name: 'Funghi', ingredients: ['San Marzano', 'Fior di Latte', 'Champignons'], preparation: '' },
      { name: 'Pesto', ingredients: ['San Marzano', 'selbst gemachtes Pesto', 'Tomaten', 'Pinienkerne', 'Burrata', 'Parmesan'], preparation: '' },
      { name: 'Bianca', ingredients: ['Fior di Latte', 'Ricotta', 'italienische Mortadella', 'Pistazien'], preparation: '' },
      { name: 'Tonno', ingredients: ['San Marzano', 'Fior di Latte', 'Thunfisch', 'Zwiebeln'], preparation: '' },
      { name: '’Nduja 🌶️', ingredients: ['San Marzano', 'Fior di Latte', '’Nduja', 'rote Zwiebeln'], preparation: '' },
    ]);
    expect(new Set(state.recipes.map(recipe => recipe.id)).size).toBe(7);
    expect(state.recipes.map(recipe => recipe.id)).toEqual(withStandardRecipes(emptyPizzaNight(), '2027-01-01T00:00:00.000Z').recipes.map(recipe => recipe.id));
    expect(() => assertPizzaNight(state)).not.toThrow();
  });
  it('preserves an existing standard ID, all its edits and original timestamps', () => {
    const original = { ...withStandardRecipes(emptyPizzaNight(), date).recipes[0], name: 'Meine Margherita', ingredients: ['Mein Käse'] };
    const state = { ...emptyPizzaNight(), recipes: [original] };
    const seeded = withStandardRecipes(state, '2027-01-01T00:00:00.000Z');
    expect(seeded.recipes).toHaveLength(7); expect(seeded.recipes[0]).toEqual(original);
    expect(state.recipes).toEqual([original]); expect(state).not.toHaveProperty('standardRecipesVersion');
    const afterDeletion = { ...seeded, recipes: [] };
    expect(withStandardRecipes(afterDeletion)).toBe(afterDeletion);
  });
  it('rejects unsupported markers and refuses partial addition when the library is full', () => {
    expect(() => assertPizzaNight({ ...emptyPizzaNight(), standardRecipesVersion: 2 })).toThrow();
    expect(() => assertPizzaNight({ ...emptyPizzaNight(), standardRecipesVersion: undefined })).toThrow();
    const state = { ...emptyPizzaNight(), recipes: Array.from({ length: 500 }, (_, i) => ({ ...recipe(), id: `own-${i}` })) };
    expect(() => withStandardRecipes(state)).toThrow('höchstens 500'); expect(state.recipes).toHaveLength(500);
    expect(state).not.toHaveProperty('standardRecipesVersion');
  });
});
