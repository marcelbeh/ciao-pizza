import { sessionBatches, sessionIngredients, type PizzaSession } from './model';
/** Display-only 0.01-g allocation; calculation and recipe remain unrounded. */
export function batchDisplay(s: PizzaSession) {
  const totals=sessionIngredients(s), batches=sessionBatches(s);
  const allocate=(total:number)=>{const units=Math.round(total*100),regular=Math.floor(units/batches.count),extra=units% batches.count;
    return {total:units/100,regular:regular/100,adjusted:(regular+1)/100,extra,regularCount:batches.count-extra};};
  return {count:batches.count,flour:allocate(totals.flour),water:allocate(totals.water),salt:allocate(totals.salt),yeast:allocate(totals.yeast)};
}
export function confirmedSteps(s:PizzaSession){return new Set(s.cooking.done.map(item=>item.key.split(':')[1]));}
