import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { createHashRouter, RouterProvider, Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Icon } from "../components/Icon";
import { calculateFormula, defaults, formulaIssues, ranges, type Formula, type NumericField } from "../core/dough/forno";
import { createFornoRepository, type FornoRepository, type EveningSummary } from "../infrastructure/storage/fornoRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import { PwaNotice } from "../infrastructure/pwa/PwaNotice";
import { PageHeading } from "../components/PageHeading";
import { SchedulePage, formatScheduleTime } from "./SchedulePage";
import { nextScheduleSteps, type SchedulePlan } from "../core/schedule/plan";
import { RecipesPage, PizzaEveningPage } from "./PizzaNightPages";
import { pizzaCount, type PizzaNightState } from "../core/pizzaNight/model";
import { ThermomixBatches } from "../components/ThermomixBatches";
import { MaturityCompact, MaturityPage, type MonitorAccess } from "./MaturityPage";
import type { CookAccess } from '../components/CookMode';
import type { CookSession } from '../core/dough/cookSession';
import type { MaturityState } from "../core/maturity/model";
import { EmptySessionHome, KnowledgePage, SessionIndex } from './ExperiencePages';
import { activeSession, type SessionState } from '../core/session/model';
import { legacySession } from '../core/session/migration';
import { sessionMonitor, type SessionAccess } from './sessionAccess';
import { DeviceSelect, SessionDashboard, SessionDetail, SessionPlanner, errorText } from './SessionPages';
const SessionCook = lazy(() => import('./SessionCook').then(module => ({default: module.SessionCook})));
import { ThemeSwitch } from "../components/ThemeSwitch";

const repository = createFornoRepository(createIndexedDbStore());
const number = (n: number, digits = 0) => new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(n);
type Loaded = Awaited<ReturnType<FornoRepository["load"]>>;
type Draft = Record<NumericField, string>;
const toDraft = (f: Formula): Draft => Object.fromEntries(Object.keys(ranges).map(key =>
  [key, String(f[key as NumericField]).replace(".", ",")])) as Draft;
const parse = (text: string) => /^\d+(?:[.,]\d+)?$/.test(text.trim()) ? Number(text.trim().replace(",", ".")) : NaN;

function Wordmark() {
  return <span className="wordmark"><span className="experience-wordmark">FORNO<span>.</span></span><span className="sr-only">by Marcel</span></span>;
}
function EveningDetails({ evening }: { evening: EveningSummary }) {
  return <div className="evening-details"><h3>{evening.name}</h3>
    <p className="date-line"><Icon name="evening" />{new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium", timeStyle: "short", timeZone: evening.timeZone,
    }).format(new Date(evening.bakeAt))}</p>
    <p className="muted">{number(evening.count)} Pizzen · {number(evening.ballGrams, 1)} g pro Teigling</p>
  </div>;
}
function Dashboard({ evening, formula, schedule, scheduleError, now, pizzaNight, pizzaNightError, monitoring }: {
  evening: EveningSummary | null; formula: Formula; schedule: SchedulePlan | null; scheduleError: string; now: number; pizzaNight: PizzaNightState | null; pizzaNightError: string; monitoring: MonitorAccess;
}) {
  const next = schedule ? nextScheduleSteps(schedule, now) : [];
  return <>
    <div className="welcome page-heading"><p className="eyebrow">Buongiorno, Marcel!</p>
      <h1>Deine Pizzaplanung<span className="accent-dot">.</span></h1>
      <p className="welcome-copy">Teig, Zeitplan und Pizzaabend – an einem Ort.</p>
      <span className="flourish" aria-hidden="true" /></div>
    <section className="card dashboard-focus" aria-labelledby="next-bake-title">
      <div className="dashboard-focus-heading"><span className="premium-icon"><Icon name="evening" /></span><div><p className="section-kicker" id="next-bake-title">Dein nächster Backtermin</p>
        <h2>{scheduleError ? 'Zeitplan prüfen' : schedule ? new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(schedule.bakeAt)) : 'Zeit für Pizza.'}</h2>
        {schedule && !scheduleError && <time dateTime={schedule.bakeAt}>{new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(schedule.bakeAt))} Uhr</time>}
      </div><Link className="icon-link" to="/zeitplan?legacy=1" aria-label="Backtermin öffnen"><Icon name="arrow" /></Link></div>
      {!schedule && !scheduleError && <Link className="text-link" to="/zeitplan?legacy=1">Backtermin planen <Icon name="arrow" /></Link>}
      <div className="dashboard-next"><span className="section-kicker">{scheduleError ? 'Hinweis' : next.length ? 'Als Nächstes geplant' : 'Deine Planung'}</span>
        <p>{scheduleError ? 'Gespeicherten Zeitplan prüfen.' : next.length ? next[0].label : schedule ? 'Backtermin erreicht. Zeitplan bei Bedarf aktualisieren.' : 'Lege deinen Backtermin fest und plane den Teig in Ruhe.'}</p>
      </div>
    </section>
    <MaturityCompact access={monitoring} />
    <div className="dashboard-grid">
      <section className="card plan-summary" aria-labelledby="current-plan-title">
        <div className="card-heading"><h2 id="current-plan-title"><Icon name="dough" />Aktuelle Teigplanung</h2>
          <Link className="edit-link" to="/teig?legacy=1" aria-label="Bearbeiten"><Icon name="edit" /><span>Bearbeiten</span></Link></div>
        <dl className="plan-values">
          <div><dt>Pizzen</dt><dd>{number(formula.count)}</dd></div>
          <div><dt>pro Teigling</dt><dd>{number(formula.ballGrams, Number.isInteger(formula.ballGrams) ? 0 : 1)}<span>g</span></dd></div>
          <div><dt>Hydration</dt><dd>{number(formula.hydration, Number.isInteger(formula.hydration) ? 0 : 1)}<span>%</span></dd></div>
        </dl>
        <p className="flour-note"><Icon name="wheat" />{formula.flourProfile}</p>
        <Link className="button primary calculator-cta" to="/teig?legacy=1"><Icon name="calculator" />Zum Teigrechner <Icon name="arrow" /></Link>
      </section>
      <Link to="/zeitplan?legacy=1" className={`card feature-card time-scene ${schedule || scheduleError ? "has-time-plan" : "no-time-plan"}`}>
        <img className="feature-photo" src={`${import.meta.env.BASE_URL}food/dough.webp`} alt="" width="710" height="800" loading="lazy" />
        <div className="feature-copy"><h2><Icon name="evening" />Zeitplan</h2>
          <p>Gärphasen und Arbeitsschritte im Überblick.</p>
          <span className="feature-status">{next.length ? `Geplant: ${formatScheduleTime(next[0].at)}` : scheduleError ? "Hinweis öffnen" : schedule ? "Zeitplan öffnen" : "Jetzt planen"}</span>
        </div><Icon name="chevron" />
      </Link>
      <Link to="/pizzaabend?legacy=1" className={`card feature-card evening-scene ${pizzaNight?.evening || pizzaNightError ? "has-current-evening" : ""}`}>
        <img className="feature-photo" src={`${import.meta.env.BASE_URL}food/pizza.webp`} alt="" width="710" height="800" loading="lazy" />
        <div className="feature-copy"><h2><Icon name="pizza" />Pizzaabend</h2>
          {pizzaNightError ? <p className="error">Lokale Daten prüfen.</p> : pizzaNight?.evening ? <p>{pizzaNight.evening.name} · {pizzaCount(pizzaNight.evening)} Pizzen<br />
            {scheduleError ? "Zeitplan nicht lesbar – bitte prüfen." : schedule ? formatScheduleTime(schedule.bakeAt) : "Noch kein Backtermin"}</p> : <span className="feature-status">Pizzaabend planen</span>}
        </div></Link>
    </div>
    <section className="quick-section" aria-labelledby="quick-title">
      <h2 className="section-label" id="quick-title">Schnellzugriff<span /></h2>
      <div className="quick-grid">
        <Link className="card quick-card" to="/rezepte?legacy=1"><Icon name="book" /><span>Rezepte</span></Link>
        <Link className="card quick-card" to="/teig?legacy=1#zutaten"><Icon name="sprout" /><span>Zutaten</span></Link>
        <Link to="/reife-monitor?legacy=1" className="card quick-card"><Icon name="trend" /><span>Reife-Monitor</span></Link>
        <Link to="/journal?legacy=1" className="card quick-card"><Icon name="journal" /><span>Mein Journal</span><small>In Vorbereitung</small></Link>
      </div>
    </section>
    {evening && <section className="card saved-evening"><div className="card-heading"><h2>Bisheriger Pizzaabend</h2></div>
      <EveningDetails evening={evening} /><p className="field-hint">Bisherige Daten bleiben erhalten und sind in deiner Sicherung enthalten. Dieser Abend kann hier noch nicht bearbeitet werden.</p><Link className="text-link" to="/pizzaabend?legacy=1">Zum Pizzaabend <Icon name="arrow" /></Link></section>}
  </>;
}

const fieldLabels: Record<NumericField, string> = {
  count: "Pizzaanzahl", ballGrams: "Teiglingsgewicht", hydration: "Hydration", salt: "Salz", yeastPercent: "Trockenhefe",
};
function Calculator({ formula, save, status, invalidChanged, monitoring, cooking }: {
  formula: Formula; save: (next: Formula) => void; status: string; invalidChanged: (invalid: boolean) => void; monitoring: MonitorAccess; cooking: CookAccess;
}) {
  const [draft, setDraft] = useState(() => toDraft(formula));
  const [flourDraft, setFlourDraft] = useState(formula.flourProfile);
  const candidate: Formula = { ...formula, flourProfile: flourDraft, ...Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, parse(value)])) };
  const issues = formulaIssues(candidate);
  const valid = !Object.keys(issues).length;
  useEffect(() => { invalidChanged(!valid); return () => invalidChanged(false); }, [valid, invalidChanged]);
  function change(key: NumericField, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    const nextFormula = { ...formula, flourProfile: flourDraft, ...Object.fromEntries(Object.entries(next).map(([field, text]) => [field, parse(text)])) };
    if (!Object.keys(formulaIssues(nextFormula)).length) save(nextFormula);
  }
  function field(key: NumericField, unit: string, large = false) {
    return <label className={`number-field ${large ? "large" : ""}`} htmlFor={key}>
      <span>{fieldLabels[key]}</span><span className="input-line"><input id={key} type="text"
        inputMode={key === "count" ? "numeric" : "decimal"} disabled={monitoring.editing} value={draft[key]}
        aria-invalid={!!issues[key]} aria-describedby={issues[key] ? `${key}-error` : undefined}
        autoComplete="off" spellCheck={false} onChange={e => change(key, e.target.value)} />
        <span className="unit">{unit}</span></span>
      {issues[key] && <small className="error" id={`${key}-error`}>{issues[key]}</small>}
    </label>;
  }
  const result = valid ? calculateFormula(candidate) : null;
  return <>
    <PageHeading title="Teigrechner" description="Stimme deine Rezeptur ab. Die Zutatenmengen passen sich direkt an." />
    <div className="calculator-layout">
    <section className="card calculator" aria-label="Teig einstellen">
      <div className="card-heading"><h2>Deine Rezeptur</h2><span className="section-kicker">01 · Einstellen</span></div>
      <div className="quantity-grid">{field("count", "Pizzen", true)}{field("ballGrams", "g", true)}</div>
      <div className="hydration-field">{field("hydration", "%")}
        <input className="hydration-slider" type="range" disabled={monitoring.editing} aria-label="Hydration per Schieberegler"
          min="40" max="100" step="0.1" value={Number.isFinite(candidate.hydration) ? Math.min(100, Math.max(40, candidate.hydration)) : 66}
          onChange={e => change("hydration", e.target.value)} />
        <div className="range-labels"><span>40 %</span><span>100 %</span></div></div>
      <label className="flour-field" htmlFor="flour">Dein Mehl<input id="flour" disabled={monitoring.editing} value={flourDraft}
        aria-invalid={!!issues.flourProfile} aria-describedby={issues.flourProfile ? "flour-error" : undefined}
        maxLength={80} onChange={e => {
          setFlourDraft(e.target.value);
          const next = { ...candidate, flourProfile: e.target.value };
          if (!Object.keys(formulaIssues(next)).length) save(next);
        }} />{issues.flourProfile && <small className="error" id="flour-error">{issues.flourProfile}</small>}</label>
      <details className="pro"><summary>Salz und Trockenhefe</summary>
        <p className="muted">Beide Anteile beziehen sich auf die Mehlmenge.</p><div className="quantity-grid">{field("salt", "%")}{field("yeastPercent", "%")}</div>
      </details>
    </section>
    <section className="card ingredients" id="zutaten" tabIndex={-1} aria-label="Deine Zutaten">
      <div className="card-heading"><h2>Zutaten</h2><span className="section-kicker">02 · Abwiegen</span></div>
      {result ? <><dl>{([ ["Mehl", result.ingredients.flour, 1], ["Wasser", result.ingredients.water, 1],
        ["Salz", result.ingredients.salt, 2], ["Trockenhefe", result.ingredients.yeast, 2] ] as const).map(([label, amount, digits]) =>
        <div key={label}><dt>{label}</dt><dd>{label === "Trockenhefe" && amount > 0 && amount < .01 ? "< 0,01" : number(amount, digits)} <span>g</span></dd></div>)}</dl>
        <div className="total"><span>Gesamtteig</span><strong>{number(candidate.count * candidate.ballGrams)} <span>g</span></strong></div>
        <p className="precision-note">Für Trockenhefe eine Feinwaage verwenden. Mengen sind für die Anzeige gerundet.</p></>
        : <p role="status" className="error">Bitte korrigiere die markierten Eingaben. Es werden keine ungültigen Mengen berechnet oder gespeichert.</p>}
    </section>
    </div>
    {result && <ThermomixBatches cook={cooking} ingredients={result.ingredients} access={{...monitoring, formula:candidate}} />}
    <p className={`save-status ${status.includes("fehlgeschlagen") ? "error" : "muted"}`} role="status">{status}</p>
  </>;
}
function Placeholder({ kind }: { kind: "journal" }) {
  const content = {
    journal: { title: "Mein Journal", subtitle: "Platz für deine Pizza-Erfahrungen.", heading: "In Vorbereitung", text: "Eine Journalansicht ist noch nicht verfügbar. Bisherige persönliche Daten bleiben erhalten und sind in deiner Sicherung enthalten.", icon: "journal" },
  } as const;
  const c = content[kind];
  return <>
    <PageHeading title={c.title} description={c.subtitle} />
    <section className={`card coming-soon ${kind}-scene`}><div className="feature-emblem"><Icon name={c.icon} /></div>
      <span className="availability">In Vorbereitung</span><h2>{c.heading}</h2><p className="muted">{c.text}</p>
      <Link to="/teig" className="button primary">Zum Teigrechner <Icon name="arrow" /></Link>
    </section>
  </>;
}
function Settings({ hasLegacy, busy, backup, sessions }: { hasLegacy: boolean; busy: boolean; backup: () => Promise<void>; sessions?: SessionAccess }) {
  const [deviceError,setDeviceError] = useState('');
  return <><PageHeading title="Einstellungen" description="Deine Daten. Dein Gerät. Deine Pizzaplanung." />
    <div className="settings-grid">{sessions && <section className="card settings-card"><h2>Dein Zubereitungsgerät</h2><DeviceSelect value={sessions.state.defaultDevice} disabled={busy} change={device=>{setDeviceError('');void sessions.run(()=>sessions.repository.device(device)).catch(e=>setDeviceError(errorText(e)))}}/><p className="field-hint">Standard für neue Sessions. Vorbereitete Sessions übernehmen die Auswahl; begonnene Rezepturen behalten ihr Gerät.</p>{deviceError&&<p role="alert" className="error">{deviceError}</p>}</section>}<section className="card settings-card theme-settings"><div className="card-heading"><h2>Darstellung</h2></div>
      <p className="muted">Hell, dunkel oder automatisch passend zu deinem Gerät. Deine Auswahl bleibt auf diesem Gerät gespeichert.</p><ThemeSwitch />
    </section><section className="card settings-card"><div className="card-heading"><Icon name="download" /><h2>Daten & Sicherung</h2></div>
      <p>Deine Daten bleiben in diesem Browser. Sichere sie regelmäßig, bevor du Browserdaten löschst.</p>
      <p className="muted">Die vollständige Sicherung enthält auch bisherige persönliche Rezepte, Profile und Pizzaabende. Eine Wiederherstellung ist in dieser App-Version nicht verfügbar.</p>
      {hasLegacy && <p className="muted">Bisherige Daten sind vorhanden. Alte Rezepturen, die nicht dargestellt werden können, bleiben unverändert erhalten.</p>}
      <button className="button primary" onClick={() => void backup()} disabled={busy}><Icon name="download" />Sicherung herunterladen</button>
    </section><section className="card settings-card"><div className="card-heading"><Icon name="phone" /><h2>Immer dabei</h2></div>
      <p>Nach dem ersten vollständigen Laden ist FORNO. auch offline nutzbar.</p>
      <p className="muted">Auf dem iPhone: Safari öffnen → Teilen → Zum Home-Bildschirm. Die App speichert deine gültigen Teigeingaben automatisch auf diesem Gerät.</p>
      <span className="local-label"><span aria-hidden="true" />Lokal. Ohne Konto.</span>
    </section></div></>;
}

function LegacyAdoption({access,data}:{access:SessionAccess;data:Loaded}){
  const [error,setError]=useState(''),[preview,setPreview]=useState<ReturnType<typeof legacySession>|null>(null);
  return <div className="legacy-adoption"><button disabled={access.busy} onClick={()=>{try{setPreview(legacySession(data,access.state.defaultDevice));setError('')}catch(e){setError(errorText(e))}}}>Bisherige Planung übernehmen</button>{preview&&<div><h3>Übernahme als neue Session</h3><p>{preview.session.monitor.formula.count} Pizzen · {formatScheduleTime(preview.session.monitor.schedule.bakeAt)}</p><ul>{preview.warnings.map(w=><li key={w}>{w}</li>)}</ul><div className="p3-actions"><button className="primary" disabled={access.busy} onClick={()=>{void access.run(()=>access.repository.create(preview.session,access.state.activeId,true)).catch(e=>setError(errorText(e)))}}>Übernahme ausdrücklich speichern</button><button disabled={access.busy} onClick={()=>setPreview(null)}>Abbrechen</button></div></div>}{error&&<p role="alert" className="error">{error}</p>}</div>;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="app-content"><h1>Ansicht nicht verfügbar</h1>
    <p>Die Ansicht konnte nicht geladen werden. Deine gespeicherten Daten bleiben erhalten.</p>
    <button onClick={() => window.location.reload()}>Erneut laden</button></main> : this.props.children; }
}
function Workspace({ repo }: { repo: FornoRepository }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Auf diesem Gerät gespeichert.");
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [monitorEditing, setMonitorEditing] = useState(false);
  const [now, setNow] = useState(Date.now);
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    let active = true;
    void repo.load().then(value => { if (active) { setData(value); setStatus(value.copied ? "Bisherige Rezeptur als Kopie übernommen." : "Wird bei Änderungen automatisch gespeichert."); } })
      .catch(e => { if (active) setError(String(e.message)); });
    return () => { active = false; };
  }, [repo]);
  useEffect(() => {
    const titles: Record<string, string> = { "/": "Home", "/teig": "Teig", "/zeitplan": "Zeitplan", "/pizzaabend": "Pizzaabend", "/rezepte": "Rezepte", "/einstellungen": "Einstellungen", "/reife-monitor": "Reife-Monitor", "/sessions": "Sessions", "/wissen": "Wissen", "/session": "Pizza-Session", "/session/planen": "Pizza-Session planen", "/kochen": "Guided Cooking", "/journal": "Mein Journal" };
    document.title = `${titles[location.pathname] ?? "Seite nicht gefunden"} · FORNO. by Marcel`;
    const target = location.hash === "#zutaten" ? document.getElementById("zutaten") : null;
    (target ?? main.current)?.focus();
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.hash, !!data]);
  function save(formula: Formula) {
    if (!data) return;
    setData(previous => previous ? { ...previous, formula } : previous);
    setBusy(true); setStatus("Wird gespeichert …");
    const current = ++revision.current;
    queue.current = queue.current.catch(() => {}).then(() => repo.save(formula)).then(() => {
      if (revision.current === current) { setBusy(false); setStatus("Auf diesem Gerät gespeichert."); }
    }, () => { if (revision.current === current) { setBusy(false); setStatus("Speichern fehlgeschlagen. Änderung erneut versuchen; Browser-Speicher prüfen."); } });
  }
  async function saveTimePlan(plan: SchedulePlan) {
    setBusy(true);
    const current = ++revision.current;
    const task = queue.current.catch(() => {}).then(() => repo.saveSchedule(plan));
    queue.current = task.then(() => {}, () => {});
    try {
      await task;
      setData(previous => previous ? { ...previous, schedule: plan, scheduleError: "" } : previous);
      setNow(Date.now());
      if (revision.current === current) setStatus("Auf diesem Gerät gespeichert.");
    } finally { if (revision.current === current) setBusy(false); }
  }
  async function deleteTimePlan(expected: SchedulePlan) {
    setBusy(true); const current = ++revision.current;
    const task = queue.current.catch(() => {}).then(() => repo.deleteSchedule(expected));
    queue.current = task.then(() => {}, () => {});
    try {
      await task;
      setData(previous => previous ? { ...previous, schedule: null, scheduleError: '' } : previous);
      setNow(Date.now());
    } finally { if (revision.current === current) setBusy(false); }
  }
  async function runPizza(task: () => Promise<PizzaNightState>) {
    if (!data || data.pizzaNightError) throw Error("Pizzaabend-/Rezeptdaten sind schreibgeschützt.");
    setBusy(true);
    const current = ++revision.current;
    const operation = queue.current.catch(() => {}).then(task);
    queue.current = operation.then(() => {}, () => {});
    try {
      const pizzaNight = await operation;
      setData(previous => previous ? { ...previous, pizzaNight, pizzaNightError: "" } : previous);
    } finally { if (revision.current === current) setBusy(false); }
  }
  async function runMaturity(task: () => Promise<MaturityState>) {
    if (!data || data.maturityError) throw Error("Reifemonitor-Daten sind schreibgeschützt.");
    setBusy(true); const current = ++revision.current;
    const operation = queue.current.catch(() => {}).then(task); queue.current = operation.then(() => {}, () => {});
    try { const maturity = await operation; setData(previous => previous ? { ...previous, maturity, maturityError: "" } : previous); setNow(Date.now()); }
    finally { if (revision.current === current) setBusy(false); }
  }
  async function runCook(task: () => Promise<CookSession>) {
    if (!data || data.cookError) throw Error('Kochfortschritt ist schreibgeschützt.');
    setBusy(true); const current = ++revision.current;
    const operation = queue.current.catch(() => {}).then(task); queue.current = operation.then(() => {}, () => {});
    try { const cookSession = await operation; setData(previous => previous ? { ...previous, cookSession, cookError: '' } : previous); }
    finally { if (revision.current === current) setBusy(false); }
  }
  async function runSessions(task: () => Promise<SessionState>) {
    if (!data?.sessions || data.sessionError) throw Error('Session-Daten sind schreibgeschützt.');
    setBusy(true); const current=++revision.current;
    const operation=queue.current.catch(()=>{}).then(task);queue.current=operation.then(()=>{},()=>{});
    try {const sessions=await operation;setData(previous=>previous?{...previous,sessions,sessionError:''}:previous);setNow(Date.now());}
    finally{if(revision.current===current)setBusy(false)}
  }
  const canonical=activeSession(data?.sessions);
  const sessions:SessionAccess|null=data?.sessions?{state:data.sessions,session:canonical,repository:repo.sessions,busy,now,run:runSessions,editingChanged:setMonitorEditing}:null;
  const legacyMode=new URLSearchParams(location.search).get('legacy')==='1';
  const useSession=!!canonical&&!legacyMode;
  const cooking: CookAccess = { session: data?.cookSession ?? null, error: data?.cookError ?? '', repository: repo.cook, run: runCook };
  const monitoring: MonitorAccess = { state: data?.maturity ?? null, loadError: data?.maturityError ?? "", repository: repo.maturity,
    busy, editing: monitorEditing, run: runMaturity, editingChanged: setMonitorEditing, formula: data?.formula ?? defaults,
    schedule: data?.schedule ?? null, scheduleError: data?.scheduleError ?? "", now };
  const currentMonitor=useSession&&sessions?sessionMonitor(sessions):monitoring;
  const currentSchedule=useSession?(canonical!.scheduleRemoved?null:canonical!.monitor.schedule):data?.schedule??null;
  const currentFormula=useSession?canonical!.monitor.formula:data?.formula??defaults;
  const currentScheduleError=useSession?'':data?.scheduleError??'';
  const legacyNotice=data?.evening?<section className="card saved-evening"><h2>Bisheriger Pizzaabend</h2><EveningDetails evening={data.evening}/><p className="field-hint">Altbestand bleibt in deiner Sicherung erhalten.</p></section>:null;
  async function backup() {
    try {
      await queue.current;
      const blob = new Blob([JSON.stringify(await repo.backup(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = "forno-sicherung.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("Sicherung konnte nicht erstellt werden. Bitte erneut versuchen."); }
  }
  return <div className={`app-shell experience ${['/kochen','/session/planen'].includes(location.pathname)||(!canonical&&!legacyMode&&['/teig','/zeitplan'].includes(location.pathname))?'focus-mode':''}`}>
    <a className="skip-link" href="#content" onClick={e => { e.preventDefault(); main.current?.focus(); }}>Zum Inhalt</a>
    <header className="app-header"><Link className="brand-link" to="/" aria-label="FORNO. Home"><Wordmark /></Link>{legacyMode&&<ThemeSwitch/>}<Link className="settings-link" to="/einstellungen" aria-label="Einstellungen"><Icon name="settings" /></Link></header>
    <main id="content" className="app-content" ref={main} tabIndex={-1}>
      {error && <div className="card error" role="alert"><p>{error}</p>
        <button onClick={() => window.location.reload()}>Erneut laden</button></div>}
      {data?.sessionError && <p className="card error" role="alert">{data.sessionError} <Link to="/einstellungen">Zur Sicherung</Link></p>}
      {!data ? !error && <div className="loading-state" role="status"><Icon name="dough" /><p>Deine Daten werden geladen …</p><small>Lokale Planung wird geöffnet.</small></div> : <Routes>
        <Route path="/" element={!legacyMode&&sessions?<>{canonical?<SessionDashboard access={sessions} legacy={legacyNotice}/>:<><EmptySessionHome/>{data.schedule&&!data.scheduleError&&!sessions.state.legacyAdopted&&<section className="card"><LegacyAdoption access={sessions} data={data}/></section>}</>}</>:<Dashboard evening={data.evening} formula={data.formula} schedule={data.schedule} scheduleError={data.scheduleError} now={now} pizzaNight={data.pizzaNight} pizzaNightError={data.pizzaNightError} monitoring={monitoring}/>} />
        <Route path="/teig" element={useSession&&sessions?<SessionDetail access={sessions} view="recipe"/>:!legacyMode&&sessions?<SessionPlanner access={sessions} initialFormula={data.formula} initialSchedule={data.schedule}/>:<Calculator formula={data.formula} save={save} status={status} invalidChanged={setInvalid} monitoring={monitoring} cooking={cooking} />} />
        <Route path="/zeitplan" element={useSession&&sessions?<SessionDetail access={sessions} view="timeline"/>:!legacyMode&&sessions?<SessionPlanner access={sessions} initialFormula={data.formula} initialSchedule={data.schedule}/>:<SchedulePage saved={data.schedule} loadError={data.scheduleError} save={saveTimePlan} remove={deleteTimePlan} hasMonitor={!!data.maturity?.activeId} busy={busy} now={now} editingChanged={setInvalid} />} />
        <Route path="/pizzaabend" element={<PizzaEveningPage saved={data.pizzaNight} loadError={data.pizzaNightError} repository={repo.pizzaNight} busy={busy} run={runPizza} editingChanged={setInvalid} hasLegacy={data.hasLegacy}
          doughCount={currentFormula.count} schedule={currentSchedule} scheduleError={currentScheduleError}
          legacyEvening={data.evening && <section className="card saved-evening"><h2>Bisheriger Pizzaabend</h2><EveningDetails evening={data.evening} /><p className="field-hint">Dieser bisherige Abend bleibt unverändert erhalten und ist in deiner Sicherung enthalten. Er kann hier noch nicht bearbeitet werden.</p></section>} />} />
        <Route path="/rezepte" element={<RecipesPage saved={data.pizzaNight} loadError={data.pizzaNightError} repository={repo.pizzaNight} busy={busy} run={runPizza} editingChanged={setInvalid} hasLegacy={data.hasLegacy} />} />
        <Route path="/reife-monitor" element={<>{useSession&&canonical&&<details className="session-monitor-source"><summary>Aktive Session · {canonical.name}</summary><Link className="text-link" to="/session">Session öffnen</Link><p className="field-hint">{canonical.actual.bulk?`Stockgare tatsächlich gestartet: ${formatScheduleTime(canonical.actual.bulk)}`:"Stockgare noch nicht tatsächlich gestartet. Zeitbogen zeigt ausschließlich den Plan."} {canonical.completed&&"Session abgeschlossen; weitere Messungen sind gesperrt."}</p></details>}<MaturityPage access={currentMonitor} /></>} />
        <Route path="/sessions" element={sessions?<SessionIndex access={sessions}/>:<p className="error">Session-Daten nicht lesbar. Bitte unter Einstellungen sichern.</p>}/>
        <Route path="/wissen" element={<KnowledgePage/>}/>
        <Route path="/session/planen" element={sessions?<SessionPlanner key={`planner-${location.search}`} access={sessions} initialFormula={data.formula} initialSchedule={data.schedule}/>:<p>Session-Daten sind nicht verfügbar. Bitte Sicherung herunterladen.</p>}/>
        <Route path="/session" element={canonical&&sessions?<SessionDetail access={sessions}/>:<section className="card"><h1>Deine Pizza-Session</h1><p>Noch keine aktive Session.</p><Link className="button primary" to="/session/planen">Pizza-Session planen</Link></section>}/>
        <Route path="/kochen" element={canonical&&sessions?<Suspense fallback={<p role="status">Kochmodus wird geöffnet …</p>}><SessionCook access={sessions}/></Suspense>:<section className="card"><h1>Zuerst eine Session planen</h1><Link className="button primary" to="/session/planen">Pizza-Session planen</Link></section>}/>
        <Route path="/journal" element={<Placeholder kind="journal" />} />
        <Route path="/einstellungen" element={<Settings hasLegacy={data.hasLegacy} busy={busy} backup={backup} sessions={sessions??undefined} />} />
        <Route path="*" element={<><PageHeading title="Seite nicht gefunden" description="Diese Adresse ist nicht verfügbar." /><Link className="button" to="/">Zum Dashboard</Link></>} />
      </Routes>}
      <footer className="app-footer">{legacyMode&&<p><Link to="/?legacy=1">Bisherige Startseite</Link> · <Link to="/teig?legacy=1">Bisheriger Rechner / TM5</Link> · <Link to="/zeitplan?legacy=1">Bisheriger Zeitplan</Link> · <Link to="/reife-monitor?legacy=1">Bisheriger Monitor</Link> · <Link to="/pizzaabend?legacy=1">Bisheriger Pizzaabend</Link> · <Link to="/rezepte?legacy=1">Bisherige Belagrezepte</Link></p>}<p><span className="local-dot" aria-hidden="true" />Lokal gespeichert. Mit Liebe gemacht.</p>
        <Link to="/einstellungen" className="text-link">Daten & Offline <Icon name="chevron" /></Link><PwaNotice busy={busy || invalid || monitorEditing} />
        {!data && error && <button onClick={() => void backup()} disabled={busy}>Sicherung herunterladen</button>}
      </footer>
    </main>
    <nav className={`floating-dock ${legacyMode?'legacy-dock':''}`} aria-label="Hauptnavigation">
      {([ ["/", "Start", "home"], ["/sessions", "Sessions", "evening"], ["/rezepte", "Rezepte", "book"], ["/wissen", "Wissen", "journal"] ] as const).map(([to, label, icon]) =>
        <NavLink key={to} to={to} end><Icon name={icon} /><span>{label}</span></NavLink>)}
    </nav>
  </div>;
}
export function App({ repo = repository }: { repo?: FornoRepository }) {
  const [router, setRouter] = useState<ReturnType<typeof createHashRouter> | null>(null);
  useEffect(() => {
    const next = createHashRouter([{ path: "*", element: <Workspace repo={repo} /> }]);
    setRouter(next);
    return () => next.dispose();
  }, [repo]);
  return <ErrorBoundary>{router ? <RouterProvider router={router} /> : <div className="loading-state" role="status"><p>FORNO. wird geladen …</p></div>}</ErrorBoundary>;
}
