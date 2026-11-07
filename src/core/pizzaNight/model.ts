export interface RecipeSnapshot { name: string; ingredients: string[]; preparation: string }
export interface ToppingRecipe extends RecipeSnapshot { id: string; createdAt: string; updatedAt: string }
export interface PizzaItem { id: string; sourceRecipeId?: string; recipeSnapshot: RecipeSnapshot; quantity: number }
export interface PizzaEvening { id: string; name: string; notes: string; items: PizzaItem[]; createdAt: string; updatedAt: string }
export interface PizzaNightState { version: 1; recipes: ToppingRecipe[]; evening: PizzaEvening | null; standardRecipesVersion?: 1 }
export const pizzaLimits = { name: 100, ingredient: 300, ingredients: 100, preparation: 4000, notes: 2000, recipes: 500, items: 500, quantity: 10000 } as const;
export const emptyPizzaNight = (): PizzaNightState => ({ version: 1, recipes: [], evening: null });
function fail(): never { throw Error('Ungültige oder unbekannte Pizzaabend-/Rezeptdaten.'); }
function object(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const row = value as Record<string, unknown>;
  if (required.some(key => !Object.hasOwn(row, key)) || Object.keys(row).some(key => ![...required, ...optional].includes(key))) return fail();
  return row;
}
function text(value: unknown, max: number, required = false) {
  if (typeof value !== 'string' || value !== value.trim() || value.length > max || (required && !value)) fail();
}
function id(value: unknown) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) fail(); }
function dates(row: Record<string, unknown>) {
  for (const key of ['createdAt', 'updatedAt']) {
    const v = row[key];
    if (typeof v !== 'string' || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v) fail();
  }
  if (String(row.updatedAt) < String(row.createdAt)) fail();
}
function snapshot(row: Record<string, unknown>) {
  text(row.name, pizzaLimits.name, true); text(row.preparation, pizzaLimits.preparation);
  if (!Array.isArray(row.ingredients) || !row.ingredients.length || row.ingredients.length > pizzaLimits.ingredients) fail();
  for (const ingredient of row.ingredients) text(ingredient, pizzaLimits.ingredient, true);
}
export function assertRecipe(value: unknown): asserts value is ToppingRecipe {
  const row = object(value, ['id', 'name', 'ingredients', 'preparation', 'createdAt', 'updatedAt']);
  id(row.id); snapshot(row); dates(row);
}
export function assertEvening(value: unknown): asserts value is PizzaEvening {
  const row = object(value, ['id', 'name', 'notes', 'items', 'createdAt', 'updatedAt']);
  id(row.id); text(row.name, pizzaLimits.name, true); text(row.notes, pizzaLimits.notes); dates(row);
  if (!Array.isArray(row.items) || row.items.length > pizzaLimits.items) fail();
  const ids = new Set<string>(); const sources = new Set<string>();
  for (const value of row.items) {
    const item = object(value, ['id', 'recipeSnapshot', 'quantity'], ['sourceRecipeId']);
    id(item.id);
    if (ids.has(String(item.id))) fail(); ids.add(String(item.id));
    if (Object.hasOwn(item, 'sourceRecipeId')) {
      id(item.sourceRecipeId);
      if (sources.has(String(item.sourceRecipeId))) fail(); sources.add(String(item.sourceRecipeId));
    }
    if (!Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > pizzaLimits.quantity) fail();
    snapshot(object(item.recipeSnapshot, ['name', 'ingredients', 'preparation']));
  }
}
export function assertPizzaNight(value: unknown): asserts value is PizzaNightState {
  const row = object(value, ['version', 'recipes', 'evening'], ['standardRecipesVersion']);
  if (Object.hasOwn(row, 'standardRecipesVersion') && row.standardRecipesVersion !== 1) fail();
  if (row.version !== 1 || !Array.isArray(row.recipes) || row.recipes.length > pizzaLimits.recipes) fail();
  const ids = new Set<string>();
  for (const recipe of row.recipes) { assertRecipe(recipe); if (ids.has(recipe.id)) fail(); ids.add(recipe.id); }
  if (row.evening !== null) assertEvening(row.evening);
  // Deleted library entries intentionally leave their valid source IDs in independent snapshots.
}
export function recipeInput(name: string, ingredients: string, preparation: string): RecipeSnapshot {
  const result = { name: name.trim(), ingredients: ingredients.split(/\r?\n/).map(line => line.trim()).filter(Boolean), preparation: preparation.trim() };
  snapshot(result); return result;
}
export function addRecipe(items: PizzaItem[], recipe: ToppingRecipe, newId: () => string = () => crypto.randomUUID()): PizzaItem[] {
  assertRecipe(recipe);
  const existing = items.find(item => item.sourceRecipeId === recipe.id);
  if (existing) {
    if (existing.quantity >= pizzaLimits.quantity) throw Error('Maximale Stückzahl erreicht.');
    return items.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
  }
  if (items.length >= pizzaLimits.items) throw Error('Maximale Anzahl Positionen erreicht.');
  return [...items, { id: newId(), sourceRecipeId: recipe.id, quantity: 1,
    recipeSnapshot: { name: recipe.name, ingredients: [...recipe.ingredients], preparation: recipe.preparation } }];
}
export const pizzaCount = (evening: PizzaEvening | null) => evening?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
export function planningHint(count: number, doughCount: number) {
  const diff = count - doughCount;
  return diff === 0 ? 'Alle Teiglinge sind verplant.' : diff < 0 ? `${-diff} ${diff === -1 ? "Teigling noch nicht verplant" : "Teiglinge noch nicht verplant"}.` : `${diff} ${diff === 1 ? "Pizza" : "Pizzen"} mehr geplant als Teiglinge vorhanden.`;
}
