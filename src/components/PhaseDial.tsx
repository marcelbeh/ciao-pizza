import { calculateSchedule, type SchedulePlan } from '../core/schedule/plan';
import { Icon } from './Icon';

const names: Record<string, string> = { mix: 'Teigzubereitung', bulk: 'Stockgare', 'cold-bulk': 'Stockgare · kalt', balls: 'Stückgare', 'cold-balls': 'Stückgare · kalt', acclimate: 'Akklimatisierung', bake: 'Backtermin' };
/** Presentation of elapsed plan time only. Never estimates biological maturity. */
export function phasePresentation(schedule: SchedulePlan, now: number, preparationStart?: string) {
  const steps = calculateSchedule(schedule).filter(step => step.id !== 'preheat');
  if (preparationStart) steps[0] = {...steps[0], at:preparationStart};
  const current = steps.find(step => Date.parse(step.at) <= now && (!step.endsAt || now < Date.parse(step.endsAt)));
  const selected = current ?? steps[0];
  const start = Date.parse(selected.at);
  const end = Date.parse(selected.endsAt ?? selected.at);
  const duration = Math.max(0, end - start);
  const elapsed = Math.max(0, Math.min(duration, now - start));
  return { steps, selected, before: now < start, elapsed, duration,
    fraction: duration ? elapsed / duration : now >= start ? 1 : 0,
    remaining: Math.max(0, (now < start ? start : end) - now) };
}
function durationLabel(ms: number) {
  const minutes = Math.ceil(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} Std.${minutes % 60 ? ` ${minutes % 60} Min.` : ''}` : `${minutes} Min.`;
}
export function PhaseDial({ schedule, now, compact = false, preparationStart }: { schedule: SchedulePlan; now: number; compact?: boolean; preparationStart?: string }) {
  const view = phasePresentation(schedule, now, preparationStart);
  return <div className={`phase-dial ${compact ? 'phase-dial-compact' : ''}`}>
    <svg viewBox="0 0 200 200" aria-hidden="true"><circle className="phase-track" cx="100" cy="100" r="86" /><circle className="phase-elapsed" cx="100" cy="100" r="86" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - view.fraction * 100} /></svg>
    <div className="phase-dial-center"><Icon name={view.selected.id === 'bake' ? 'pizza' : 'dough'} />
      <strong>{view.selected.id === 'bake' ? 'Termin' : durationLabel(view.remaining)}</strong>
      <span>{view.selected.id === 'bake' ? 'erreicht' : view.before ? 'bis Planstart' : 'bis Phasenende'}</span>
    </div>
    <span className="sr-only" role="progressbar" aria-label="Zeitlicher Phasenfortschritt" aria-valuemin={0} aria-valuemax={Math.max(1, Math.ceil(view.duration / 60000))} aria-valuenow={view.duration ? Math.floor(view.elapsed / 60000) : view.fraction} aria-valuetext={`${names[view.selected.id]}: ${view.before ? 'noch nicht gestartet' : view.selected.id === 'bake' ? 'geplanter Termin erreicht' : `${durationLabel(view.elapsed)} von ${durationLabel(view.duration)} laut Plan`}. Keine Messung der Teigreife.`} />
  </div>;
}
export function ProcessTimeline({ schedule, now, preparationStart }: { schedule: SchedulePlan; now: number; preparationStart?: string }) {
  const view = phasePresentation(schedule, now, preparationStart);
  return <ol className="process-timeline" aria-label="Gesamter geplanter Teigprozess">{view.steps.map((step, index) => {
    const active = !view.before && view.selected.id === step.id;
    const passed = !active && !!step.endsAt && now >= Date.parse(step.endsAt);
    return <li key={step.id} data-state={active ? 'current' : passed ? 'passed' : 'future'} aria-current={active ? 'step' : undefined}>
      <span className="process-node" aria-hidden="true">{passed ? '✓' : String(index + 1).padStart(2, '0')}</span>
      <div><h3>{names[step.id]}</h3><time dateTime={step.at}>{new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(step.at))}</time></div>
      <span className="process-state">{active ? step.id === 'bake' ? 'Termin erreicht' : 'Läuft laut Plan' : passed ? 'Zeit abgelaufen' : 'Geplant'}</span>
    </li>;
  })}</ol>;
}
