import { describe, expect, it } from 'vitest';
import { calculateFormula, defaults } from './forno';
import { tm5Recipe } from './tm5';
describe('TM5 recipe view without unvalidated device settings', () => {
  it('handles the 500/320/0.5/15 reference using the existing formula and full water at the start', () => {
    const formula={...defaults,count:3,ballGrams:278.5,hydration:64}; const original=structuredClone(formula);
    const ingredients=calculateFormula(formula).ingredients; const recipe=tm5Recipe(ingredients);
    expect(ingredients.flour).toBeCloseTo(500); expect(ingredients.water).toBeCloseTo(320); expect(ingredients.salt).toBeCloseTo(15); expect(ingredients.yeast).toBeCloseTo(.5);
    expect(recipe.count).toBe(2); expect(recipe.flourPerBatch).toBeCloseTo(250); expect(recipe.waterPerBatch).toBeCloseTo(160);
    expect(recipe.autolyseMinutes).toBe(30); expect(recipe.waterPerBatch*recipe.count).toBeCloseTo(ingredients.water); expect(formula).toEqual(original);
    expect(recipe.validatedBowlLitres).toBe(2.2); expect(recipe.rpm).toBeNull(); expect(recipe.kneadingSeconds).toBeNull(); expect(recipe.validatedMaximumFlour).toBeNull();
    expect(recipe).not.toHaveProperty('secondsPerBatch');
  });
  it.each([[400,1],[400.01,2],[800,2],[1200,3]])('respects the personal 400g planning cap for %s g flour', (flour,count) => {
    const r=tm5Recipe({flour,water:flour*.64,salt:flour*.03,yeast:flour*.001},45);
    expect(r.count).toBe(count); expect(r.flourPerBatch).toBeLessThanOrEqual(400); expect(r.autolyseMinutes).toBe(45);
    expect(r.saltPerBatch*count).toBeCloseTo(flour*.03); expect(r.yeastPerBatch*count).toBeCloseTo(flour*.001);
  });
  it('rejects invalid pauses and ingredients', () => {
    const ingredients={flour:500,water:320,salt:15,yeast:.5};
    for(const value of [-1,NaN,Infinity,1.5,241]) expect(()=>tm5Recipe(ingredients,value)).toThrow();
    expect(()=>tm5Recipe({...ingredients,water:NaN})).toThrow(); expect(()=>tm5Recipe({...ingredients,salt:-1})).toThrow();
  });
});
