import { thermomixBatches } from './thermomix';
/** Device settings are deliberately unspecified: only official dough-mode operation and bowl fill volume are validated. */
export const TM5_SOURCE = 'https://support-gb.vorwerk.com/hc/en-gb/articles/18202346542236-How-do-I-activate-the-knead-mode-on-my-Thermomix-TM5-and-what-is-the-maximum-amount-of-dough-I-can-prepare-at-a-time';
export const TM5_MANUAL_SOURCE = 'https://cdn.shopify.com/s/files/1/0998/4730/7608/files/Thermomix_TM5.pdf?v=1787196129';
export function tm5Recipe(ingredients: { flour: number; water: number; salt: number; yeast: number }, autolyseMinutes = 30) {
  if (!Number.isInteger(autolyseMinutes) || autolyseMinutes < 0 || autolyseMinutes > 240 || !Number.isFinite(ingredients.salt) || ingredients.salt < 0 || !Number.isFinite(ingredients.yeast) || ingredients.yeast < 0) throw Error('Ungültige TM5-Rezeptdaten.');
  const { count, flourPerBatch, waterPerBatch } = thermomixBatches(ingredients.flour, ingredients.water);
  return { count, flourPerBatch, waterPerBatch, saltPerBatch: ingredients.salt / count, yeastPerBatch: ingredients.yeast / count,
    autolyseMinutes, validatedBowlLitres: 2.2, validatedMaximumFlour: null, rpm: null, kneadingSeconds: null };
}
