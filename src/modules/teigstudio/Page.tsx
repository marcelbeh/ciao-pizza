import { useEffect, useState } from "react";
import { useDough, StorageStatus } from "../../app/DoughProvider";
import { createPlan, type DoughPlan } from "../../core/dough/model";
import {
  calculateDough,
  formatGrams,
  validatePlan,
} from "../../core/dough/calculations";
import { PlanEditor } from "../../components/dough/PlanEditor";
import { RecipeSummary } from "../../components/dough/RecipeSummary";
import { Profiles } from "./Profiles";
import "./studio.css";
export default function Page() {
  const workspace = useDough();
  const [plan, setPlan] = useState(
    () => workspace.state.active ?? createPlan(),
  );
  useEffect(() => {
    if (workspace.state.active) setPlan(workspace.state.active);
  }, [workspace.state.active]);
  function update(next: DoughPlan) {
    setPlan(next);
    if (!Object.keys(validatePlan(next)).length) workspace.setActive(next);
  }
  const valid = !Object.keys(validatePlan(plan)).length;
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">MEHL. WASSER. DEIN HANDWERK.</p>
        <h1>Teigstudio</h1>
        <p>
          Deine Rezeptur, bis ins Detail. Jede gültige Änderung wird zum aktiven
          Teigplan.
        </p>
      </div>
      <StorageStatus />
      {workspace.ready && (
        <>
          <div className="studio-toolbar">
            <span className="phase-badge">PROFI-MODUS</span>
            {valid && (
              <>
                <span className="dough-fine">
                  {plan.count} × {formatGrams(calculateDough(plan).ballGrams)} g
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    document
                      .getElementById("dough-recipe")
                      ?.scrollIntoView({ block: "start" })
                  }
                >
                  Zum Rezept
                </button>
              </>
            )}
            {!workspace.state.active && (
              <button
                className="button"
                disabled={!valid}
                onClick={() => workspace.setActive(plan)}
              >
                Als aktiven Plan speichern
              </button>
            )}
            {!valid && (
              <p role="alert" className="field-error">
                Ungültige Eingaben werden nicht gespeichert. Der letzte gültige
                Plan bleibt erhalten.
              </p>
            )}
          </div>
          <div className="studio-layout">
            <PlanEditor plan={plan} onChange={update} />
            <RecipeSummary plan={plan} />
          </div>
          <Profiles disabled={!valid} />
        </>
      )}
    </>
  );
}
