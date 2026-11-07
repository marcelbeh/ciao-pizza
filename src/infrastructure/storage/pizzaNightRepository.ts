import type { KeyValueStore } from '../../core/storage/KeyValueStore';
import { assertEvening, assertPizzaNight, assertRecipe, emptyPizzaNight, type PizzaEvening, type PizzaNightState, type ToppingRecipe } from '../../core/pizzaNight/model';
export const PIZZA_NIGHT_KEY = 'forno:pizza-night:v1';
export const PIZZA_NIGHT_ERROR = 'Pizzaabend- und Rezeptdaten sind nicht lesbar oder haben eine unbekannte Version. Sie wurden nicht überschrieben. Bearbeiten ist gesperrt; bitte unter Einstellungen eine vollständige Sicherung herunterladen.';
const conflict = () => { throw Error('Die Daten wurden inzwischen geändert. Bitte Entwurf sichern und die Seite neu laden.'); };
export function createPizzaNightRepository(store: KeyValueStore) {
  async function change(edit: (state: PizzaNightState) => void) {
    if (!store.update) throw Error('Atomarer Speicherzugriff nicht verfügbar. Es wurde nichts gespeichert.');
    return store.update<PizzaNightState>(PIZZA_NIGHT_KEY, previous => {
      if (previous !== undefined) assertPizzaNight(previous);
      const state = previous === undefined ? emptyPizzaNight() : structuredClone(previous);
      edit(state); assertPizzaNight(state); return state;
    });
  }
  return {
    async load(): Promise<{ pizzaNight: PizzaNightState | null; pizzaNightError: string }> {
      try {
        const raw = await store.get(PIZZA_NIGHT_KEY);
        if (raw === undefined) return { pizzaNight: emptyPizzaNight(), pizzaNightError: '' };
        assertPizzaNight(raw); return { pizzaNight: raw, pizzaNightError: '' };
      } catch { return { pizzaNight: null, pizzaNightError: PIZZA_NIGHT_ERROR }; }
    },
    async saveRecipe(recipe: ToppingRecipe, expected: ToppingRecipe | null) {
      assertRecipe(recipe);
      return change(state => {
        const index = state.recipes.findIndex(row => row.id === recipe.id);
        if (expected ? index < 0 || JSON.stringify(state.recipes[index]) !== JSON.stringify(expected) : index >= 0) conflict();
        if (expected && recipe.createdAt !== expected.createdAt) conflict();
        if (index < 0) state.recipes.push(structuredClone(recipe)); else state.recipes[index] = structuredClone(recipe);
      });
    },
    deleteRecipe(recipe: ToppingRecipe) {
      return change(state => {
        const current = state.recipes.find(row => row.id === recipe.id);
        if (JSON.stringify(current) !== JSON.stringify(recipe)) conflict();
        state.recipes = state.recipes.filter(row => row.id !== recipe.id);
      });
    },
    async saveEvening(evening: PizzaEvening, expected: PizzaEvening | null) {
      assertEvening(evening);
      return change(state => {
        if (JSON.stringify(state.evening) !== JSON.stringify(expected)) conflict();
        if (expected && (evening.id !== expected.id || evening.createdAt !== expected.createdAt)) conflict();
        state.evening = structuredClone(evening);
      });
    },
    deleteEvening(evening: PizzaEvening) {
      return change(state => { if (JSON.stringify(state.evening) !== JSON.stringify(evening)) conflict(); state.evening = null; });
    },
  };
}
export type PizzaNightRepository = ReturnType<typeof createPizzaNightRepository>;
