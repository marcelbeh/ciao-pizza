import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDough, StorageStatus } from "../../app/DoughProvider";
import {
  createPlan,
  applyStyle,
  ovenDefaults,
  ovens,
  styles,
  type DoughPlan,
} from "../../core/dough/model";
import {
  pizzaCount,
  calculateDough,
  validatePlan,
  type NumericKey,
} from "../../core/dough/calculations";
import { NumberField } from "../../components/dough/Fields";
import { BakeDateField, PlanEditor } from "../../components/dough/PlanEditor";
import { RecipeSummary } from "../../components/dough/RecipeSummary";
import "../teigstudio/studio.css";
const steps = [
  "Pizzastil",
  "Backgerät",
  "Menge",
  "Backtermin",
  "Teigführung",
  "Dein Teigplan",
];
export default function Page() {
  const workspace = useDough();
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">DEIN ROTER FADEN</p>
        <h1>Pizza-Pilot</h1>
        <p>
          In sechs Schritten zu deinem Pizzaabend. Alle Empfehlungen bleiben
          deine Entscheidung.
        </p>
      </div>
      <StorageStatus />
      {workspace.ready && <Wizard />}
    </>
  );
}
function Wizard() {
  const workspace = useDough();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DoughPlan>(() => {
    const p = structuredClone(workspace.state.active ?? createPlan());
    return {
      ...p,
      massMode: "balls" as const,
      count: pizzaCount(p.people, p.pizzasPerPerson, p.reserve),
      ballGrams: calculateDough(p).ballGrams,
    };
  });
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const issues = validatePlan(plan);
  const invalid = Object.keys(issues).length > 0;
  function go(index: number) {
    setStep(index);
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start" });
    });
  }
  function quantity(field: NumericKey, value: number) {
    setPlan((p) => {
      const next = { ...p, [field]: value };
      let count = NaN;
      try {
        count = pizzaCount(next.people, next.pizzasPerPerson, next.reserve);
      } catch {
        /* Inline validation. */
      }
      return { ...next, count, massMode: "balls" };
    });
  }
  const canNext =
    step === 0
      ? !issues.style
      : step === 1
        ? !issues.oven
        : step === 2
          ? ![
              "people",
              "pizzasPerPerson",
              "reserve",
              "count",
              "ballGrams",
            ].some((key) => key in issues)
          : step === 3
            ? !issues.bakeAt
            : step === 4
              ? ![
                  "bulkHours",
                  "ballHours",
                  "coldHours",
                  "method",
                  "roomC",
                  "fridgeC",
                ].some((key) => key in issues)
              : !invalid;
  function numeric(
    field: NumericKey,
    label: string,
    unit: string,
    change = (value: number) => setPlan({ ...plan, [field]: value }),
  ) {
    return (
      <NumberField
        key={field}
        field={field}
        label={label}
        unit={unit}
        value={plan[field]}
        onChange={change}
        error={issues[field]}
      />
    );
  }
  return (
    <div className="pilot">
      <nav className="wizard-progress" aria-label="Planungsschritte">
        <ol>
          {steps.map((title, index) => (
            <li key={title} aria-current={index === step ? "step" : undefined}>
              <button
                type="button"
                disabled={index > step}
                onClick={() => go(index)}
              >
                <span>{index + 1}</span>
                <span>{title}</span>
              </button>
            </li>
          ))}
        </ol>
        <progress value={step + 1} max={6} aria-label="Fortschritt" />
      </nav>
      <section className="dough-panel wizard-panel">
        <p className="eyebrow">PASSO {step + 1} DI 6</p>
        <h2 ref={heading} tabIndex={-1}>
          {steps[step]}
        </h2>
        {step === 0 && (
          <>
            <p>
              Welcher Stil kommt heute auf den Tisch? Beim Wechsel werden die
              Stil-Startwerte geladen.
            </p>
            <div className="choice-grid">
              {Object.entries(styles).map(([key, style]) => (
                <button
                  type="button"
                  key={key}
                  className="choice-card"
                  aria-pressed={plan.style === key}
                  onClick={() =>
                    setPlan(applyStyle(plan, key as DoughPlan["style"]))
                  }
                >
                  <strong>{style.name}</strong>
                  <span>{style.note}</span>
                </button>
              ))}
            </div>
            <p className="dough-fine">
              Römisch bedeutet hier dünne, runde Tonda Romana. Blechpizza und
              Pinsa sind noch keine eigenen Stilvorlagen.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            <p>
              Wir schlagen passende Starttemperaturen vor. Du kannst sie in der
              Rezeptübersicht anpassen.
            </p>
            <div className="choice-grid">
              {Object.entries(ovens).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className="choice-card"
                  aria-pressed={plan.oven === key}
                  onClick={() =>
                    setPlan({
                      ...plan,
                      oven: key as DoughPlan["oven"],
                      ...ovenDefaults(key as DoughPlan["oven"], plan.style),
                    })
                  }
                >
                  <strong>{label}</strong>
                  <span>
                    {ovenDefaults(key as DoughPlan["oven"], plan.style).ovenC}{" "}
                    °C als Startwert
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p>
              Reserve meint zusätzliche ganze Pizzen. Bruchteile der
              Personenmenge werden auf volle Pizzen aufgerundet.
            </p>
            <div className="form-grid">
              {numeric("people", "Personen", "Personen", (v) =>
                quantity("people", v),
              )}
              {numeric("pizzasPerPerson", "Pizzen pro Person", "Pizzen", (v) =>
                quantity("pizzasPerPerson", v),
              )}
              {numeric("reserve", "Reserve", "zusätzliche Pizzen", (v) =>
                quantity("reserve", v),
              )}
              {numeric("ballGrams", "Teiglingsgewicht", "g", (v) =>
                quantity("ballGrams", v),
              )}
            </div>
            <p className="quantity-result">
              {Number.isFinite(plan.count) && Number.isFinite(plan.ballGrams)
                ? `${plan.count} Pizzen · ${(plan.count * plan.ballGrams).toLocaleString("de-DE")} g Teig`
                : "Bitte Mengen korrigieren."}
            </p>
            {issues.count && (
              <p className="field-error">Gesamtanzahl: {issues.count}</p>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <p>
              Wann soll die erste Pizza in den Ofen? Ciao! plant die Gare
              rückwärts von diesem Zeitpunkt.
            </p>
            <BakeDateField plan={plan} onChange={setPlan} />
          </>
        )}
        {step === 4 && (
          <>
            <p>
              Direkt: Stock- und Stückgare im Raum. Kalt: zusätzliche Stockgare
              im Kühlschrank, danach teilen und im Raum akklimatisieren.
            </p>
            <div className="choice-grid">
              <button
                type="button"
                className="choice-card"
                aria-pressed={plan.method === "direct"}
                onClick={() =>
                  setPlan({
                    ...plan,
                    method: "direct",
                    bulkHours: 2,
                    ballHours: 10,
                  })
                }
              >
                <strong>Direktführung</strong>
                <span>Startwert: 2 h Stockgare + 10 h Stückgare</span>
              </button>
              <button
                type="button"
                className="choice-card"
                aria-pressed={plan.method === "cold"}
                onClick={() =>
                  setPlan({
                    ...plan,
                    method: "cold",
                    bulkHours: 2,
                    coldHours: 24,
                    ballHours: 3,
                  })
                }
              >
                <strong>Kalte Langzeitführung</strong>
                <span>Startwert: 2 h warm + 24 h kalt + 3 h Stückgare</span>
              </button>
            </div>
            <div className="form-grid">
              {numeric("bulkHours", "Stockgare im Raum", "h")}
              {plan.method === "cold" &&
                numeric("coldHours", "Kalte Stockgare", "h")}
              {numeric("ballHours", "Stückgare im Raum", "h")}
              {numeric("roomC", "Raumtemperatur", "°C")}
              {plan.method === "cold" &&
                numeric("fridgeC", "Kühlschranktemperatur", "°C")}
            </div>
            <p className="dough-note">
              Gare und Hefedosierung sind Richtwerte. Dein Teig und seine
              Temperatur entscheiden, nicht allein die Uhr.
            </p>
          </>
        )}
        {step === 5 && (
          <>
            <p>
              Dein vollständiger Plan. Prüfe Mengen und Zeiten; über
              „Empfehlungen anpassen“ kannst du jeden Rezeptparameter ändern.
            </p>
            <details className="pilot-adjust">
              <summary>Empfehlungen anpassen</summary>
              <PlanEditor plan={plan} onChange={setPlan} />
            </details>
            <RecipeSummary plan={plan} />
          </>
        )}
        <div className="wizard-actions">
          {step > 0 && (
            <button
              type="button"
              className="button secondary"
              onClick={() => go(step - 1)}
            >
              Zurück
            </button>
          )}
          {step < 5 ? (
            <button
              type="button"
              className="button"
              disabled={!canNext}
              onClick={() => go(step + 1)}
            >
              Weiter
            </button>
          ) : (
            <button
              type="button"
              className="button"
              disabled={invalid}
              onClick={() => {
                workspace.setActive(plan);
                navigate("/teigstudio");
              }}
            >
              Plan speichern & Teigstudio öffnen
            </button>
          )}
        </div>
        <p className="dough-fine">
          Entwurf: Dein aktiver Plan wird erst beim Übernehmen im letzten
          Schritt ersetzt. Im Teigstudio werden gültige Änderungen anschließend
          automatisch gespeichert.
        </p>
      </section>
    </div>
  );
}
