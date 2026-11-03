import type { DoughPlan } from "../../core/dough/model";
import {
  ovens,
  ovenDefaults,
  styles,
  applyStyle,
} from "../../core/dough/model";
import {
  calculateDough,
  convertYeast,
  fromLocalInput,
  toLocalInput,
  validatePlan,
  type NumericKey,
} from "../../core/dough/calculations";
import { NumberField, TextField } from "./Fields";
export function BakeDateField({
  plan,
  onChange,
}: {
  plan: DoughPlan;
  onChange: (plan: DoughPlan) => void;
}) {
  return (
    <div className="dough-field">
      <label htmlFor="bake-date">
        Backdatum und Uhrzeit <span>Ortszeit deines Geräts</span>
      </label>
      <input
        id="bake-date"
        type="datetime-local"
        value={toLocalInput(plan.bakeAt)}
        onChange={(e) => {
          let iso = "";
          try {
            iso = fromLocalInput(e.target.value);
          } catch {
            /* Inline validation. */
          }
          onChange({
            ...plan,
            bakeAt: iso,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }}
        aria-invalid={!!validatePlan(plan).bakeAt}
      />
      {validatePlan(plan).bakeAt && (
        <small className="field-error">{validatePlan(plan).bakeAt}</small>
      )}
      <small>
        Zeitzone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Bei
        doppelten Uhrzeiten zur Zeitumstellung gilt das frühere Vorkommen.
      </small>
    </div>
  );
}
export function PlanEditor({
  plan,
  onChange,
}: {
  plan: DoughPlan;
  onChange: (plan: DoughPlan) => void;
}) {
  const issues = validatePlan(plan);
  function update<K extends keyof DoughPlan>(key: K, value: DoughPlan[K]) {
    onChange({ ...plan, [key]: value });
  }
  function number(
    field: NumericKey,
    label: string,
    unit: string,
    slider = false,
  ) {
    return (
      <NumberField
        key={field}
        field={field}
        label={label}
        unit={unit}
        slider={slider}
        value={plan[field]}
        onChange={(value) => update(field, value)}
        error={issues[field]}
      />
    );
  }
  return (
    <div className="plan-editor">
      <section className="dough-panel">
        <p className="eyebrow">01 · DEINE REZEPTUR</p>
        <h2>Stil & Menge</h2>
        <div className="form-grid">
          <TextField
            label="Planname"
            value={plan.name}
            onChange={(value) => update("name", value)}
            error={issues.name}
          />
          <div className="dough-field">
            <label htmlFor="studio-style">Pizzastil · lädt Startwerte</label>
            <select
              id="studio-style"
              value={plan.style}
              onChange={(e) =>
                onChange(applyStyle(plan, e.target.value as DoughPlan["style"]))
              }
            >
              {Object.entries(styles).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="dough-field">
            <label htmlFor="mass-mode">Berechnungsbasis</label>
            <select
              id="mass-mode"
              value={plan.massMode}
              onChange={(e) => {
                const mode = e.target.value as DoughPlan["massMode"];
                let next = { ...plan, massMode: mode };
                if (!Object.keys(issues).length) {
                  const result = calculateDough(plan);
                  next = {
                    ...next,
                    flourGrams: result.ingredients.flour,
                    ballGrams: result.ballGrams,
                  };
                }
                onChange(next);
              }}
            >
              <option value="balls">Anzahl × Teiglingsgewicht</option>
              <option value="flour">Vorhandene Mehlmenge</option>
            </select>
          </div>
          {number("count", "Teiglinge", "Stück")}
          {plan.massMode === "balls"
            ? number("ballGrams", "Teiglingsgewicht", "g")
            : number("flourGrams", "Mehlmenge", "g")}
          <TextField
            label="Mehlprofil"
            value={plan.flourProfile}
            onChange={(value) => update("flourProfile", value)}
            error={issues.flourProfile}
          />
        </div>
        <p className="dough-fine">
          Im Mehlmodus: Gesamtteig ÷ Anzahl = Teiglingsgewicht. Personen und
          Reserve aus dem Pilot bleiben Planungsnotizen; im Profi-Modus bestimmt
          die Anzahl die Rezeptmenge.
        </p>
      </section>
      <section className="dough-panel">
        <p className="eyebrow">02 · BÄCKERPROZENTE</p>
        <h2>Die Balance</h2>
        <div className="form-grid">
          {number("hydration", "Hydration", "% vom Mehl", true)}
          {number("salt", "Salz", "% vom Mehl", true)}
          {number("oil", "Öl", "% vom Mehl")}
          {number("sugar", "Zucker", "% vom Mehl")}
          <div className="dough-field">
            <label htmlFor="yeast-kind">Hefeart</label>
            <select
              id="yeast-kind"
              value={plan.yeastKind}
              onChange={(e) => {
                const kind = e.target.value as DoughPlan["yeastKind"];
                onChange({
                  ...plan,
                  yeastKind: kind,
                  yeastPercent: convertYeast(
                    plan.yeastPercent,
                    plan.yeastKind,
                    kind,
                  ),
                });
              }}
            >
              <option value="fresh">Frischhefe</option>
              <option value="instant">Instant-Trockenhefe</option>
            </select>
          </div>
          <div className="dough-field">
            <label htmlFor="yeast-mode">Hefedosierung</label>
            <select
              id="yeast-mode"
              value={plan.yeastMode}
              onChange={(e) => {
                const mode = e.target.value as DoughPlan["yeastMode"];
                onChange({
                  ...plan,
                  yeastMode: mode,
                  yeastPercent:
                    mode === "manual" && !Object.keys(issues).length
                      ? calculateDough(plan).yeastPercent
                      : plan.yeastPercent,
                });
              }}
            >
              <option value="guideline">Ciao!-Richtwert · Schätzung</option>
              <option value="manual">Manuell festlegen</option>
            </select>
          </div>
          {plan.yeastMode === "manual" &&
            number("yeastPercent", "Hefedosierung", "% vom Mehl")}
        </div>
        <p className="dough-fine">
          Öl und Zucker sind optional und im heißen Pizzaofen oft nicht nötig.
          Trockenhefe meint Instanthefe; aktive Trockenhefe kann abweichende
          Herstellerdosierung und Aktivierung benötigen.
        </p>
      </section>
      <section className="dough-panel">
        <p className="eyebrow">03 · ZEIT & TEMPERATUR</p>
        <h2>Deine Teigführung</h2>
        <div className="form-grid">
          <BakeDateField plan={plan} onChange={onChange} />
          <div className="dough-field">
            <label htmlFor="fermentation-method">Teigführung</label>
            <select
              id="fermentation-method"
              value={plan.method}
              onChange={(e) =>
                onChange({
                  ...plan,
                  method: e.target.value as DoughPlan["method"],
                })
              }
            >
              <option value="direct">Direktführung</option>
              <option value="cold">Kalte Langzeitführung</option>
            </select>
          </div>
          {number("mixMinutes", "Mischen & Kneten", "min")}
          {number("bulkHours", "Stockgare im Raum", "h")}
          {plan.method === "cold" &&
            number("coldHours", "Kalte Stockgare", "h")}
          {number("ballHours", "Stückgare im Raum", "h")}
          {number("roomC", "Raumtemperatur", "°C")}
          {number("waterC", "Wassertemperatur", "°C")}
          {number("doughC", "Zielteigtemperatur", "°C")}
          {number("fridgeC", "Kühlschranktemperatur", "°C")}
        </div>
        <p className="dough-fine">
          Kaltführung: warme Stockgare → kalte Stockgare → Teilen und warme
          Stückgare. Die kalte Zeit kommt zusätzlich zur warmen Stock- und
          Stückgare hinzu. Temperaturen sind Sollwerte; die Abkühlung des
          Teigkerns wird nicht modelliert.
        </p>
      </section>
      <section className="dough-panel">
        <p className="eyebrow">04 · AB IN DEN OFEN</p>
        <h2>Backparameter</h2>
        <div className="form-grid">
          <div className="dough-field">
            <label htmlFor="oven-type">Backgerät · lädt Ofen-Startwerte</label>
            <select
              id="oven-type"
              value={plan.oven}
              onChange={(e) => {
                const oven = e.target.value as DoughPlan["oven"];
                onChange({ ...plan, oven, ...ovenDefaults(oven, plan.style) });
              }}
            >
              {Object.entries(ovens).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {number("ovenC", "Backtemperatur", "°C")}
          {number("preheatMinutes", "Vorheizen", "min")}
          {number("bakeMinutes", "Backdauer", "min")}
        </div>
        <p className="dough-fine">
          Ofen- und Steinleistung variieren. Temperaturen und Zeiten sind
          anpassbare Startpunkte.
        </p>
      </section>
    </div>
  );
}
