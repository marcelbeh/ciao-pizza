import { describe, expect, it } from 'vitest';
import { thermomixBatches } from './thermomix';
import { calculateFormula, defaults } from './forno';
describe('Thermomix: maximum 400 g flour, flour and water only', () => {
  it.each([[100, 1], [400, 1], [400.01, 2], [800, 2], [800.01, 3], [1200, 3], [1000000, 2500]])('splits %s g into %s batches', (flour, count) => {
    const water = flour * .66; const result = thermomixBatches(flour, water);
    expect(result.count).toBe(count); expect(result.flourPerBatch).toBeLessThanOrEqual(400);
    expect(result.flourPerBatch * count).toBeCloseTo(flour, 8); expect(result.waterPerBatch * count).toBeCloseTo(water, 8);
    expect(result.secondsPerBatch).toBe(30);
  });
  it('derives the default batches without mutating any recipe or ingredient', () => {
    const original = structuredClone(defaults); const ingredients = calculateFormula(defaults).ingredients;
    const before = structuredClone(ingredients); const result = thermomixBatches(ingredients.flour, ingredients.water);
    expect(result.count).toBe(4); expect(result.flourPerBatch).toBeLessThanOrEqual(400);
    expect(defaults).toEqual(original); expect(ingredients).toEqual(before);
  });
  it.each([[0, 10], [-1, 10], [NaN, 10], [Infinity, 10], [400, -1], [400, Infinity], [400, NaN], [Number.MAX_VALUE, 10], [Number.MIN_VALUE, 10]])('rejects invalid totals %s/%s', (flour, water) => {
    expect(() => thermomixBatches(flour, water)).toThrow();
  });
});
