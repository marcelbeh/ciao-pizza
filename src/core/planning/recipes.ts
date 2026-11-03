import { assertPlan } from "../dough/calculations";
import type { Recipe } from "./model";
import { categories, toppings, units } from "./model";
import { styles } from "../dough/model";
const make = (
  id: string,
  name: string,
  style: Recipe["style"],
  topping: Recipe["topping"],
  ingredients: [
    string,
    number,
    Recipe["ingredients"][number]["unit"],
    Recipe["ingredients"][number]["category"],
  ][],
  instructions: string,
): Recipe => ({
  id: `builtin:${id}`,
  name,
  style,
  topping,
  yieldPizzas: 1,
  ingredients: ingredients.map(([name, amount, unit, category], i) => ({
    id: `${id}-${i}`,
    name,
    amount,
    unit,
    category,
  })),
  instructions,
});
/** Topping quantities for one pizza, excluding dough. Own starting recipes, no certification. */
export const builtInRecipes: readonly Recipe[] = [
  make(
    "margherita",
    "Margherita",
    "napoletana",
    "Vegetarisch",
    [
      ["Passierte Tomaten", 80, "g", "Gemüse"],
      ["Mozzarella", 80, "g", "Käse"],
      ["Basilikum", 3, "g", "Gemüse"],
      ["Olivenöl", 5, "ml", "Sonstiges"],
    ],
    "Tomaten leicht zerdrücken und nach Geschmack würzen.\nTeigling mit den Händen öffnen und den Rand aussparen.\nTomaten und gut abgetropften Mozzarella verteilen.\nIm passend vorgeheizten Ofen backen, anschließend Basilikum und Olivenöl ergänzen.",
  ),
  make(
    "marinara",
    "Marinara",
    "napoletana",
    "Vegan",
    [
      ["Passierte Tomaten", 90, "g", "Gemüse"],
      ["Knoblauch", 3, "g", "Gemüse"],
      ["Oregano", 1, "g", "Gemüse"],
      ["Olivenöl", 5, "ml", "Sonstiges"],
    ],
    "Knoblauch in feine Scheiben schneiden.\nTeig öffnen und die Tomaten dünn verteilen.\nKnoblauch, Oregano und Olivenöl ergänzen.\nIm vorgeheizten Ofen passend zum Teigstil backen.",
  ),
  make(
    "diavola",
    "Diavola",
    "napoletana",
    "Fleisch",
    [
      ["Passierte Tomaten", 80, "g", "Gemüse"],
      ["Mozzarella", 80, "g", "Käse"],
      ["Scharfe Salami", 40, "g", "Fleisch"],
      ["Chiliflocken", 1, "g", "Sonstiges"],
    ],
    "Mozzarella abtropfen lassen, Salami dünn schneiden.\nGeöffneten Teig mit Tomaten und Käse belegen.\nSalami und Chili nach Geschmack verteilen.\nIm vorgeheizten Ofen backen und kurz ruhen lassen.",
  ),
  make(
    "funghi",
    "Funghi",
    "roman",
    "Vegetarisch",
    [
      ["Passierte Tomaten", 70, "g", "Gemüse"],
      ["Mozzarella", 70, "g", "Käse"],
      ["Champignons", 60, "g", "Gemüse"],
      ["Oregano", 1, "g", "Gemüse"],
    ],
    "Champignons putzen und sehr dünn schneiden.\nTeig für Tonda Romana dünn öffnen.\nTomaten, abgetropften Mozzarella und Pilze sparsam verteilen.\nPassend zum Ofen knusprig backen und mit Oregano abschließen.",
  ),
  make(
    "ny-cheese",
    "New York Cheese",
    "new-york",
    "Vegetarisch",
    [
      ["Passierte Tomaten", 80, "g", "Gemüse"],
      ["Pizza-Mozzarella", 100, "g", "Käse"],
      ["Parmesan", 10, "g", "Käse"],
    ],
    "Tomaten nach Geschmack würzen.\nTeig für einen größeren, dünnen Boden öffnen.\nSauce, geriebenen Pizza-Mozzarella und Parmesan verteilen.\nAuf gut vorgeheiztem Stein oder Stahl backen, bis der Boden gebräunt ist.",
  ),
];
export const isOriginal = (id: string) =>
  builtInRecipes.some((r) => r.id === id);
export function assertRecipe(value: unknown): asserts value is Recipe {
  const r = value as Recipe;
  if (
    !r ||
    typeof r.id !== "string" ||
    !r.id ||
    typeof r.name !== "string" ||
    !r.name.trim() ||
    r.name.length > 80 ||
    !Object.hasOwn(styles, r.style) ||
    !toppings.includes(r.topping) ||
    !Number.isInteger(r.yieldPizzas) ||
    r.yieldPizzas < 1 ||
    r.yieldPizzas > 50 ||
    typeof r.instructions !== "string" ||
    !r.instructions.trim() ||
    r.instructions.length > 8000 ||
    !Array.isArray(r.ingredients) ||
    (!r.ingredients.length && !r.dough) ||
    r.ingredients.length > 80
  )
    throw Error(
      "Rezept prüfen: Name, Stil, Portionen, Zutaten und Zubereitung sind erforderlich.",
    );
  if (r.dough !== undefined) assertPlan(r.dough);
  const ids = new Set<string>();
  for (const i of r.ingredients) {
    if (
      !i ||
      typeof i.id !== "string" ||
      !i.id ||
      ids.has(i.id) ||
      typeof i.name !== "string" ||
      !i.name.trim() ||
      i.name.length > 80 ||
      !Number.isFinite(i.amount) ||
      i.amount <= 0 ||
      i.amount > 100000 ||
      !units.includes(i.unit) ||
      !categories.includes(i.category)
    )
      throw Error(
        "Zutaten benötigen einen Namen, eine positive Menge bis 100.000 und eine gültige Einheit/Kategorie.",
      );
    ids.add(i.id);
  }
}
export function duplicateRecipe(recipe: Recipe): Recipe {
  assertRecipe(recipe);
  return {
    ...structuredClone(recipe),
    id: crypto.randomUUID(),
    name: `${recipe.name.slice(0, 65)} · Kopie`,
  };
}
export function scaleRecipe(recipe: Recipe, pizzas: number) {
  assertRecipe(recipe);
  if (!Number.isInteger(pizzas) || pizzas < 1 || pizzas > 500)
    throw Error("Pizzaanzahl: 1 bis 500.");
  return recipe.ingredients.map((i) => ({
    ...i,
    amount: (i.amount * pizzas) / recipe.yieldPizzas,
  }));
}
export function saveCustomRecipe(recipes: Recipe[], recipe: Recipe): Recipe[] {
  assertRecipe(recipe);
  if (isOriginal(recipe.id) || recipe.id.startsWith("builtin:"))
    throw Error("Originalrezepte sind geschützt. Bitte eine Kopie bearbeiten.");
  if (!recipes.some((r) => r.id === recipe.id) && recipes.length >= 300)
    throw Error("Maximal 300 eigene Rezepte.");
  return recipes.some((r) => r.id === recipe.id)
    ? recipes.map((r) => (r.id === recipe.id ? structuredClone(recipe) : r))
    : [...recipes, structuredClone(recipe)];
}
