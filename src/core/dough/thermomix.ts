export const THERMOMIX_MAX_FLOUR_GRAMS = 400;
export const THERMOMIX_SECONDS_PER_BATCH = 30;
/** Split the existing, unrounded flour/water totals evenly; never change the recipe. */
export function thermomixBatches(flourGrams: number, waterGrams: number) {
  if (!Number.isFinite(flourGrams) || flourGrams <= 0 || !Number.isFinite(waterGrams) || waterGrams < 0)
    throw Error('Ungültige Mehl- oder Wassermenge.');
  const count = Math.ceil(flourGrams / THERMOMIX_MAX_FLOUR_GRAMS);
  if (!Number.isSafeInteger(count) || count < 1) throw Error('Zu viele Chargen.');
  return { count, flourPerBatch: flourGrams / count, waterPerBatch: waterGrams / count,
    secondsPerBatch: THERMOMIX_SECONDS_PER_BATCH };
}
