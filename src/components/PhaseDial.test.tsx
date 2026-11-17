import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhaseDial, ProcessTimeline, phasePresentation } from './PhaseDial';
import { createTeichnerSchedule, createSchedule, calculateSchedule } from '../core/schedule/plan';
const plan = createTeichnerSchedule('2026-11-20T20:00:00.000Z', { mixMinutes: 20, roomC: 22, fridgeC: 4 });
describe('plan-time visualisation without biological maturity claims', () => {
  it('shows the elapsed time of the current phase and resets exactly at its boundary', () => {
    const source = structuredClone(plan); const start = Date.parse(calculateSchedule(plan).find(s => s.id === 'cold-bulk')!.at);
    const halfway = phasePresentation(plan, start + 12 * 3600000);
    expect(halfway.selected.id).toBe('cold-bulk'); expect(halfway.fraction).toBe(.5);
    expect(phasePresentation(plan, start + 24 * 3600000)).toMatchObject({ selected: { id: 'cold-balls' }, fraction: 0 });
    expect(plan).toEqual(source);
  });
  it('shows preparation before fermentation and never fills a future phase', () => {
    const start = Date.parse(calculateSchedule(plan)[0].at);
    expect(phasePresentation(plan, start - 3600000)).toMatchObject({ selected: { id: 'mix' }, fraction: 0, before: true, remaining: 3600000 });
    render(<PhaseDial schedule={plan} now={start - 3600000} />);
    expect(screen.getByRole('progressbar', { name: 'Zeitlicher Phasenfortschritt' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', expect.stringContaining('Keine Messung der Teigreife'));
  });
  it('labels an elapsed baking deadline as a planned time, without asserting readiness or an optimal window', () => {
    render(<><PhaseDial schedule={plan} now={Date.parse(plan.bakeAt) + 3600000} /><ProcessTimeline schedule={plan} now={Date.parse(plan.bakeAt) + 3600000} /></>);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    const timeline = screen.getByRole('list', { name: 'Gesamter geplanter Teigprozess' });
    expect(timeline.querySelector('[aria-current="step"]')).toHaveTextContent('Backtermin');
    expect(timeline).toHaveTextContent('Zeit abgelaufen');
    expect(screen.queryByText(/optimales Backfenster/i)).not.toBeInTheDocument();
  });
  it('preserves legacy phases and includes preparation and baking without changing the schedule', () => {
    const legacy = createSchedule(Date.parse('2026-11-18T20:00:00.000Z')); const source = structuredClone(legacy);
    const view = phasePresentation(legacy, Date.parse(legacy.bakeAt) - 3600000);
    expect(view.steps.map(step => step.id)).toEqual(['mix', 'bulk', 'cold-bulk', 'balls', 'bake']);
    expect(view.selected.id).toBe('balls'); expect(legacy).toEqual(source);
  });
});
