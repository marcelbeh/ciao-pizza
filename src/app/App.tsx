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
  // Replace this component with the original artwork when Marcel supplies it.
  return <span className="wordmark">FORNO<span>.</span><small>by Marcel</small></span>;
}
function Dashboard({ evening }: { evening: EveningSummary | null }) {
  return <>
    <section className="hero">
      <div className="hero-top"><span className="eyebrow">PRIVATE PIZZA WORKSHOP</span><Icon name="flame" /></div>
      <h1>DEIN TEIG.<br /><span>DEIN RIFF.</span></h1>
      <p>Gutes Mehl. Dein Handwerk.<br />Der Rest ist Rock ’n’ Roll.</p>
      <Link className="button primary" to="/teig">An den Teig <Icon name="arrow" /></Link>
      <span className="hero-index" aria-hidden="true">01 / THE DOUGH SESSION</span>
    </section>
    {evening ? <section className="card evening-card">
      <p className="eyebrow">LETZTER GESPEICHERTER PIZZAABEND</p><h2>{evening.name}</h2>
      <p className="date-line"><Icon name="evening" />{new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium", timeStyle: "short", timeZone: evening.timeZone,
      }).format(new Date(evening.bakeAt))}</p>
      <div className="session-numbers"><p><strong>{number(evening.count)}</strong><span>Pizzen</span></p>
        <p><strong>{number(evening.ballGrams, 1)} <small>g</small></strong><span>pro Teigling</span></p></div>
      <p className="muted">Dein bisheriger Abend bleibt erhalten. Zeitplan und Bearbeitung folgen in P2/P3.</p>
    </section> : <section className="card empty-stage"><span className="eyebrow">DEINE NÄCHSTE SESSION</span>
      <h2>Die Bühne ist frei.<br />Teig drauf!</h2><p className="muted">Noch kein Pizzaabend gespeichert. Starte mit deiner Rezeptur.</p>
      <Link className="text-link" to="/teig">Teig einstellen <Icon name="arrow" /></Link></section>}
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
    <div className="page-heading"><p className="eyebrow">THE DOUGH SESSION</p><h1>DEIN TEIG.</h1>
      <p className="muted">Ein paar Zahlen. Alles im richtigen Verhältnis.</p></div>
    <section className="card calculator" aria-label="Teig einstellen">
      <div className="card-heading"><h2>Das Setup</h2><Icon name="dough" /></div>
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
      <details className="pro"><summary>Profi-Setup <span>Salz & Hefe</span></summary>
        <p className="muted">Beide Anteile beziehen sich auf die Mehlmenge.</p><div className="quantity-grid">{field("salt", "%")}{field("yeastPercent", "%")}</div>
      </details>
    </section>
    <section className="card ingredients" aria-label="Deine Zutaten">
      <div className="card-heading"><div><p className="eyebrow">READY TO ROCK.</p><h2>Das kommt rein.</h2></div><Icon name="flame" /></div>
      {result ? <><dl>{([ ["Mehl", result.ingredients.flour, 1], ["Wasser", result.ingredients.water, 1],
        ["Salz", result.ingredients.salt, 2], ["Trockenhefe", result.ingredients.yeast, 2] ] as const).map(([label, amount, digits], index) =>
        <div key={label}><dt><span className="ingredient-index">0{index + 1}</span>{label}</dt><dd>{label === "Trockenhefe" && amount > 0 && amount < .01 ? "< 0,01" : number(amount, digits)} <span>g</span></dd></div>)}</dl>
        <div className="total"><span>Gesamtteig</span><strong>{number(candidate.count * candidate.ballGrams)} <span>g</span></strong></div>
        <p className="precision-note">Für Trockenhefe eine Feinwaage verwenden. Mengen sind für die Anzeige gerundet.</p></>
        : <p role="status" className="error">Bitte korrigiere die markierten Eingaben. Es werden keine ungültigen Mengen berechnet oder gespeichert.</p>}
    </section>
    <p className={`save-status ${status.includes("fehlgeschlagen") ? "error" : "muted"}`} role="status">{status}</p>
  </>;
}
function Placeholder({ evening = false }: { evening?: boolean }) {
  return <section className="card coming-soon"><span className="phase-label">{evening ? "P3" : "P2"} · KOMMT ALS NÄCHSTES</span>
    <div className="placeholder-icon"><Icon name={evening ? "evening" : "clock"} /></div>
    <h1>{evening ? "DEIN ABEND.\nDEINE BÜHNE." : "GUTER TEIG\nBRAUCHT ZEIT."}</h1>
    <p className="muted">{evening ? "Pizzaabend und persönliche Belagrezepte bekommen hier ihren Platz. Deine vorhandenen Daten bleiben erhalten."
      : "Hier entsteht dein Zeitplan – vom ersten Kneten bis zur heißen Pizza. In P1 ist dieser Bereich noch nicht bedienbar."}</p>
    <Link to="/teig" className="button primary">Zum Teigrechner <Icon name="arrow" /></Link></section>;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="app-content"><h1>Kurzer Zwischenstopp.</h1>
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
    const titles: Record<string, string> = { "/": "Dashboard", "/teig": "Teig", "/zeitplan": "Zeitplan", "/pizzaabend": "Pizzaabend" };
    document.title = `${titles[location.pathname] ?? "Seite nicht gefunden"} · FORNO. by Marcel`;
    main.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
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
    <header className="app-header"><Link to="/" aria-label="FORNO. Dashboard"><Wordmark /></Link><span className="header-note">NO RULES.<br />JUST GOOD PIZZA.</span></header>
    <main id="content" className="app-content" ref={main} tabIndex={-1}>
      {error && <div className="card error" role="alert"><p>{error}</p>
        <button onClick={() => window.location.reload()}>Erneut laden</button></div>}
      {!data ? !error && <p role="status">Deine Werkstatt wird geöffnet …</p> : <Routes>
        <Route path="/" element={<Dashboard evening={data.evening} />} />
        <Route path="/teig" element={<Calculator formula={data.formula} save={save} status={status} invalidChanged={setInvalid} />} />
        <Route path="/zeitplan" element={<Placeholder />} />
        <Route path="/pizzaabend" element={<Placeholder evening />} />
        <Route path="*" element={<section className="card"><h1>Hier spielt nichts.</h1><Link to="/">Zum Dashboard</Link></section>} />
      </Routes>}
      <footer className="app-footer"><p>FORNO. <span>by Marcel</span></p><p>Dein Gerät. Dein Teig. Ohne Konto.</p>
        <details><summary>Daten & Offline</summary>
          <p>Alles bleibt in diesem Browser. Regelmäßig sichern, bevor du Browserdaten löschst. Vorhandene Ciao!-Daten bleiben unverändert gespeichert; die Sicherung enthält auch persönliche Rezepte, Profile und alte Pizzaabende.</p>
          {data?.hasLegacy && <p>Vorhandene Daten erkannt. Nicht darstellbare alte Rezepturen werden nicht verändert. Ohne passende Übernahme startet FORNO. mit den Standardwerten.</p>}
          <button onClick={() => void backup()} disabled={busy}>Sicherung herunterladen</button>
          <p>Nach dem ersten vollständigen Laden ist die App offline nutzbar. Auf dem iPhone: Safari → Teilen → Zum Home-Bildschirm.</p>
        </details><PwaNotice busy={busy || invalid} />
      </footer>
    </main>
    <nav className="floating-dock" aria-label="Hauptnavigation">
      {([ ["/teig", "Teig", "dough"], ["/zeitplan", "Zeitplan", "clock"], ["/pizzaabend", "Pizzaabend", "evening"] ] as const).map(([to, label, icon]) =>
        <NavLink key={to} to={to}><Icon name={icon} /><span>{label}</span></NavLink>)}
    </nav>
  </div>;
}
export function App({ repo = repository }: { repo?: FornoRepository }) {
  return <ErrorBoundary><HashRouter><Workspace repo={repo} /></HashRouter></ErrorBoundary>;
}
