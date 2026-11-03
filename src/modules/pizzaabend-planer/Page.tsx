import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocal } from "../../app/LocalWorkspace";
import { useDough } from "../../app/DoughProvider";
import {
  assertEvening,
  eveningCount,
  eveningDough,
  newEvening,
  generateShopping,
} from "../../core/planning/calculations";
import { builtInRecipes } from "../../core/planning/recipes";
import {
  calculateDough,
  toLocalInput,
  fromLocalInput,
  formatGrams,
} from "../../core/dough/calculations";
import type { PizzaEvening } from "../../core/planning/model";
import { Field, Numeric, useAction } from "../../components/planning/Shared";
export default function Page() {
 const workspace=useDough();
 return workspace.ready?<Planner/>:<p role="status">Teigplan wird geladen …</p>;
}
function Planner() {
  const { state, repository } = useLocal();
  const dough = useDough();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() =>
    newEvening(dough.state.active ?? undefined),
  );
  const [recipeId, setRecipeId] = useState(builtInRecipes[0].id);
  const action = useAction();
  if (!state) return null;
  const recipes = [...builtInRecipes, ...state.recipes];
  let normalized: PizzaEvening | undefined;
  let issue = "";
  let count = 0;
  try {
    count = eveningCount(draft);
    normalized = { ...draft, dough: eveningDough(draft, draft.dough) };
    assertEvening(normalized);
  } catch (e) {
    issue = (e as Error).message;
  }
  const saved = state.evenings.find((e) => e.id === draft.id);
  const changed =
    !saved ||
    JSON.stringify({ ...normalized, updatedAt: saved.updatedAt }) !==
      JSON.stringify(saved);
  const update = (patch: Partial<PizzaEvening>) =>
    setDraft({ ...draft, ...patch });
  async function save() {
    if (!normalized) throw Error(issue);
    assertEvening(normalized);
    const next = { ...normalized, updatedAt: new Date().toISOString() };
    await repository.change((w) => {
      const old = w.evenings.find((e) => e.id === next.id);
      if (old && old.updatedAt !== saved?.updatedAt)
        throw Error(
          "Dieser Abend wurde inzwischen geändert. Bitte neu öffnen.",
        );
      w.evenings = [...w.evenings.filter((e) => e.id !== next.id), next];
      return w;
    });
    setDraft(next);
  }
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">INSIEME · GEMEINSAM GENIESSEN</p>
        <h1>Pizzaabend-Planer</h1>
        <p>
          Gäste, Sorten und Teig an einem Ort. Änderungen erst mit „Pizzaabend
          speichern“ dauerhaft übernehmen.
        </p>
      </div>
      <div className="planning-toolbar">
        <Field label="Gespeicherten Pizzaabend öffnen">
          <select
            value={saved?.id ?? ""}
            onChange={(e) => {
              const record = state.evenings.find(
                (x) => x.id === e.target.value,
              );
              if (record) setDraft(structuredClone(record));
            }}
          >
            <option value="">Neuer Entwurf</option>
            {state.evenings.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {new Date(e.bakeAt).toLocaleDateString("de-DE")}
              </option>
            ))}
          </select>
        </Field>
        <button
          className="button secondary"
          onClick={() => setDraft(newEvening(dough.state.active ?? undefined))}
        >
          Neuer Pizzaabend
        </button>
      </div>
      {action.feedback}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(save);
        }}
      >
        <div className="planning-grid two">
          <section className="dough-panel">
            <h2>Gäste & Termin</h2>
            <Field label="Name des Pizzaabends">
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
            <Field label="Backdatum und Uhrzeit">
              <input
                required
                type="datetime-local"
                value={toLocalInput(draft.bakeAt)}
                onChange={(e) =>
                  update({
                    bakeAt: (() => {
                      try {
                        return fromLocalInput(e.target.value);
                      } catch {
                        return "";
                      }
                    })(),
                  })
                }
              />
            </Field>
            <p className="planning-muted">Zeitzone: {draft.timeZone}</p>
            <div className="form-grid">
              <Numeric
                label="Gäste"
                min={1}
                max={100}
                step={1}
                value={draft.guests}
                onChange={(guests) => update({ guests })}
              />
              <Numeric
                label="Pizzen pro Person"
                min={0.25}
                max={5}
                step={0.25}
                value={draft.pizzasPerPerson}
                onChange={(pizzasPerPerson) => update({ pizzasPerPerson })}
              />
              <Numeric
                label="Reserve (Pizzen)"
                max={100}
                step={1}
                value={draft.reserve}
                onChange={(reserve) => update({ reserve })}
              />
            </div>
            <p className="planning-summary">{count || "–"} Pizzen insgesamt</p>
          </section>
          <section className="dough-panel">
            <h2>Pizzasorten verteilen</h2>
            {draft.lines.map((line, index) => (
              <div className="planning-row" key={line.id}>
                <div>
                  <strong>{line.recipe.name}</strong>
                  <p className="planning-muted">Gespeicherte Rezeptkopie</p>
                </div>
                <Numeric
                  label={`Pizzen Sorte ${index + 1}`}
                  min={1}
                  max={500}
                  step={1}
                  value={line.pizzas}
                  onChange={(pizzas) =>
                    update({
                      lines: draft.lines.map((x) =>
                        x.id === line.id ? { ...x, pizzas } : x,
                      ),
                    })
                  }
                />
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    update({
                      lines: draft.lines.filter((x) => x.id !== line.id),
                    })
                  }
                >
                  Sorte entfernen
                </button>
              </div>
            ))}
            <Field label="Weitere Pizzasorte">
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                const recipe = recipes.find((r) => r.id === recipeId);
                if (recipe)
                  update({
                    lines: [
                      ...draft.lines,
                      {
                        id: crypto.randomUUID(),
                        recipe: structuredClone(recipe),
                        pizzas: 1,
                      },
                    ],
                  });
              }}
            >
              Sorte hinzufügen
            </button>
            <p>
              Verteilt:{" "}
              {draft.lines.reduce(
                (sum, l) => sum + (Number.isFinite(l.pizzas) ? l.pizzas : 0),
                0,
              )}{" "}
              von {count || "–"}
            </p>
          </section>
        </div>
        <section className="dough-panel">
          <h2>Teigbedarf</h2>
          <Numeric
            label="Teiglingsgewicht (g)"
            min={50}
            max={2000}
            step={0.1}
            value={draft.dough.ballGrams}
            onChange={(ballGrams) =>
              update({ dough: { ...draft.dough, ballGrams } })
            }
          />
          {normalized && (
            <p className="planning-summary">
              {formatGrams(calculateDough(normalized.dough).total)} Gesamtteig ·{" "}
              {normalized.dough.flourProfile} · {normalized.dough.hydration} %
              Hydration
            </p>
          )}
          <button
            type="button"
            className="text-button"
            disabled={!dough.state.active}
            onClick={() => {
              if (dough.state.active)
                update({ dough: eveningDough(draft, dough.state.active) });
            }}
          >
            Teigrezept aus aktivem Plan übernehmen
          </button>
          <p className="planning-muted">
            Mengen und Termin bleiben an diesen Abend gebunden. Rezeptänderungen
            im Teigstudio hier anschließend ausdrücklich übernehmen.
          </p>
          {issue && (
            <p role="alert" className="planning-error">
              {issue}
            </p>
          )}
          <div className="planning-actions">
            <button className="button" disabled={!!issue || action.busy}>
              Pizzaabend speichern
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={!!issue || !normalized}
              onClick={() => {
                if (normalized) {
                  dough.setActive(normalized.dough);
                  navigate("/pizza-pilot");
                }
              }}
            >
              Im Pizza-Piloten öffnen (ersetzt aktiven Plan)
            </button>
          </div>
          <p>{changed ? "Ungespeicherter Entwurf" : "Lokal gespeichert"}</p>
        </section>
      </form>
      {saved && (
        <section className="dough-panel">
          <h2>Einkauf vorbereiten</h2>
          <p>
            Die Liste nutzt den gespeicherten Stand dieses Abends inklusive
            Teigzutaten.
          </p>
          <div className="planning-actions">
            <button
              className="button"
              disabled={changed || action.busy}
              onClick={() =>
                void action.run(async () => {
                  await repository.change((w) => {
                    const current = w.evenings.find((e) => e.id === saved.id);
                    if (!current) throw Error("Pizzaabend fehlt.");
                    const existing = w.shopping.find(
                      (l) => l.eveningId === saved.id,
                    );
                    const list = generateShopping(current, existing);
                    w.shopping = [
                      ...w.shopping.filter((l) => l.id !== list.id),
                      list,
                    ];
                    return w;
                  });
                  navigate("/einkaufsliste");
                }, "Einkaufsliste aktualisiert.")
              }
            >
              {state.shopping.some((l) => l.eveningId === saved.id)
                ? "Einkaufsliste neu berechnen"
                : "Einkaufsliste erstellen"}
            </button>
            <Link className="button secondary" to="/einkaufsliste">
              Zur Einkaufsliste
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
