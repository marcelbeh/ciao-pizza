import type { BakingData } from "../baking/model";
import type { DoughPlan, DoughState, Style } from "../dough/model";
export const categories = [
  "Mehl",
  "Käse",
  "Gemüse",
  "Fleisch",
  "Sonstiges",
] as const;
export type Category = (typeof categories)[number];
export const units = ["g", "kg", "ml", "l", "Stück"] as const;
export type Unit = (typeof units)[number];
export type BaseUnit = "g" | "ml" | "Stück";
export const toppings = ["Vegetarisch", "Vegan", "Fleisch", "Fisch"] as const;
export type Topping = (typeof toppings)[number];
export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: Unit;
  category: Category;
}
export interface Recipe {
  id: string;
  name: string;
  style: Style;
  topping: Topping;
  yieldPizzas: number;
  ingredients: Ingredient[];
  instructions: string;
  /** Optional successful dough formula from the journal; toppings still exclude dough. */
  dough?: DoughPlan;
}
export interface EveningLine {
  id: string;
  recipe: Recipe;
  pizzas: number;
}
export interface PizzaEvening {
  id: string;
  name: string;
  bakeAt: string;
  timeZone: string;
  guests: number;
  pizzasPerPerson: number;
  reserve: number;
  dough: DoughPlan;
  lines: EveningLine[];
  updatedAt: string;
}
export interface ShoppingItem {
  id: string;
  key: string;
  name: string;
  unit: BaseUnit;
  category: Category;
  quantity: number;
  generatedQuantity: number | null;
  onHand: number;
  checked: boolean;
  manual: boolean;
  edited: boolean;
  excluded: boolean;
  sourceRemoved: boolean;
}
export interface ShoppingList {
  id: string;
  name: string;
  eveningId: string | null;
  sourceUpdatedAt: string | null;
  items: ShoppingItem[];
  updatedAt: string;
}
export interface LocalWorkspace {
  version: 2;
  dough: DoughState;
  recipes: Recipe[];
  evenings: PizzaEvening[];
  shopping: ShoppingList[];
  settings: Record<string, unknown>;
  fermentations: Record<string, unknown>[];
  legacyOriginal?: unknown;
  /** Additive P4 schema; missing in older V2 backups means an empty baking workspace. */
  baking?: BakingData;
}
export const emptyWorkspace = (): LocalWorkspace => ({
  version: 2,
  dough: { version: 1, active: null, profiles: [] },
  recipes: [],
  evenings: [],
  shopping: [],
  settings: {},
  fermentations: [],
});
