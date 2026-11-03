import type { DoughPlan } from "../../core/dough/model";
import { ovens, styles } from "../../core/dough/model";
import {
  calculateDough,
  formatGrams,
  plannedPhases,
  planWarnings,
  validatePlan,
  yeastGuideline,
} from "../../core/dough/calculations";
const labels = {
  flour: "Mehl",
  water: "Wasser",
  salt: "Salz",
  yeast: "Hefe",
  oil: "Öl",
  sugar: "Zucker",
};
export function RecipeSummary({ plan }: { plan: DoughPlan }) {
  if (Object.keys(validatePlan(plan)).length)
    return (
      <section className="dough-panel">
        <h2>Dein Rezept</h2>
        <p role="status">
          Bitte die markierten Eingaben korrigieren, um die Mengen zu berechnen.
        </p>
      </section>
    );
  const result = calculateDough(plan);
  const warnings = planWarnings(plan);
  const date = (iso: string) =>
    new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: plan.timeZone,
    }).format(new Date(iso));
  return (
    <section
      id="dough-recipe"
      className="dough-panel recipe-summary"
      aria-label="Rezeptübersicht"
    >
      <p className="eyebrow">IL TUO IMPASTO</p>
      <h2>{plan.name}</h2>
      <p>
        {styles[plan.style].name} · {ovens[plan.oven]}
      </p>
      <div className="recipe-total">
        <strong>
          {plan.count} × {formatGrams(result.ballGrams)} g
        </strong>
        <span>{formatGrams(result.total)} g Gesamtteig</span>
      </div>
      <dl className="ingredient-list">
        {Object.entries(result.ingredients).map(([key, grams]) => (
          <div key={key}>
            <dt>
              {key === "yeast"
                ? plan.yeastKind === "fresh"
                  ? "Frischhefe"
                  : "Instant-Trockenhefe"
                : labels[key as keyof typeof labels]}
            </dt>
            <dd>
              {formatGrams(grams, key === "yeast")} <span>g</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="dough-fine">
        Anzeige gerundet; gerechnet wird mit ungerundeten Mengen. Einzelwerte
        können in Summe leicht abweichen. Keine Bestäubungsmehle oder
        Verdunstungsverluste enthalten.
      </p>
      <h3>Deine Parameter</h3>
      <p>
        {plan.hydration} % Hydration · {plan.salt} % Salz · {plan.oil} % Öl ·{" "}
        {plan.sugar} % Zucker
      </p>
      <p>Mehlprofil: {plan.flourProfile}</p>
      <p>
        Raum {plan.roomC} °C · Wasser {plan.waterC} °C · Zielteig {plan.doughC}{" "}
        °C{plan.method === "cold" ? ` · Kühlschrank ${plan.fridgeC} °C` : ""}
      </p>
      <div className="dough-note">
        <strong>
          {plan.yeastMode === "guideline"
            ? "Hefe-Richtwert · Schätzung"
            : "Hefe manuell festgelegt"}
        </strong>
        <p>
          {formatGrams(result.yeastPercent, true)} % der Mehlmenge.{" "}
          {plan.yeastMode === "guideline"
            ? `Frischhefe-Basis ${yeastGuideline(plan).base} % × Raumfaktor ${yeastGuideline(plan).factor}. Grober Orientierungsbereich: etwa 50–150 % der angezeigten Dosis.`
            : "Die Gare wird bei manuellen Dosen nicht automatisch prognostiziert."}
        </p>
        <p>
          Instant-Trockenhefe ≈ ⅓ Frischhefe. Produktangaben gehen vor.
          Temperatur, Mehl und Hefefrische verändern das Ergebnis; den Teig
          beobachten.
        </p>
      </div>
      <h3>Geplante Gare · Schätzung</h3>
      <ol className="phase-list">
        {plannedPhases(plan).map((phase) => (
          <li key={phase.id}>
            <strong>{phase.label}</strong>
            <span>
              {date(phase.startsAt)} → {date(phase.endsAt)}
              {phase.temperatureC !== undefined
                ? ` · ${phase.temperatureC} °C`
                : ""}
            </span>
          </li>
        ))}
      </ol>
      <p>
        Backen: <strong>{date(plan.bakeAt)}</strong> · {plan.ovenC} °C · ca.{" "}
        {plan.bakeMinutes} min
      </p>
      <p className="dough-fine">
        Zeitzone: {plan.timeZone}. Vorheizen läuft parallel zur Gare. Zeiten
        sind Planungsvorgaben, keine gemessene Teigreife.
      </p>
      {warnings.length > 0 && (
        <div className="dough-warnings">
          <h3>Bitte beachten</h3>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <details className="dough-sources">
        <summary>Grundlagen & Richtwerte</summary>
        <p>
          Ciao!-Startwerte, keine Zertifizierung: Neapolitanisch 60 / 2,8 / 0 /
          0 %, New York 62 / 2,5 / 2 / 1 %, Tonda Romana 57 / 2,5 / 3 / 0 %
          (Wasser / Salz / Öl / Zucker, jeweils auf Mehl). Eigener Stil startet
          mit 65 / 2,5 / 0 / 0 %.
        </p>
        <p>
          Direkt bei 20–25 °C: bis 6 h 0,6 %, bis 12 h 0,2 %, bis 24 h 0,1 %
          Frischhefe. Kalt bei 4 °C und 3–6 h warmer Gare: 12–36 h 0,3 %, über
          36–72 h 0,15 %. Raum unter 20 °C: Faktor 1,5; über 25 °C: 0,65. Dies
          ist eine grobe Ciao!-Heuristik, kein validiertes Gärmodell. Wasser-
          und Zielteigtemperatur sind dokumentierte Sollwerte, keine berechnete
          Wärmebilanz.
        </p>
        <p>
          Stilgrundlagen:{" "}
          <a
            href="https://www.pizzanapoletana.org/en/ricetta_pizza_napoletana"
            target="_blank"
            rel="noreferrer"
          >
            AVPN
          </a>
          ,{" "}
          <a
            href="https://www.kingarthurbaking.com/recipes/new-york-style-pizza-recipe"
            target="_blank"
            rel="noreferrer"
          >
            King Arthur Baking
          </a>
          ,{" "}
          <a
            href="https://www.mattiaspizza.com/wp-content/uploads/eBook-The-Art-of-Neapolitan-Roman-Pizza-05-Feb-2024.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Mattia’s Pizza
          </a>
          . Die Ciao!-Werte sind anpassbare Startrezepturen; keine exakten
          Kopien dieser Rezepte.
        </p>
      </details>
    </section>
  );
}
