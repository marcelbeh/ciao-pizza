import { pizzaLimits, type PizzaNightState, type ToppingRecipe } from './model';
export const STANDARD_RECIPES_VERSION = 1 as const;
export const standardRecipes = [
  { id: 'forno-standard-v1-margherita', name: 'Margherita', ingredients: ['San Marzano', 'Fior di Latte', 'Basilikum'] },
  { id: 'forno-standard-v1-salami', name: 'Salami', ingredients: ['San Marzano', 'Fior di Latte', 'Salami Milano'] },
  { id: 'forno-standard-v1-funghi', name: 'Funghi', ingredients: ['San Marzano', 'Fior di Latte', 'Champignons'] },
  { id: 'forno-standard-v1-pesto', name: 'Pesto', ingredients: ['San Marzano', 'selbst gemachtes Pesto', 'Tomaten', 'Pinienkerne', 'Burrata', 'Parmesan'] },
  { id: 'forno-standard-v1-bianca', name: 'Bianca', ingredients: ['Fior di Latte', 'Ricotta', 'italienische Mortadella', 'Pistazien'] },
  { id: 'forno-standard-v1-tonno', name: 'Tonno', ingredients: ['San Marzano', 'Fior di Latte', 'Thunfisch', 'Zwiebeln'] },
  { id: 'forno-standard-v1-nduja', name: '’Nduja 🌶️', ingredients: ['San Marzano', 'Fior di Latte', '’Nduja', 'rote Zwiebeln'] },
] as const;
/** One-time only: stable IDs preserve edited entries; the durable marker preserves deletions. */
export function withStandardRecipes(state: PizzaNightState, now = new Date().toISOString()): PizzaNightState {
  if (state.standardRecipesVersion !== undefined) return state;
  const ids = new Set(state.recipes.map(recipe => recipe.id));
  const missing: ToppingRecipe[] = standardRecipes.filter(recipe => !ids.has(recipe.id)).map(recipe => ({
    id: recipe.id, name: recipe.name, ingredients: [...recipe.ingredients], preparation: '', createdAt: now, updatedAt: now,
  }));
  if (state.recipes.length + missing.length > pizzaLimits.recipes)
    throw Error('Nicht genügend Platz für die Standardpizzen. Es sind höchstens 500 Belagrezepte möglich. Es wurde nichts verändert.');
  return { ...state, recipes: [...state.recipes, ...missing], standardRecipesVersion: STANDARD_RECIPES_VERSION };
}
