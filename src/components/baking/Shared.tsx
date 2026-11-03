import { useDough } from "../../app/DoughProvider";
import { useLocal } from "../../app/LocalWorkspace";
import { Field } from "../planning/Shared";
import type { DoughPlan } from "../../core/dough/model";
import { ovens, styles } from "../../core/dough/model";
import type { Observations } from "../../core/baking/model";
import { observationRanges } from "../../core/baking/validation";
import "./baking.css";
export { observationTitles as observationLabels } from "../../core/baking/model";
import { observationTitles as observationLabels } from "../../core/baking/model";
export function ObservationsEditor({
  value,
  onChange,
  fields = Object.keys(observationLabels) as (keyof Observations)[],
}: {
  value: Observations;
  onChange: (a: Observations) => void;
  fields?: (keyof Observations)[];
}) {
  return (
    <div className="form-grid">
      {fields.map((key) => (
        <Field key={key} label={`Gemessen: ${observationLabels[key]}`}>
          <input
            aria-label={`Gemessen: ${observationLabels[key]}`}
            type="number"
            inputMode="decimal"
            step="any"
            min={observationRanges[key][0]}
            max={observationRanges[key][1]}
            value={value[key] ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                [key]: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <small>
            Optional · {observationRanges[key].join(" bis ")}; leer = unbekannt
          </small>
        </Field>
      ))}
    </div>
  );
}
export function SourceSelect({
  value,
  onChange,
  includeJournal = false,
}: {
  value: string;
  onChange: (id: string) => void;
  includeJournal?: boolean;
}) {
  const { state } = useLocal();
  const dough = useDough();
  return (
    <Field label="Daten übernehmen aus">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="new">Neuer Standardplan</option>
        {dough.state.active && (
          <option value="active">
            Aktiver Teigplan · {dough.state.active.name}
          </option>
        )}
        {state?.evenings.map((e) => (
          <option key={e.id} value={"evening:" + e.id}>
            Pizzaabend · {e.name}
          </option>
        ))}
        {state?.baking?.sessions.map((s) => (
          <option key={s.id} value={"session:" + s.id}>
            Backlauf · {s.name}
          </option>
        ))}
        {includeJournal &&
          state?.baking?.entries.map((e) => (
            <option key={e.id} value={"entry:" + e.id}>
              Tagebuch · {e.name}
            </option>
          ))}
      </select>
    </Field>
  );
}
export function PlanFacts({ plan }: { plan: DoughPlan }) {
  return (
    <p className="dough-note">
      {styles[plan.style].name} · {ovens[plan.oven]} · {plan.hydration} %
      Hydration · {plan.flourProfile} ·{" "}
      {plan.method === "cold" ? "kalte Langzeitführung" : "Direktführung"}
    </p>
  );
}

export function useBakingSource() {
  const { state } = useLocal();
  const dough = useDough();
  return (id: string) => {
    const evening = id.startsWith("evening:")
      ? state?.evenings.find((e) => e.id === id.slice(8))
      : undefined;
    const session = id.startsWith("session:")
      ? state?.baking?.sessions.find((s) => s.id === id.slice(8))
      : undefined;
    const entry = id.startsWith("entry:")
      ? state?.baking?.entries.find((e) => e.id === id.slice(6))
      : undefined;
    return {
      plan:
        entry?.plan ??
        session?.plan ??
        evening?.dough ??
        (id === "active" ? (dough.state.active ?? undefined) : undefined),
      evening,
      session,
      entry,
    };
  };
}
