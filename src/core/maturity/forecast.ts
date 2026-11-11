import { calculateFormula } from '../dough/forno';
import { calculateSchedule } from '../schedule/plan';
import { assertMonitor, type MonitorPlan, type CheckSlot } from './model';
export const readinessLabels = ['Frühe Reife', 'Reife entwickelt sich', 'Voraussichtlich backbereit', 'Möglicherweise überreif'] as const;
export function monitorPhases(plan: MonitorPlan) {
  return calculateSchedule(plan.schedule).filter(step => ['bulk', 'cold-bulk', 'balls', 'cold-balls', 'acclimate'].includes(step.id)).map(step => ({
    ...step, group: ['bulk', 'cold-bulk'].includes(step.id) ? 'bulk' as const : 'piece' as const,
  }));
}
export function checkSuggestions(plan: MonitorPlan) {
  const phases = monitorPhases(plan); const bulk = phases.filter(p => p.group === 'bulk'); const piece = phases.filter(p => p.group === 'piece');
  const bulkStart = Date.parse(bulk[0].at); const bulkEnd = Date.parse(bulk.at(-1)!.endsAt!);
  const pieceStart = Date.parse(piece[0].at); const bake = Date.parse(plan.schedule.bakeAt);
  const preheat = calculateSchedule(plan.schedule).find(step => step.id === 'preheat')!;
  return [
    { slot: 'bulk' as CheckSlot, label: 'Gegen Ende der Stockgare', at: new Date(bulkEnd - Math.min(30 * 60000, (bulkEnd - bulkStart) / 2)).toISOString() },
    { slot: 'piece' as CheckSlot, label: 'Während der Stückgare', at: new Date(pieceStart + (bake - pieceStart) / 2).toISOString() },
    { slot: 'bake' as CheckSlot, label: 'Vor dem Backen', at: new Date(Math.max(pieceStart, Date.parse(preheat.at))).toISOString() },
  ];
}
/** Model v1: plan-relative qualitative rules, never fermentation rates or readiness percentages. */
export function maturityForecast(plan: MonitorPlan, now: number) {
  assertMonitor(plan); if (!Number.isFinite(now)) throw Error('Ungültige aktuelle Zeit.');
  const phases = monitorPhases(plan); const first = Date.parse(phases[0].at); const bake = Date.parse(plan.schedule.bakeAt);
  const current = phases.find(p => Date.parse(p.at) <= now && now < Date.parse(p.endsAt!));
  const group = current?.group ?? (now >= bake ? 'piece' : null);
  const reasons: string[] = []; const recommendations: string[] = [];
  let temperatureDeviation = false;
  // Environment readings are step changes. Evaluate them against the planned temperature of each affected phase.
  for (const phase of phases) {
    const from = Date.parse(phase.at); const until = Math.min(now, Date.parse(phase.endsAt!)); if (until <= from) continue;
    const kind = ['cold-bulk', 'cold-balls'].includes(phase.id) ? 'fridge' : 'room';
    const events = plan.temperatures.filter(e => e.kind === kind && Date.parse(e.at) <= until).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const atStart = events.filter(e => Date.parse(e.at) <= from).at(-1);
    const readings = [atStart?.celsius ?? (kind === 'fridge' ? plan.conditions.fridgeC : plan.conditions.roomC), ...events.filter(e => Date.parse(e.at) > from).map(e => e.celsius)];
    for (const measured of readings) if (measured !== null && measured !== undefined && measured !== phase.temperatureC) {
      temperatureDeviation = true;
      reasons.push(`${phase.label}: gemessene Umgebung ${measured} °C statt geplanter ${phase.temperatureC} °C.`);
      recommendations.push(measured > phase.temperatureC! ? 'Wärmere Bedingungen können die Reife beschleunigen. Teig jetzt prüfen und bei Bedarf kühler stellen.' : 'Kühlere Bedingungen können die Reife verzögern. Teigzustand prüfen; mehr Zeit nur bewusst im Zeitplan vorsehen.');
    }
  }
  const available = plan.checks.filter(c => !c.skipped && Date.parse(c.at) <= now && Date.parse(c.at) >= first).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latest = available.at(-1);
  const latestPhase = (latest && phases.find(p => Date.parse(p.at) <= Date.parse(latest.at) && Date.parse(latest.at) <= Date.parse(p.endsAt!))) ?? (latest && Date.parse(latest.at) >= bake ? phases.at(-1) : undefined);
  const usable = latest && ((group === 'piece' && latest.slot !== 'bulk' && latestPhase?.group === 'piece') || (group === 'bulk' && latest.slot === 'bulk' && latestPhase?.group === 'bulk')) ? latest : undefined;
  const positive = usable ? Number(['clear', 'double'].includes(usable.volume ?? '')) + Number(usable.surface === 'bubbles') + Number(usable.elasticity === 'slow') : 0;
  const collapse = usable?.surface === 'collapsed' && usable.elasticity === 'soft';
  const under = usable?.volume === 'little' && usable.elasticity === 'fast';
  const concern = usable && (usable.surface === 'collapsed' || usable.elasticity === 'soft' || usable.volume === 'little' || usable.elasticity === 'fast');
  const actualDough = plan.conditions.doughAt && Date.parse(plan.conditions.doughAt) <= now ? plan.conditions.doughC : null;
  const recentDough = plan.temperatures.filter(e => e.kind === 'dough' && Date.parse(e.at) <= now).sort((a,b) => Date.parse(a.at)-Date.parse(b.at)).at(-1);
  const measuredDough = recentDough?.celsius ?? actualDough;
  if (measuredDough !== null && measuredDough > plan.schedule.roomC) {
    temperatureDeviation = true;
    reasons.push('Die gemessene Teigtemperatur liegt über der geplanten Raumtemperatur. Knetwärme und Abkühlung machen den Verlauf unsicher.');
    recommendations.push('Weitere Erwärmung vermeiden, Teigtemperatur erneut messen und den Teig gegebenenfalls kühler führen. Keine genaue Zeitverkürzung ableitbar.');
  }
  const hasRoom = plan.conditions.roomC !== null || plan.temperatures.some(e => e.kind === 'room' && Date.parse(e.at) <= now);
  const hasFridge = plan.conditions.fridgeC !== null || plan.temperatures.some(e => e.kind === 'fridge' && Date.parse(e.at) <= now);
  const needsFridge = phases.some(p => ['cold-bulk', 'cold-balls'].includes(p.id));
  const hasEnvironment = hasRoom && (!needsFridge || hasFridge);
  if (!hasRoom) reasons.push('Die tatsächliche Raumtemperatur ist unbekannt; es liegt nur die Planangabe vor.');
  if (needsFridge && !hasFridge) reasons.push('Die tatsächliche Kühlschranktemperatur ist unbekannt; es liegt nur die Planangabe vor.');
  let status: typeof readinessLabels[number] = now < first || group === 'bulk' ? 'Frühe Reife' : 'Reife entwickelt sich';
  const preBake = Date.parse(checkSuggestions(plan)[2].at);
  if (group === 'bulk' && positive >= 2) status = 'Reife entwickelt sich';
  const afterBakeEvidence = now > bake && usable && Date.parse(usable.at) >= bake && positive >= 2;
  if (group === 'piece' && now >= preBake && (!temperatureDeviation || positive >= 2) && !concern && plan.yeastGrams > 0 && (now <= bake || afterBakeEvidence)) status = 'Voraussichtlich backbereit';
  if (now > bake) recommendations.push('Der Backtermin ist überschritten. Einen neuen aktuellen Teig-Check machen; der vergangene Zeitplan allein reicht nicht für Backbereitschaft.');
  if (collapse) status = 'Möglicherweise überreif';
  reasons.unshift(now < first ? 'Der geplante Gärbeginn ist noch nicht erreicht.' : current ? `Laut Zeitplan: ${current.label}.` : 'Der geplante Backtermin ist erreicht oder überschritten; das beweist keine Übergare.');
  if (collapse) { reasons.push('Schlaffe Oberfläche und sehr weiche Konsistenz treten gemeinsam auf; auch Mehl und Hydration können das beeinflussen.'); recommendations.push('Teig vorsichtig prüfen, behutsam behandeln und bei bestätigtem Reifeverlust bald verarbeiten. Backtermin nur selbst ändern.'); }
  else if (under) { reasons.push('Geringe Volumenzunahme und schnelles Zurückfedern sprechen gemeinsam eher für noch wenig Entwicklung, sind aber kein Beweis.'); recommendations.push('Erneut prüfen und bei Bedarf eine längere Gare selbst im Zeitplan vorsehen.'); }
  else if (concern) { reasons.push('Ein einzelnes auffälliges Merkmal ist kein Beweis für Unter- oder Übergare. Die planbasierte Backbereitschaft ist damit unsicher.'); recommendations.push('Weitere Merkmale und Temperatur prüfen, bevor du dich auf den geplanten Backtermin verlässt.'); }
  else if (positive >= 2) reasons.push('Mehrere aktuelle Beobachtungen stützen eine fortgeschrittene Entwicklung; eine einzelne Beobachtung reicht dafür nicht.');
  else reasons.push('Ohne mehrere aktuelle Beobachtungen folgt die Anzeige hauptsächlich dem Plan, nicht einer gemessenen Teigreife.');
  const ingredients = calculateFormula(plan.formula).ingredients;
  const dryPercent = plan.yeastGrams / (plan.yeastKind === 'fresh' ? 3 : 1) / ingredients.flour * 100;
  if (plan.yeastGrams === 0) { reasons.push('Keine Hefe erfasst. Eine Backbereitschaft lässt sich aus diesem Zeitplan nicht ableiten.'); recommendations.push('Rezeptdaten und tatsächliche Triebmittel prüfen.'); }
  else if (Math.abs(dryPercent - .1) > 1e-9) reasons.push(`Hefemenge weicht von der persönlichen 0,1-%-Trockenhefe-Referenz ab: ${dryPercent > .1 ? 'mehr Hefe kann schneller' : 'weniger Hefe kann langsamer'} reifen. Keine verlässliche Zeitkorrektur ableitbar.`);
  if (plan.formula.hydration !== 64) reasons.push('Hydration weicht von der 64-%-Referenz ab. Weicher oder klebriger Teig allein bedeutet keine Übergare.');
  if (plan.formula.salt !== 3) reasons.push('Salzanteil weicht von der 3-%-Referenz ab und kann die Entwicklung beeinflussen; keine Zeitkorrektur wird berechnet.');
  if (measuredDough === null) reasons.push('Die tatsächliche Teigtemperatur fehlt.');
  else reasons.push(`Teigtemperatur gemessen: ${measuredDough} °C. Der Teig nimmt die Kühlschranktemperatur nicht sofort an; sein Temperaturverlauf wird nicht simuliert.`);
  if (latest && !usable) reasons.push('Frühere Beobachtungen aus einer anderen Gärphase belegen den aktuellen Zustand nicht.');
  if (!recommendations.length) recommendations.push('Optionalen Teig-Check nutzen und mehrere Merkmale gemeinsam beurteilen. Den Zeitplan bei Bedarf selbst öffnen.');
  return { modelVersion: 1 as const, status, certainty: usable && positive >= 2 && measuredDough !== null && hasEnvironment && !temperatureDeviation && now <= bake ? 'Eingeschränkt gestützt' : 'Gering',
    phase: group, reasons: [...new Set(reasons)], recommendations: [...new Set(recommendations)],
    phases: phases.map(p => ({ ...p, state: now < Date.parse(p.at) ? 'Geplant' : now < Date.parse(p.endsAt!) ? 'Läuft laut Plan' : 'Zeit laut Plan erreicht' })),
  };
}
