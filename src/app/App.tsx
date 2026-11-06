import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Icon } from "../components/Icon";
import { calculateFormula, formulaIssues, ranges, type Formula, type NumericField } from "../core/dough/forno";
import { createFornoRepository, type FornoRepository, type EveningSummary } from "../infrastructure/storage/fornoRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import { PwaNotice } from "../infrastructure/pwa/PwaNotice";

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
  return <img className="wordmark" src={`${import.meta.env.BASE_URL}brand/forno-header.png`} alt="" width={576} height={192} />;
}
function PageHeading({ title, description }: { title: string; description: string }) {
  return <div className="page-heading"><h1>{title}</h1><p className="muted">{description}</p></div>;
}
function FeatureCard({ to, icon, title, description, scene }: {
  to: string; icon: "clock" | "pizza"; title: string; description: string; scene: string;
}) {
  return <Link to={to} className={`card feature-card ${scene}`}>
    <Icon name={icon} /><div><h2>{title}</h2><p>{description}</p>
      <span className="feature-status">In Vorbereitung</span></div><Icon name="chevron" />
  </Link>;
}
function EveningDetails({ evening }: { evening: EveningSummary }) {
  return <div className="evening-details"><h3>{evening.name}</h3>
    <p className="date-line"><Icon name="evening" />{new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium", timeStyle: "short", timeZone: evening.timeZone,
    }).format(new Date(evening.bakeAt))}</p>
    <p className="muted">{number(evening.count)} Pizzen · {number(evening.ballGrams, 1)} g pro Teigling</p>
  </div>;
}
function Dashboard({ evening, formula }: { evening: EveningSummary | null; formula: Formula }) {
  return <>
    <div className="welcome page-heading"><p className="eyebrow">Buongiorno, Marcel!</p>
      <h1>Deine Pizzaplanung<span className="accent-dot">.</span></h1>
      <p className="welcome-copy">Teig, Zeitplan, Rezepte und dein<br className="mobile-break" /> perfekter Pizzaabend – alles an einem Ort.</p>
      <span className="flourish" aria-hidden="true" /></div>
    <div className="dashboard-grid">
      <section className="card plan-summary" aria-labelledby="current-plan-title">
        <div className="card-heading"><h2 id="current-plan-title"><Icon name="dough" />Aktuelle Teigplanung</h2>
          <Link className="edit-link" to="/teig"><Icon name="edit" /><span>Bearbeiten</span></Link></div>
        <dl className="plan-values">
          <div><dt>Pizzen</dt><dd>{number(formula.count)}</dd></div>
          <div><dt>pro Teigling</dt><dd>{number(formula.ballGrams, Number.isInteger(formula.ballGrams) ? 0 : 1)}<span>g</span></dd></div>
          <div><dt>Hydration</dt><dd>{number(formula.hydration, Number.isInteger(formula.hydration) ? 0 : 1)}<span>%</span></dd></div>
        </dl>
        <p className="flour-note"><Icon name="wheat" />{formula.flourProfile}</p>
        <Link className="button primary calculator-cta" to="/teig"><Icon name="calculator" />Zum Teigrechner <Icon name="arrow" /></Link>
      </section>
      <FeatureCard to="/zeitplan" icon="clock" title="Zeitplan" description="Teigzeiten, Reife und Backfenster." scene="time-scene" />
      <FeatureCard to="/pizzaabend" icon="pizza" title="Pizzaabend" description="Dein nächster gemeinsamer Abend." scene="evening-scene" />
    </div>
    <section className="quick-section" aria-labelledby="quick-title">
      <h2 className="section-label" id="quick-title">Schnellzugriff<span /></h2>
      <div className="quick-grid">
        <Link className="card quick-card" to="/rezepte"><Icon name="book" /><span>Rezepte</span><small>In Vorbereitung</small></Link>
        <Link className="card quick-card" to="/teig#zutaten"><Icon name="sprout" /><span>Zutaten</span></Link>
        <div className="card quick-card unavailable"><Icon name="evening" /><span>Reife-Monitor</span><small>In Vorbereitung</small></div>
        <div className="card quick-card unavailable"><Icon name="journal" /><span>Mein Journal</span><small>In Vorbereitung</small></div>
      </div>
    </section>
    {evening && <section className="card saved-evening"><div className="card-heading"><h2>Dein gespeicherter Pizzaabend</h2></div>
      <EveningDetails evening={evening} /><Link className="text-link" to="/pizzaabend">Zum Pizzaabend <Icon name="arrow" /></Link></section>}
  </>;
}

const fieldLabels: Record<NumericField, string> = {
  count: "Pizzaanzahl", ballGrams: "Teiglingsgewicht", hydration: "Hydration", salt: "Salz", yeastPercent: "Trockenhefe",
};
function Calculator({ formula, save, status, invalidChanged }: {
  formula: Formula; save: (next: Formula) => void; status: string; invalidChanged: (invalid: boolean) => void;
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
        inputMode={key === "count" ? "numeric" : "decimal"} value={draft[key]}
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
      <div className="card-heading"><h2>Deine Rezeptur</h2></div>
      <div className="quantity-grid">{field("count", "Pizzen", true)}{field("ballGrams", "g", true)}</div>
      <div className="hydration-field">{field("hydration", "%")}
        <input className="hydration-slider" type="range" aria-label="Hydration per Schieberegler"
          min="40" max="100" step="0.1" value={Number.isFinite(candidate.hydration) ? Math.min(100, Math.max(40, candidate.hydration)) : 66}
          onChange={e => change("hydration", e.target.value)} />
        <div className="range-labels"><span>40 %</span><span>100 %</span></div></div>
      <label className="flour-field" htmlFor="flour">Dein Mehl<input id="flour" value={flourDraft}
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
      <div className="card-heading"><h2>Zutaten</h2></div>
      {result ? <><dl>{([ ["Mehl", result.ingredients.flour, 1], ["Wasser", result.ingredients.water, 1],
        ["Salz", result.ingredients.salt, 2], ["Trockenhefe", result.ingredients.yeast, 2] ] as const).map(([label, amount, digits]) =>
        <div key={label}><dt>{label}</dt><dd>{label === "Trockenhefe" && amount > 0 && amount < .01 ? "< 0,01" : number(amount, digits)} <span>g</span></dd></div>)}</dl>
        <div className="total"><span>Gesamtteig</span><strong>{number(candidate.count * candidate.ballGrams)} <span>g</span></strong></div>
        <p className="precision-note">Für Trockenhefe eine Feinwaage verwenden. Mengen sind für die Anzeige gerundet.</p></>
        : <p role="status" className="error">Bitte korrigiere die markierten Eingaben. Es werden keine ungültigen Mengen berechnet oder gespeichert.</p>}
    </section>
    </div>
    <p className={`save-status ${status.includes("fehlgeschlagen") ? "error" : "muted"}`} role="status">{status}</p>
  </>;
}
function Placeholder({ kind, evening }: { kind: "time" | "evening" | "recipes"; evening?: EveningSummary | null }) {
  const content = {
    time: { title: "Zeitplan", subtitle: "Guter Teig braucht seine Zeit.", heading: "Vom ersten Kneten bis zum letzten Bissen.", text: "Die detaillierte Zeitplanung ist noch nicht verfügbar. Deine Rezeptur kannst du bereits im Teigrechner abstimmen.", icon: "clock" },
    evening: { title: "Pizzaabend", subtitle: "Die besten Abende beginnen mit Pizza.", heading: "Ein Tisch. Gute Freunde. Deine Pizza.", text: "Die Verwaltung von Pizzaabenden und Belagrezepten ist noch nicht verfügbar. Deine bisherigen Daten bleiben erhalten.", icon: "pizza" },
    recipes: { title: "Rezepte", subtitle: "Ein Stück Italien für deinen Tisch.", heading: "Platz für deine Lieblingspizza.", text: "Eine Rezeptansicht ist in dieser App-Version noch nicht verfügbar. Bereits gespeicherte persönliche Rezepte bleiben erhalten und sind in deiner Datensicherung enthalten.", icon: "book" },
  } as const;
  const c = content[kind];
  return <>
    <PageHeading title={c.title} description={c.subtitle} />
    <section className={`card coming-soon ${kind}-scene`}><div className="feature-emblem"><Icon name={c.icon} /></div>
      <span className="availability">In Vorbereitung</span><h2>{c.heading}</h2><p className="muted">{c.text}</p>
      <Link to="/teig" className="button primary">Zum Teigrechner <Icon name="arrow" /></Link>
    </section>
    {evening && <section className="card saved-evening"><div className="card-heading"><h2>Bereits gespeichert</h2></div><EveningDetails evening={evening} /></section>}
  </>;
}
function Settings({ hasLegacy, busy, backup }: { hasLegacy: boolean; busy: boolean; backup: () => Promise<void> }) {
  return <><PageHeading title="Einstellungen" description="Deine Daten. Dein Gerät. Deine Pizzaplanung." />
    <div className="settings-grid"><section className="card settings-card"><div className="card-heading"><Icon name="download" /><h2>Daten & Sicherung</h2></div>
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
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    void repo.load().then(value => { if (active) { setData(value); setStatus(value.copied ? "Bisherige Rezeptur als Kopie übernommen." : "Wird bei Änderungen automatisch gespeichert."); } })
      .catch(e => { if (active) setError(String(e.message)); });
    return () => { active = false; };
  }, [repo]);
  useEffect(() => {
    const titles: Record<string, string> = { "/": "Home", "/teig": "Teig", "/zeitplan": "Zeitplan", "/pizzaabend": "Pizzaabend", "/rezepte": "Rezepte", "/einstellungen": "Einstellungen" };
    document.title = `${titles[location.pathname] ?? "Seite nicht gefunden"} · FORNO. by Marcel`;
    const target = location.hash === "#zutaten" ? document.getElementById("zutaten") : null;
    (target ?? main.current)?.focus();
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.hash, !!data]);
  function save(formula: Formula) {
    if (!data) return;
    setData({ ...data, formula });
    setBusy(true); setStatus("Wird gespeichert …");
    const current = ++revision.current;
    queue.current = queue.current.catch(() => {}).then(() => repo.save(formula)).then(() => {
      if (revision.current === current) { setBusy(false); setStatus("Auf diesem Gerät gespeichert."); }
    }, () => { if (revision.current === current) { setBusy(false); setStatus("Speichern fehlgeschlagen. Änderung erneut versuchen; Browser-Speicher prüfen."); } });
  }
  async function backup() {
    try {
      await queue.current;
      const blob = new Blob([JSON.stringify(await repo.backup(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = "forno-sicherung.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("Sicherung konnte nicht erstellt werden. Bitte erneut versuchen."); }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#content" onClick={e => { e.preventDefault(); main.current?.focus(); }}>Zum Inhalt</a>
    <header className="app-header"><Link to="/" aria-label="FORNO. Home"><Wordmark /></Link><Link className="settings-link" to="/einstellungen" aria-label="Einstellungen"><Icon name="settings" /></Link></header>
    <main id="content" className="app-content" ref={main} tabIndex={-1}>
      {error && <div className="card error" role="alert"><p>{error}</p>
        <button onClick={() => window.location.reload()}>Erneut laden</button></div>}
      {!data ? !error && <p role="status">Deine Daten werden geladen …</p> : <Routes>
        <Route path="/" element={<Dashboard evening={data.evening} formula={data.formula} />} />
        <Route path="/teig" element={<Calculator formula={data.formula} save={save} status={status} invalidChanged={setInvalid} />} />
        <Route path="/zeitplan" element={<Placeholder kind="time" />} />
        <Route path="/pizzaabend" element={<Placeholder kind="evening" evening={data.evening} />} />
        <Route path="/rezepte" element={<Placeholder kind="recipes" />} />
        <Route path="/einstellungen" element={<Settings hasLegacy={data.hasLegacy} busy={busy} backup={backup} />} />
        <Route path="*" element={<><PageHeading title="Seite nicht gefunden" description="Diese Adresse ist nicht verfügbar." /><Link className="button" to="/">Zum Dashboard</Link></>} />
      </Routes>}
      <footer className="app-footer"><p><span className="local-dot" aria-hidden="true" />Lokal gespeichert. Mit Liebe gemacht.</p>
        <Link to="/einstellungen" className="text-link">Daten & Offline <Icon name="chevron" /></Link><PwaNotice busy={busy || invalid} />
        {!data && error && <button onClick={() => void backup()} disabled={busy}>Sicherung herunterladen</button>}
      </footer>
    </main>
    <nav className="floating-dock" aria-label="Hauptnavigation">
      {([ ["/", "Home", "home"], ["/teig", "Teig", "dough"], ["/zeitplan", "Zeitplan", "clock"], ["/pizzaabend", "Pizzaabend", "pizza"], ["/rezepte", "Rezepte", "book"] ] as const).map(([to, label, icon]) =>
        <NavLink key={to} to={to} end><Icon name={icon} /><span>{label}</span></NavLink>)}
    </nav>
  </div>;
}
export function App({ repo = repository }: { repo?: FornoRepository }) {
  return <ErrorBoundary><HashRouter><Workspace repo={repo} /></HashRouter></ErrorBoundary>;
}
