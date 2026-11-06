import { useEffect, useState, type FormEvent } from "react";
import { PageHeading } from "../components/PageHeading";
import { ScheduleTimeline } from "./ScheduleTimeline";
export { formatScheduleTime } from "./ScheduleTimeline";
import { toLocalInput } from "../core/dough/calculations";
import {
  calculateSchedule, createSchedule, nextScheduleSteps, parseBakeInput, scheduleIssues,
  scheduleRanges, scheduleWarning, type ScheduleNumber, type SchedulePlan,
} from "../core/schedule/plan";

const labels: Record<ScheduleNumber, string> = {
  bulkHours: "Stockgare im Raum", coldHours: "Kühlschrankphase", ballHours: "Stückgare im Raum",
  mixMinutes: "Mischen und Kneten", preheatMinutes: "Ofen vorheizen", roomC: "Raumtemperatur", fridgeC: "Kühlschranktemperatur",
};
type Props = {
  saved: SchedulePlan | null;
  loadError: string;
  save: (plan: SchedulePlan) => Promise<void>;
  busy: boolean;
  now: number;
  editingChanged: (editing: boolean) => void;
};
export function SchedulePage({ saved, loadError, save, busy, now, editingChanged }: Props) {
  const [base] = useState(() => saved ?? createSchedule(now));
  const [dateInput, setDateInput] = useState(() => toLocalInput(base.bakeAt));
  const [method, setMethod] = useState(base.method);
  const [draft, setDraft] = useState<Record<ScheduleNumber, string>>(() => Object.fromEntries(
    Object.keys(scheduleRanges).map(key => [key, String(base[key as ScheduleNumber]).replace(".", ",")]),
  ) as Record<ScheduleNumber, string>);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const numbers = Object.fromEntries(Object.entries(draft).map(([key, value]) =>
    [key, /^\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(",", ".")) : NaN],
  ));
  const candidate: SchedulePlan = { ...base, ...numbers, method };
  if (method === "direct") {
    for (const key of ["coldHours", "fridgeC"] as const) {
      const [min, max] = scheduleRanges[key];
      if (!Number.isFinite(candidate[key]) || candidate[key] < min || candidate[key] > max) candidate[key] = base[key];
    }
  }
  let dateError = "";
  try { candidate.bakeAt = parseBakeInput(dateInput); }
  catch (error) { dateError = error instanceof Error ? error.message : "Gültigen Backtermin wählen."; }
  const issues = scheduleIssues(candidate);
  if (dateError) issues.bakeAt = dateError;
  const valid = !Object.keys(issues).length;
  const dirty = !!dateError || !saved || (Object.keys(candidate) as (keyof SchedulePlan)[]).some(key => candidate[key] !== saved[key]);
  useEffect(() => {
    editingChanged(!loadError && dirty);
    return () => editingChanged(false);
  }, [dirty, loadError, editingChanged]);
  function changed() { setNotice(""); setSaveError(""); }
  function field(key: ScheduleNumber, unit: string) {
    const [min, max] = scheduleRanges[key];
    return <label className="number-field" htmlFor={`schedule-${key}`}>
      <span>{labels[key]}</span><span className="input-line">
        <input id={`schedule-${key}`} type="text" inputMode="decimal" autoComplete="off" value={draft[key]}
          aria-invalid={!!issues[key]} aria-describedby={`schedule-${key}-hint${issues[key] ? ` schedule-${key}-error` : ""}`}
          onChange={event => { setDraft(previous => ({ ...previous, [key]: event.target.value })); changed(); }} />
        <span className="unit">{unit}</span>
      </span><small className="field-hint" id={`schedule-${key}-hint`}>{min}–{max} {unit}</small>
      {issues[key] && <small className="error" id={`schedule-${key}-error`}>{issues[key]}</small>}
    </label>;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || loadError) return;
    setSaveError(""); setNotice("");
    try { await save(candidate); setNotice("Zeitplan auf diesem Gerät gespeichert."); }
    catch { setSaveError("Der Zeitplan konnte nicht gespeichert werden. Deine bisherigen Daten bleiben erhalten. Bitte erneut versuchen."); }
  }
  const steps = valid ? calculateSchedule(candidate) : [];
  const next = valid ? nextScheduleSteps(candidate, now) : [];
  const warning = valid ? scheduleWarning(candidate, now) : null;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return <>
    <PageHeading title="Zeitplan" description="Vom Backtermin rückwärts planen. Du bestimmst die Dauer jeder Phase." />
    {loadError ? <section className="card" role="alert"><h2>Zeitplan nicht verfügbar</h2><p>{loadError}</p></section> : <>
      <div className="calculator-layout schedule-layout">
        <form className="card schedule-form" onSubmit={event => void submit(event)} noValidate>
          <div className="card-heading"><h2>Deine Zeitplanung</h2></div>
          <label className="schedule-date" htmlFor="schedule-bakeAt">Backdatum und Uhrzeit
            <input id="schedule-bakeAt" type="datetime-local" value={dateInput} aria-invalid={!!issues.bakeAt}
              aria-describedby={`schedule-zone${issues.bakeAt ? " schedule-date-error" : ""}`}
              onChange={event => { setDateInput(event.target.value); changed(); }} />
          </label>
          <p id="schedule-zone" className="field-hint">Alle Zeiten in deiner Gerätezeitzone: {zone}.</p>
          {issues.bakeAt && <p id="schedule-date-error" className="error">{issues.bakeAt}</p>}
          <label className="schedule-method" htmlFor="schedule-method">Teigführung
            <select id="schedule-method" value={method} onChange={event => { setMethod(event.target.value as SchedulePlan["method"]); changed(); }}>
              <option value="cold">Mit Kühlschrankphase</option><option value="direct">Nur Raumtemperatur</option>
            </select>
          </label>
          <div className="schedule-fields">
            {field("bulkHours", "Std.")}
            {method === "cold" && field("coldHours", "Std.")}
            {field("ballHours", "Std.")}
          </div>
          <details className="pro"><summary>Kneten, Vorheizen und Temperaturen</summary>
            <div className="schedule-fields">{field("mixMinutes", "Min.")}{field("preheatMinutes", "Min.")}
              {field("roomC", "°C")}{method === "cold" && field("fridgeC", "°C")}</div>
          </details>
          <p className="precision-note">Die Zeiten sind deine Vorgaben, keine automatische Gärprognose. Mehl, Hefe und tatsächlicher Teigzustand beeinflussen die Reife. Die Hefemenge im Rechner bleibt unverändert.</p>
          <button className="button primary" type="submit" disabled={busy || !valid || !dirty}>{saved ? "Änderungen speichern" : "Zeitplan speichern"}</button>
          <p className="field-hint">Änderungen werden erst mit Speichern übernommen.</p>
          {notice && <p role="status" className="save-status">{notice}</p>}
          {saveError && <p role="alert" className="error">{saveError}</p>}
        </form>
        <section className="card schedule-preview" aria-labelledby="schedule-preview-title">
          <div className="card-heading"><h2 id="schedule-preview-title">{dirty ? "Vorschau deiner Schritte" : "Deine geplanten Schritte"}</h2></div>
          {valid ? <>
            {warning && <p className="schedule-warning" role="status">{warning}</p>}
            <ScheduleTimeline steps={steps} next={next} />
            <p className="field-hint">Vorheizen kann sich mit der Gare überschneiden. Geplante Zeiten bestätigen keine tatsächlich ausgeführten Arbeitsschritte.</p>
          </> : <p role="status" className="muted">Bitte korrigiere die markierten Eingaben, um den Zeitplan zu sehen.</p>}
        </section>
      </div>
    </>}
  </>;
}
