import { maturityForecast } from '../core/maturity/forecast';
import type { MonitorPlan } from '../core/maturity/model';
/** Display-only projections. The existing forecast decides every maturity state. */
export function monitorPresentation(plan: MonitorPlan, now: number) {
  const forecast = maturityForecast(plan, now);
  const tones = { 'Frühe Reife': 'early', 'Reife entwickelt sich': 'developing', 'Voraussichtlich backbereit': 'ready', 'Möglicherweise überreif': 'caution' } as const;
  const descriptions = {
    early: 'Entwicklung abwarten und den Teig beobachten.',
    developing: 'Der Teig entwickelt sich. Den nächsten Check nutzen.',
    ready: 'Voraussichtlich gut zu verarbeiten. Vor dem Formen prüfen.',
    caution: 'Mehrere Anzeichen prüfen und den Teig behutsam behandeln.',
  };
  const readings = plan.temperatures.filter(event => event.kind === 'dough' && Date.parse(event.at) <= now).map(event => ({ at: event.at, celsius: event.celsius }));
  if (plan.conditions.doughC !== null && plan.conditions.doughAt && Date.parse(plan.conditions.doughAt) <= now) readings.push({ at: plan.conditions.doughAt, celsius: plan.conditions.doughC });
  const lastTemperature = readings.sort((a,b) => Date.parse(b.at)-Date.parse(a.at))[0] ?? null;
  const lastCheck = plan.checks.filter(check => !check.skipped && Date.parse(check.at) <= now).sort((a,b) => Date.parse(b.at)-Date.parse(a.at))[0] ?? null;
  const tone = tones[forecast.status];
  return { forecast, tone, description: descriptions[tone], lastTemperature, lastCheck };
}
