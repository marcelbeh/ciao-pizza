import { describe, it, expect } from "vitest";
import {
  aggregateIngredients,
  assertEvening,
  eveningDough,
  eveningCount,
  generateShopping,
  ingredientsForEvening,
  newEvening,
  toBuy,
} from "./calculations";
import {
  builtInRecipes,
  duplicateRecipe,
  saveCustomRecipe,
  scaleRecipe,
} from "./recipes";
import { calculateDough } from "../dough/calculations";
describe("Pizzaabend und Rezeptmengen", () => {
  it("rounds total pizza count upward, includes reserve and validates distribution", () => {
    const e = newEvening();
    e.guests = 3;
    e.pizzasPerPerson = 1.25;
    e.reserve = 2;
    expect(eveningCount(e)).toBe(6);
    e.dough = eveningDough(e, e.dough);
    expect(() => assertEvening(e)).toThrow("genau 6");
    e.lines[0].pizzas = 6;
    expect(() => assertEvening(e)).not.toThrow();
    expect(calculateDough(e.dough).total).toBeCloseTo(1500, 8);
  });
  it("scales recipe yield without intermediate rounding and protects originals", () => {
    const r = duplicateRecipe(builtInRecipes[0]);
    r.yieldPizzas = 3;
    r.ingredients[0].amount = 100;
    expect(scaleRecipe(r, 2)[0].amount).toBeCloseTo(200 / 3);
    expect(() => saveCustomRecipe([], builtInRecipes[0])).toThrow("Original");
    expect(saveCustomRecipe([], r)).toHaveLength(1);
    expect(() => scaleRecipe(r, 0)).toThrow();
  });
  it("aggregates aliases and compatible units, never grams with milliliters", () => {
    const base = { id: "a", category: "Gemüse" as const };
    const items = aggregateIngredients([
      { ...base, name: "Passata", amount: 0.5, unit: "kg" },
      { ...base, name: "Passierte Tomaten", amount: 200, unit: "g" },
      { ...base, name: "Passata", amount: 0.2, unit: "l" },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0].quantity).toBe(700);
    expect(items[1].quantity).toBe(200);
  });
  it("includes the entire calculated dough and scaled toppings exactly once", () => {
    const e = newEvening();
    const ingredients = ingredientsForEvening(e);
    const dough = calculateDough(e.dough);
    expect(ingredients.find((i) => i.id === "flour")?.amount).toBe(
      dough.ingredients.flour,
    );
    expect(ingredients.filter((i) => i.name === "Mozzarella")[0].amount).toBe(
      320,
    );
    expect(ingredients.find((i) => i.id === "yeast")!.amount).toBeGreaterThan(
      0,
    );
  });
  it("retains stock, overrides, exclusions and manual items on regeneration", () => {
    const e = newEvening();
    const first = generateShopping(e);
    first.items[0].onHand = 100;
    first.items[0].quantity = 999;
    first.items[0].edited = true;
    first.items[1].excluded = true;
    first.items.push({
      ...first.items[0],
      id: "manual",
      manual: true,
      name: "Servietten",
      quantity: 12,
      onHand: 0,
    });
    e.lines[0].recipe.ingredients = e.lines[0].recipe.ingredients.filter(
      (i) => i.name !== "Basilikum",
    );
    const next = generateShopping(e, first);
    expect(next.items[0].quantity).toBe(999);
    expect(toBuy(next.items[0])).toBe(899);
    expect(toBuy(next.items[1])).toBe(0);
    expect(next.items.find((i) => i.id === "manual")).toBeDefined();
    expect(next.items.find((i) => i.name === "Basilikum")?.sourceRemoved).toBe(
      true,
    );
    expect(next.items.find((i) => i.name === "Basilikum")?.quantity).toBe(0);
  });
  it.each([NaN, Infinity, 0, -1, 101])(
    "rejects invalid guest count %s",
    (guests) => {
      expect(() => eveningCount({ ...newEvening(), guests })).toThrow();
    },
  );
});
