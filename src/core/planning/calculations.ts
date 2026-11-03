import type { DoughPlan } from "../dough/model";
import { createPlan } from "../dough/model";
import { assertPlan, calculateDough, pizzaCount } from "../dough/calculations";
import type {
  BaseUnit,
  Ingredient,
  PizzaEvening,
  ShoppingItem,
  ShoppingList,
} from "./model";
import { assertRecipe, builtInRecipes, scaleRecipe } from "./recipes";
export const formatQuantity = (n: number) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(n);
const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
const aliases: Record<string, string> = {
  tomatenpassata: "passierte tomaten",
  passata: "passierte tomaten",
  champignon: "champignons",
  olivenoel: "olivenol",
  meersalz: "salz",
  "parmigiano reggiano": "parmesan",
};
export function ingredientKey(name: string, unit: BaseUnit) {
  const normalized = normalize(name);
  return `${aliases[normalized] ?? normalized}:${unit}`;
}
export function toBase(i: Pick<Ingredient, "amount" | "unit">): {
  amount: number;
  unit: BaseUnit;
} {
  if (!Number.isFinite(i.amount) || i.amount < 0)
    throw Error("Ungültige Zutatenmenge.");
  switch (i.unit) {
    case "kg":
      return { amount: i.amount * 1000, unit: "g" };
    case "l":
      return { amount: i.amount * 1000, unit: "ml" };
    case "g":
    case "ml":
    case "Stück":
      return { amount: i.amount, unit: i.unit };
    default:
      throw Error("Unbekannte Einheit.");
  }
}
export function eveningCount(
  e: Pick<PizzaEvening, "guests" | "pizzasPerPerson" | "reserve">,
) {
  if (
    !Number.isInteger(e.guests) ||
    e.guests < 1 ||
    e.guests > 100 ||
    !Number.isFinite(e.pizzasPerPerson) ||
    e.pizzasPerPerson < 0.25 ||
    e.pizzasPerPerson > 5 ||
    !Number.isInteger(e.reserve) ||
    e.reserve < 0 ||
    e.reserve > 100
  )
    throw Error(
      "Gäste 1–100, Pizzen pro Person 0,25–5 und ganze Reserve 0–100 wählen.",
    );
  const count = pizzaCount(e.guests, e.pizzasPerPerson, e.reserve);
  if (count > 500) throw Error("Maximal 500 Pizzen pro Abend.");
  return count;
}
export function eveningDough(
  e: Pick<
    PizzaEvening,
    "guests" | "pizzasPerPerson" | "reserve" | "name" | "bakeAt" | "timeZone"
  >,
  source: DoughPlan,
): DoughPlan {
  assertPlan(source);
  const ballGrams =
    source.massMode === "flour"
      ? calculateDough(source).ballGrams
      : source.ballGrams;
  const plan = {
    ...structuredClone(source),
    name: e.name,
    bakeAt: e.bakeAt,
    timeZone: e.timeZone,
    people: e.guests,
    pizzasPerPerson: e.pizzasPerPerson,
    reserve: e.reserve,
    count: eveningCount(e),
    ballGrams,
    massMode: "balls" as const,
  };
  assertPlan(plan);
  return plan;
}
export function newEvening(source = createPlan()): PizzaEvening {
  const e: PizzaEvening = {
    id: crypto.randomUUID(),
    name: "Mein Pizzaabend",
    bakeAt: source.bakeAt,
    timeZone: source.timeZone,
    guests: 4,
    pizzasPerPerson: 1,
    reserve: 0,
    dough: structuredClone(source),
    lines: [
      {
        id: crypto.randomUUID(),
        recipe: structuredClone(builtInRecipes[0]),
        pizzas: 4,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
  e.dough = eveningDough(e, source);
  return e;
}
export function assertEvening(value: unknown): asserts value is PizzaEvening {
  const e = value as PizzaEvening;
  if (
    !e ||
    typeof e.id !== "string" ||
    !e.id ||
    typeof e.name !== "string" ||
    !e.name.trim() ||
    e.name.length > 80 ||
    !Number.isFinite(Date.parse(e.updatedAt)) ||
    !Array.isArray(e.lines) ||
    !e.lines.length ||
    e.lines.length > 100
  )
    throw Error(
      "Pizzaabend benötigt Name, Termin und mindestens eine Pizzasorte.",
    );
  const count = eveningCount(e);
  assertPlan(e.dough);
  if (
    e.dough.count !== count ||
    e.dough.massMode !== "balls" ||
    e.dough.bakeAt !== e.bakeAt ||
    e.dough.timeZone !== e.timeZone ||
    e.dough.people !== e.guests ||
    e.dough.pizzasPerPerson !== e.pizzasPerPerson ||
    e.dough.reserve !== e.reserve
  )
    throw Error("Teigplan passt nicht zur Mengen- oder Zeitplanung.");
  const ids = new Set<string>();
  let sum = 0;
  for (const line of e.lines) {
    if (
      !line ||
      typeof line.id !== "string" ||
      !line.id ||
      ids.has(line.id) ||
      !Number.isInteger(line.pizzas) ||
      line.pizzas < 1 ||
      line.pizzas > 500
    )
      throw Error("Pizzasorten benötigen ganze Mengen von 1 bis 500.");
    ids.add(line.id);
    assertRecipe(line.recipe);
    sum += line.pizzas;
  }
  if (sum !== count)
    throw Error(
      `Bitte genau ${count} Pizzen auf die Sorten verteilen (aktuell ${sum}).`,
    );
}
export function ingredientsForEvening(e: PizzaEvening): Ingredient[] {
  assertEvening(e);
  const p = calculateDough(e.dough).ingredients;
  const dough: Ingredient[] = [
    {
      id: "flour",
      name: `Mehl · ${e.dough.flourProfile}`,
      amount: p.flour,
      unit: "g",
      category: "Mehl",
    },
    {
      id: "water",
      name: "Wasser",
      amount: p.water,
      unit: "g",
      category: "Sonstiges",
    },
    {
      id: "salt",
      name: "Salz",
      amount: p.salt,
      unit: "g",
      category: "Sonstiges",
    },
    {
      id: "yeast",
      name:
        e.dough.yeastKind === "fresh" ? "Frischhefe" : "Instant-Trockenhefe",
      amount: p.yeast,
      unit: "g",
      category: "Sonstiges",
    },
    {
      id: "oil",
      name: "Olivenöl",
      amount: p.oil,
      unit: "g",
      category: "Sonstiges",
    },
    {
      id: "sugar",
      name: "Zucker",
      amount: p.sugar,
      unit: "g",
      category: "Sonstiges",
    },
  ];
  return [
    ...dough.filter((i) => i.amount > 0),
    ...e.lines.flatMap((line) => scaleRecipe(line.recipe, line.pizzas)),
  ];
}
export function aggregateIngredients(
  ingredients: Ingredient[],
): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const ingredient of ingredients) {
    const base = toBase(ingredient);
    const key = ingredientKey(ingredient.name, base.unit);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += base.amount;
      existing.generatedQuantity = existing.quantity;
    } else
      map.set(key, {
        id: crypto.randomUUID(),
        key,
        name: ingredient.name.trim(),
        unit: base.unit,
        category: ingredient.category,
        quantity: base.amount,
        generatedQuantity: base.amount,
        onHand: 0,
        checked: false,
        manual: false,
        edited: false,
        excluded: false,
        sourceRemoved: false,
      });
  }
  return [...map.values()];
}
export const toBuy = (item: ShoppingItem) =>
  item.excluded ? 0 : Math.max(0, item.quantity - item.onHand);
export function generateShopping(
  e: PizzaEvening,
  existing?: ShoppingList,
): ShoppingList {
  const generated = aggregateIngredients(ingredientsForEvening(e));
  const old = existing?.items ?? [];
  const items = generated.map((item) => {
    const previous = old.find((p) => !p.manual && p.key === item.key);
    if (!previous) return item;
    return {
      ...previous,
      generatedQuantity: item.generatedQuantity,
      quantity: previous.edited ? previous.quantity : item.quantity,
      checked: previous.quantity === item.quantity ? previous.checked : false,
      sourceRemoved: false,
    };
  });
  for (const previous of old) {
    if (previous.manual) items.push(structuredClone(previous));
    else if (!items.some((i) => i.key === previous.key))
      items.push({
        ...previous,
        generatedQuantity: 0,
        quantity: previous.edited ? previous.quantity : 0,
        sourceRemoved: true,
      });
  }
  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: `Einkauf · ${e.name}`,
    eveningId: e.id,
    sourceUpdatedAt: e.updatedAt,
    items,
    updatedAt: new Date().toISOString(),
  };
}
