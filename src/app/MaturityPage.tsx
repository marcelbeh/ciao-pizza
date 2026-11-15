import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeading } from '../components/PageHeading';
import { activeMonitor, recipeSnapshot, assertCheck, assertConditions, assertTemperatureEvent, newMonitor, type Conditions, type DoughCheck, type MaturityState, type MonitorPlan, type TemperatureEvent, type CheckSlot } from '../core/maturity/model';
import { checkSuggestions, maturityForecast } from '../core/maturity/forecast';
import { calculateFormula, type Formula } from '../core/dough/forno';
import type { SchedulePlan } from '../core/schedule/plan';
import { parseBakeInput } from '../core/schedule/plan';
import { toLocalInput } from '../core/dough/calculations';
import type { MaturityRepository } from '../infrastructure/storage/maturityRepository';
import { formatScheduleTime } from './ScheduleTimeline';
import { useDraftProtection } from './useDraftProtection';
export type MonitorAccess = { state: MaturityState | null; loadError: string; repository: MaturityRepository; busy: boolean; editing: boolean;
  run: (task: () => Promise<MaturityState>) => Promise<void>; editingChanged: (editing: boolean) => void;
  formula: Formula; schedule: SchedulePlan | null; scheduleError: string; now: number };
const number = (n: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n);
const failure = (e: unknown) => `Nicht gespeichert. Dein Entwurf bleibt erhalten. ${e instanceof Error ? e.message : 'Bitte erneut versuchen.'}`;
const numeric = (s: string) => s.trim() === '' ? null : /^-?\d+(?:[.,]\d+)?$/.test(s.trim()) ? Number(s.replace(',', '.')) : NaN;
function dateValue(s: string) { const iso = parseBakeInput(s); if (Date.parse(iso) > Date.now()) throw Error('Eine tatsächliche Messung darf nicht in der Zukunft liegen.'); return iso; }
export function MonitorStart({ access, showActiveSummary = true }: { access: MonitorAccess; showActiveSummary?: boolean }) {
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const plan = activeMonitor(access.state);
  const changed = plan && (JSON.stringify(plan.formula) !== JSON.stringify(recipeSnapshot(access.formula)) || JSON.stringify(plan.schedule) !== JSON.stringify(access.schedule));
  async function activate() {
    if (!access.schedule || !access.state || access.loadError || access.scheduleError) return;
    if (plan && !window.confirm('Aktuelle Rezeptur und Zeitplanung als neue Monitor-Planung übernehmen? Bisherige Messungen bleiben in der Sicherung erhalten.')) return;
    setError(''); setNotice('');
    try { await access.run(() => access.repository.activate(newMonitor(access.formula, access.schedule!), plan?.id ?? null)); setNotice('Monitor-Planung lokal gespeichert.'); }
    catch (e) { setError(failure(e)); }
  }
  return <>
    {access.loadError && <p className="error" role="alert">{access.loadError} <Link to="/einstellungen" className="text-link">Zur Sicherung</Link></p>}
    {access.scheduleError ? <p className="error" role="alert">Aktueller Zeitplan nicht verfügbar: {access.scheduleError}</p> : !access.schedule ? <p>Lege zuerst einen Backtermin und Gärphasen im <Link className="text-link" to="/zeitplan">Zeitplan</Link> fest.</p> : null}
    {showActiveSummary && plan && !changed && !access.loadError && <p className="field-hint">Aktive Planung · Backen: {formatScheduleTime(plan.schedule.bakeAt)}</p>}
    {changed && <p className="schedule-warning">Rechner oder Zeitplan wurden geändert. Die aktive Monitor-Planung und ihre Messungen bleiben bei den gespeicherten Werten. Übernimm Änderungen nur bewusst.</p>}
    {(!plan || changed) && <button className="primary" disabled={access.busy || access.editing || !access.schedule || !!access.scheduleError || !!access.loadError || !access.state} onClick={() => void activate()}>{plan ? 'Aktuelle Planung übernehmen' : 'Reifemonitor starten'}</button>}
    {notice && <p className="save-status" role="status">{notice}</p>}{error && <p role="alert" className="error">{error}</p>}
  </>;
}
function ConditionsEditor({ access, plan, close, saved }: { access: MonitorAccess; plan: MonitorPlan; close: () => void; saved: () => void }) {
  const [base] = useState(plan.conditions); const [dough, setDough] = useState(base.doughC?.toString() ?? '');
  const [room, setRoom] = useState(base.roomC?.toString() ?? ''); const [fridge, setFridge] = useState(base.fridgeC?.toString() ?? '');
  const [initialAt] = useState(() => toLocalInput(base.doughAt ?? new Date().toISOString())); const [at, setAt] = useState(initialAt); const [error, setError] = useState('');
  const dirty = dough !== (base.doughC?.toString() ?? '') || room !== (base.roomC?.toString() ?? '') || fridge !== (base.fridgeC?.toString() ?? '') || at !== initialAt;
  useDraftProtection(dirty, access.busy, true, access.editingChanged);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    try { const value: Conditions = { doughC: numeric(dough), doughAt: dough.trim() ? dateValue(at) : null, roomC: numeric(room), fridgeC: numeric(fridge) }; assertConditions(value);
      await access.run(() => access.repository.conditions(plan.id, value, base)); saved(); }
    catch (e) { setError(failure(e)); }
  }
  return <form onSubmit={e => void submit(e)} className="p3-fields" aria-label="Temperaturbasis bearbeiten" noValidate>
    <fieldset className="p3-fields" disabled={access.busy}>
      <label htmlFor="monitor-dough">Teigtemperatur nach dem Kneten (°C)<input id="monitor-dough" inputMode="decimal" value={dough} onChange={e => setDough(e.target.value)} /></label>
      <label htmlFor="monitor-dough-at">Zeitpunkt der Teigtemperatur<input id="monitor-dough-at" type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label>
      <label htmlFor="monitor-room">Gemessene Raumtemperatur als Basis (°C)<input id="monitor-room" inputMode="decimal" placeholder={`Plan: ${plan.schedule.roomC}`} value={room} onChange={e => setRoom(e.target.value)} /></label>
      <label htmlFor="monitor-fridge">Gemessene Kühlschranktemperatur als Basis (°C)<input id="monitor-fridge" inputMode="decimal" placeholder={`Plan: ${plan.schedule.fridgeC}`} value={fridge} onChange={e => setFridge(e.target.value)} /></label>
      <p className="field-hint">Alle Angaben optional, −10 bis 60 °C. Leere Felder sind unbekannt, keine Messung. Raum-/Kühlschrankbasis gilt für diese Planung; spätere Änderungen bitte als Temperaturänderung erfassen.</p>
      <div className="p3-actions"><button className="primary" type="submit">Temperaturen speichern</button><button type="button" onClick={() => { if (!dirty || window.confirm('Ungespeicherte Änderungen verwerfen?')) close(); }}>Abbrechen</button></div>
    </fieldset>{error && <p role="alert" className="error">{error}</p>}
  </form>;
}
export function SharedTemperatures({ access, disabled = false, onEditingChange, requireCurrent = false, tiles = false }: { access: MonitorAccess; disabled?: boolean; onEditingChange?: (editing: boolean) => void; requireCurrent?: boolean; tiles?: boolean }) {
  const plan = activeMonitor(access.state); const [editing, setEditing] = useState(false); const [notice, setNotice] = useState('');
  const previousId = useRef(plan?.id ?? null);
  useEffect(() => { if (plan && previousId.current !== plan.id) setNotice('Monitor-Planung lokal gespeichert.'); previousId.current = plan?.id ?? null; }, [plan?.id]);
  if (!plan || access.loadError || (requireCurrent && (JSON.stringify(plan.formula) !== JSON.stringify(recipeSnapshot(access.formula)) || JSON.stringify(plan.schedule) !== JSON.stringify(access.schedule)))) return <MonitorStart access={access} />;
  return <div>
    {editing ? <ConditionsEditor access={access} plan={plan} close={() => { setEditing(false); onEditingChange?.(false); }} saved={() => { setEditing(false); onEditingChange?.(false); setNotice('Temperaturen im aktiven Reifemonitor gespeichert.'); }} /> : <>
      {tiles ? <dl className="monitor-temperatures" aria-label="Gemessene Temperaturwerte">
        {([['Teig', plan.conditions.doughC, 'Nach dem Kneten'], ['Raum', plan.conditions.roomC, `Plan: ${plan.schedule.roomC} °C`], ['Kühlschrank', plan.conditions.fridgeC, `Plan: ${plan.schedule.fridgeC} °C`]] as const).map(([label, value, hint]) => <div key={label}><dt>{label}</dt><dd>{value === null ? '—' : `${number(value)} °C`}</dd><small>{value === null ? 'Nicht gemessen' : hint}</small></div>)}
      </dl> : <p className="field-hint">Teig nach Kneten: <strong>{plan.conditions.doughC === null ? 'noch nicht gemessen' : `${number(plan.conditions.doughC)} °C`}</strong>. Derselbe Wert wird in TM5-Ansicht und Monitor verwendet.</p>}
      <button disabled={access.busy || disabled} onClick={() => { setNotice(''); setEditing(true); onEditingChange?.(true); }}>Temperaturen erfassen / korrigieren</button></>}
    {notice && <p role="status" className="save-status">{notice}</p>}
  </div>;
}
const volumes = { little: 'Kaum verändert', slight: 'Leicht aufgegangen', clear: 'Deutlich aufgegangen', double: 'Ungefähr verdoppelt' };
const surfaces = { tense: 'Glatt und gespannt', bubbles: 'Luftig mit sichtbaren Bläschen', collapsed: 'Schlaff oder eingefallen' };
const elasticities = { fast: 'Federt schnell zurück', slow: 'Federt langsam zurück', soft: 'Sehr weich oder klebrig' };
function CheckEditor({ access, plan, slot, close }: { access: MonitorAccess; plan: MonitorPlan; slot: CheckSlot; close: (saved?: boolean) => void }) {
  const [original] = useState(plan.checks.find(c => c.slot === slot) ?? null);
  const [base] = useState<DoughCheck>(() => original ?? { id: crypto.randomUUID(), slot, at: new Date().toISOString(), skipped: false, volume: null, surface: null, elasticity: null });
  const [at, setAt] = useState(toLocalInput(base.at)); const [volume, setVolume] = useState(base.volume ?? ''); const [surface, setSurface] = useState(base.surface ?? ''); const [elasticity, setElasticity] = useState(base.elasticity ?? ''); const [error, setError] = useState('');
  const dirty = at !== toLocalInput(base.at) || volume !== (base.volume ?? '') || surface !== (base.surface ?? '') || elasticity !== (base.elasticity ?? '');
  useDraftProtection(dirty, access.busy, true, access.editingChanged);
  async function save(skipped: boolean) {
    setError('');
    try { if (!skipped && !volume && !surface && !elasticity) throw Error('Bitte mindestens eine Beobachtung auswählen oder den Check überspringen.');
      const value: DoughCheck = { ...base, at: dateValue(at), skipped, volume: skipped ? null : volume as DoughCheck['volume'] || null,
      surface: skipped ? null : surface as DoughCheck['surface'] || null, elasticity: skipped ? null : elasticity as DoughCheck['elasticity'] || null };
      assertCheck(value); await access.run(() => access.repository.check(plan.id, value, original)); close(true); }
    catch (e) { setError(failure(e)); }
  }
  return <form className="monitor-editor" aria-label="Freiwilliger Teig-Check" onSubmit={e => { e.preventDefault(); void save(false); }} noValidate>
    <h3>Freiwilliger Teig-Check</h3><fieldset className="p3-fields" disabled={access.busy}>
      <label>Zeitpunkt der Beobachtung<input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label>
      <label>Volumenzunahme<select aria-label="Volumenzunahme" value={volume} onChange={e => setVolume(e.target.value as typeof volume)}><option value="">Nicht beobachtet</option>{Object.entries(volumes).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      <label>Oberfläche<select aria-label="Oberfläche" value={surface} onChange={e => setSurface(e.target.value as typeof surface)}><option value="">Nicht beobachtet</option>{Object.entries(surfaces).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      <label>Elastizität<select aria-label="Elastizität" value={elasticity} onChange={e => setElasticity(e.target.value as typeof elasticity)}><option value="">Nicht beobachtet</option>{Object.entries(elasticities).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      <p className="field-hint">Einzelne Merkmale beweisen weder Unter- noch Übergare. Eine oder mehrere Angaben reichen zum Speichern; Überspringen erfordert keine Beobachtung.</p>
      <div className="p3-actions"><button className="primary" type="submit">Check speichern</button><button type="button" onClick={() => void save(true)}>Check überspringen</button>
        <button type="button" onClick={() => { if (!dirty || window.confirm('Ungespeicherte Änderungen verwerfen?')) close(); }}>Abbrechen</button></div>
    </fieldset>{error && <p role="alert" className="error">{error}</p>}
  </form>;
}
function TemperatureEditor({ access, plan, original, close }: { access: MonitorAccess; plan: MonitorPlan; original: TemperatureEvent | null; close: (saved?: boolean) => void }) {
  const [base] = useState<TemperatureEvent>(() => original ?? { id: crypto.randomUUID(), at: new Date().toISOString(), kind: 'room', celsius: plan.schedule.roomC });
  const [at,setAt] = useState(toLocalInput(base.at)); const [kind,setKind] = useState(base.kind); const [value,setValue] = useState(String(base.celsius)); const [error,setError] = useState('');
  const dirty = at !== toLocalInput(base.at) || kind !== base.kind || value !== String(base.celsius);
  useDraftProtection(dirty, access.busy, true, access.editingChanged);
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); try { const event = { ...base, at: dateValue(at), kind, celsius: numeric(value) as number }; assertTemperatureEvent(event);
      await access.run(() => access.repository.temperature(plan.id, event, original)); close(true); } catch(e) { setError(failure(e)); } }
  return <form className="monitor-editor" aria-label="Temperaturänderung bearbeiten" onSubmit={e => void submit(e)} noValidate><h3>Temperaturänderung</h3>
    <fieldset className="p3-fields" disabled={access.busy}><label>Zeitpunkt der Änderung<input type="datetime-local" value={at} onChange={e=>setAt(e.target.value)} /></label>
      <label>Gemessen an<select aria-label="Gemessen an" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="room">Raum</option><option value="fridge">Kühlschrank</option><option value="dough">Teig</option></select></label>
      <label>Neue Temperatur (°C)<input inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} /></label>
      <div className="p3-actions"><button className="primary" type="submit">Änderung speichern</button><button type="button" onClick={()=>{if(!dirty||window.confirm('Ungespeicherte Änderungen verwerfen?'))close();}}>Abbrechen</button></div>
    </fieldset>{error && <p role="alert" className="error">{error}</p>}
  </form>;
}
export function MaturityCompact({ access }: { access: MonitorAccess }) {
  const plan = activeMonitor(access.state) ?? (access.schedule && !access.scheduleError ? newMonitor(access.formula, access.schedule, new Date(access.now).toISOString(), 'preview') : null);
  const prediction = plan ? maturityForecast(plan, access.now) : null;
  return <Link className="card maturity-summary" to="/reife-monitor"><strong>Reife: {access.loadError ? 'Daten prüfen' : prediction?.status ?? 'Noch kein Zeitplan'}</strong>
    <span>{prediction ? `Sicherheit: ${prediction.certainty}${plan?.id === 'preview' ? ' · Planvorschau' : ''}` : 'Planung und freiwillige Teig-Checks öffnen'} →</span></Link>;
}
const phaseNames: Record<string, string> = {
  bulk: 'Stockgare', 'cold-bulk': 'Stockgare · kalt', balls: 'Stückgare',
  'cold-balls': 'Stückgare · kalt', acclimate: 'Akklimatisierung',
};
const shortDate = (iso: string) => new Intl.DateTimeFormat('de-DE', {
  weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}).format(new Date(iso));

export function MaturityPage({ access }: { access: MonitorAccess }) {
  const plan = activeMonitor(access.state);
  const [checkSlot, setCheckSlot] = useState<CheckSlot | null>(null);
  const [temperature, setTemperature] = useState<{ original: TemperatureEvent | null } | null>(null);
  const [notice, setNotice] = useState('');
  const [basisEditing, setBasisEditing] = useState(false);
  const forecast = plan ? maturityForecast(plan, access.now) : null;
  const ingredients = plan ? calculateFormula(plan.formula).ingredients : null;
  const currentPhase = forecast?.phases.find(phase => Date.parse(phase.at) <= access.now && access.now < Date.parse(phase.endsAt!));

  return <div className="monitor-page">
    <PageHeading title="Reife-Monitor" description="Dein Teig im Blick. Vom Kneten bis zum Backen." />
    <section className="card monitor-sync">
      <MonitorStart access={access} showActiveSummary={false} />
      {!plan && !access.loadError && <p className="field-hint">Rezeptur und Gärphasen aus deinem Zeitplan übernehmen. Danach kannst du Temperaturen und freiwillige Checks ergänzen.</p>}
    </section>
    {plan && forecast && ingredients && !access.loadError && <>
      <section className={`card monitor-hero ${forecast.status === 'Möglicherweise überreif' ? 'monitor-caution' : ''}`} aria-label="Reifeeinschätzung">
        <div className="monitor-hero-heading">
          <span className="monitor-status-icon"><Icon name="dough" /></span>
          <div><p className="monitor-eyebrow">{currentPhase ? phaseNames[currentPhase.id] : access.now < Date.parse(forecast.phases[0].at) ? 'Vor dem Gärbeginn' : 'Backtermin erreicht'}</p>
            <h2>{forecast.status}</h2></div>
        </div>
        <div className="monitor-confidence"><span>Sicherheit: <strong>{forecast.certainty}</strong></span><span>Qualitative Einschätzung</span></div>
        <p className="monitor-bake"><Icon name="evening" /><span>Backtermin <time dateTime={plan.schedule.bakeAt}>{shortDate(plan.schedule.bakeAt)}</time></span></p>
        <div className="monitor-advice"><p className="monitor-eyebrow">Was du jetzt tun kannst</p><p>{forecast.recommendations[0]}</p>
          {forecast.recommendations.length > 1 && <ul>{forecast.recommendations.slice(1).map(reason => <li key={reason}>{reason}</li>)}</ul>}
        </div>
        <details className="monitor-explanation"><summary>Warum diese Einschätzung?</summary>
          <p>Der Zeitplan und deine Beobachtungen liefern Hinweise, keine exakte Messung. Die Stärke des Mehls lässt sich aus dem Namen allein nicht ableiten.</p>
          <ul>{forecast.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        </details>
      </section>

      <section className="monitor-phase-section" aria-labelledby="monitor-phases-title">
        <div className="monitor-section-heading"><h2 id="monitor-phases-title">Dein Gärverlauf</h2><Link className="text-link" to="/zeitplan">Zeitplan <Icon name="arrow" /></Link></div>
        <ol className="monitor-phases" aria-label="Geplante Gärphasen">
          {forecast.phases.map(phase => <li key={phase.id} aria-current={currentPhase?.id === phase.id ? 'step' : undefined}>
            <span className="monitor-phase-dot" aria-hidden="true" /><h3>{phaseNames[phase.id]}</h3>
            <p>{number((Date.parse(phase.endsAt!) - Date.parse(phase.at)) / 3600000)} Std. · {phase.temperatureC} °C</p>
            <small>{phase.state}</small>
          </li>)}
        </ol>
        <p className="monitor-caption">Geplanter Ablauf – kein gemessener Reifefortschritt. Termine werden nie automatisch geändert.</p>
      </section>

      <div className="monitor-layout">
        <section className="card monitor-checks" aria-labelledby="monitor-checks-title">
          <div className="monitor-section-heading"><h2 id="monitor-checks-title">Teig-Checks</h2><span className="monitor-tag">Freiwillig</span></div>
          <p className="monitor-caption">Kurz hinsehen, besser einschätzen. Jeder Check kann übersprungen werden.</p>
          <ol className="monitor-check-list">
            {checkSuggestions(plan).map((suggestion, index) => {
              const saved = plan.checks.find(check => check.slot === suggestion.slot);
              const due = !saved && Date.parse(suggestion.at) <= access.now;
              return <li key={suggestion.slot} className={due ? 'monitor-check-due' : ''}>
                <div className="monitor-check-row"><span className="monitor-check-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div><h3>{suggestion.slot === 'bulk' ? 'Stockgare prüfen' : suggestion.slot === 'piece' ? 'Stückgare prüfen' : 'Vor dem Backen'}</h3>
                    <time dateTime={suggestion.at}>{shortDate(suggestion.at)}</time>
                  </div><span className="monitor-check-state">{saved ? saved.skipped ? 'Übersprungen' : 'Erfasst' : due ? 'Jetzt optional' : 'Geplant'}</span>
                </div>
                {saved && !saved.skipped && <p className="monitor-observation">{[saved.volume && volumes[saved.volume], saved.surface && surfaces[saved.surface], saved.elasticity && elasticities[saved.elasticity]].filter(Boolean).join(' · ')}<br /><small>Beobachtet: {formatScheduleTime(saved.at)}</small></p>}
                {checkSlot === suggestion.slot ? <CheckEditor key={checkSlot} access={access} plan={plan} slot={checkSlot} close={saved => { setCheckSlot(null); setNotice(saved ? 'Check lokal gespeichert.' : ''); }} /> :
                  <button className="monitor-check-button" aria-label={saved ? 'Check korrigieren' : 'Check öffnen oder überspringen'} disabled={access.busy || basisEditing || !!checkSlot || !!temperature} onClick={() => { setNotice(''); setCheckSlot(suggestion.slot); }}>{saved ? 'Check korrigieren' : 'Check öffnen'}<Icon name="chevron" /></button>}
              </li>;
            })}
          </ol>
        </section>

        <section className="card monitor-measurements" aria-labelledby="monitor-temperatures-title">
          <div className="monitor-section-heading"><h2 id="monitor-temperatures-title">Gemessene Temperaturen</h2></div>
          <SharedTemperatures access={access} tiles disabled={!!checkSlot || !!temperature} onEditingChange={setBasisEditing} />
          <p className="monitor-caption">Teigtemperatur mit der TM5-Ansicht geteilt. Die Werte oben sind Basiswerte; spätere Messungen stehen im Verlauf.</p>
          {temperature ? <TemperatureEditor key={temperature.original?.id ?? 'new'} access={access} plan={plan} original={temperature.original} close={saved => { setTemperature(null); setNotice(saved ? 'Temperaturänderung lokal gespeichert.' : ''); }} /> :
            <button className="quiet monitor-event-button" disabled={access.busy || basisEditing || !!checkSlot} onClick={() => { setNotice(''); setTemperature({ original: null }); }}>Temperaturänderung erfassen</button>}
          {plan.temperatures.length > 0 && <details className="monitor-history"><summary>Temperaturverlauf ({plan.temperatures.length})</summary>
            <ul>{[...plan.temperatures].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map(event => <li key={event.id}>
              <div><strong>{event.kind === 'room' ? 'Raum' : event.kind === 'fridge' ? 'Kühlschrank' : 'Teig'} · {number(event.celsius)} °C</strong><time dateTime={event.at}>{shortDate(event.at)}</time></div>
              <button className="quiet" disabled={access.busy || basisEditing || !!checkSlot || !!temperature} onClick={() => { setNotice(''); setTemperature({ original: event }); }}>Korrigieren</button>
            </li>)}</ul>
          </details>}
        </section>
      </div>
      <details className="card monitor-recipe"><summary>Gespeicherte Rezeptur und Gärphasen</summary>
        <p>{plan.formula.flourProfile} · {number(ingredients.flour)} g Mehl · {plan.formula.hydration} % Hydration · {number(ingredients.salt)} g Salz</p>
        <p>{number(plan.yeastGrams)} g {plan.yeastKind === 'instant' ? 'Trockenhefe' : 'Frischhefe'} · {plan.formula.count} Teiglinge à {number(plan.formula.ballGrams)} g</p>
        <p>Backtermin: {formatScheduleTime(plan.schedule.bakeAt)}</p>
        {(['bulk', 'piece'] as const).map(group => <section key={group}><h3>{group === 'bulk' ? 'Stockgare – vor dem Portionieren' : 'Stückgare – nach dem Portionieren'}</h3><ul>{forecast.phases.filter(phase => phase.group === group).map(phase => <li key={phase.id}>{phaseNames[phase.id]}: {formatScheduleTime(phase.at)} bis {formatScheduleTime(phase.endsAt!)} · {number((Date.parse(phase.endsAt!) - Date.parse(phase.at)) / 3600000)} Std. · {phase.temperatureC} °C · {phase.state}</li>)}</ul></section>)}
      </details>
      {notice && <p role="status" className="save-status">{notice}</p>}
    </>}
  </div>;
}
