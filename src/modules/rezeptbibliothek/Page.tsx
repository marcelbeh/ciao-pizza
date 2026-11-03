import { useState } from "react";
import { useLocal } from "../../app/LocalWorkspace";
import { styles } from "../../core/dough/model";
import {
  categories,
  toppings,
  units,
  type Recipe,
} from "../../core/planning/model";
import {
  builtInRecipes,
  duplicateRecipe,
  isOriginal,
  saveCustomRecipe,
  scaleRecipe,
} from "../../core/planning/recipes";
import { formatQuantity } from "../../core/planning/calculations";
import { Field, Numeric, useAction } from "../../components/planning/Shared";
export default function Page() {
  const { state, repository } = useLocal();
  const action = useAction();
  const [selected, setSelected] = useState(builtInRecipes[0].id);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [baseline, setBaseline] = useState("");
  const [style, setStyle] = useState("");
  const [topping, setTopping] = useState("");
  const [pizzas, setPizzas] = useState(1);
  if (!state) return null;
  const recipes = [...builtInRecipes, ...state.recipes];
  const current = recipes.find((r) => r.id === selected) ?? recipes[0];
  const shown = recipes.filter(
    (r) => (!style || r.style === style) && (!topping || r.topping === topping),
  );
  const edit = (next: Partial<Recipe>) =>
    setDraft(draft ? { ...draft, ...next } : null);
  let scaled: ReturnType<typeof scaleRecipe> = [];
  let scaleError = "";
  try {
    scaled = scaleRecipe(current, pizzas);
  } catch (e) {
    scaleError = (e as Error).message;
  }
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">DEINE SAMMLUNG · DEIN GESCHMACK</p>
        <h1>Rezeptbibliothek</h1>
        <p>
          Beläge und Zubereitung für deinen Pizzaabend. Der Teig wird im
          Pizza-Piloten geplant.
        </p>
      </div>
      <div className="planning-toolbar">
        <Field label="Pizzastil filtern">
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">Alle Stile</option>
            {Object.entries(styles).map(([id, s]) => (
              <option key={id} value={id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Belag filtern">
          <select value={topping} onChange={(e) => setTopping(e.target.value)}>
            <option value="">Alle Beläge</option>
            {toppings.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <button
          className="button"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: "Mein Rezept",
              style: "custom",
              topping: "Vegetarisch",
              yieldPizzas: 1,
              ingredients: [
                {
                  id: crypto.randomUUID(),
                  name: "Mozzarella",
                  amount: 80,
                  unit: "g",
                  category: "Käse",
                },
              ],
              instructions: "",
            })
          }
        >
          Eigenes Rezept erstellen
        </button>
      </div>
      {action.feedback}
      <div className="planning-grid two">
        <section className="dough-panel">
          <h2>Rezepte entdecken</h2>
          {shown.length === 0 && <p>Keine Rezepte für diese Auswahl.</p>}
          {shown.map((r) => (
            <button
              className="text-button"
              style={{ display: "block", padding: ".7rem" }}
              key={r.id}
              aria-pressed={current.id === r.id}
              onClick={() => setSelected(r.id)}
            >
              {r.name} {isOriginal(r.id) ? "· Original" : ""}
            </button>
          ))}
        </section>
        <section className="dough-panel">
          <h2>{current.name}</h2>
          <p>
            {styles[current.style].name} · {current.topping} ·{" "}
            {isOriginal(current.id) ? "Geschütztes Original" : "Eigenes Rezept"}
          </p>
          <Numeric
            label="Rezept für Pizzen"
            min={1}
            max={500}
            step={1}
            value={pizzas}
            onChange={setPizzas}
          />
          {scaleError ? (
            <p className="planning-error">{scaleError}</p>
          ) : (
            <ul>
              {scaled.map((i) => (
                <li key={i.id}>
                  {formatQuantity(i.amount)} {i.unit} {i.name}
                </li>
              ))}
            </ul>
          )}
          <p className="recipe-instructions">{current.instructions}</p>
          <div className="planning-actions">
            <button
              className="button secondary"
              onClick={() => setDraft(duplicateRecipe(current))}
            >
              {isOriginal(current.id) ? "Als Kopie bearbeiten" : "Duplizieren"}
            </button>
            {!isOriginal(current.id) && (
              <>
                <button
                  className="button secondary"
                  onClick={() => {
                    setBaseline(JSON.stringify(current));
                    setDraft(structuredClone(current));
                  }}
                >
                  Bearbeiten
                </button>
                <button
                  className="text-button"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () =>
                        repository.change((w) => {
                          w.recipes = w.recipes.filter(
                            (r) => r.id !== current.id,
                          );
                          return w;
                        }),
                      "Rezept gelöscht. Gespeicherte Pizzaabende behalten ihre Rezeptkopie.",
                    )
                  }
                >
                  Löschen
                </button>
              </>
            )}
          </div>
        </section>
      </div>
      {draft && (
        <form
          className="dough-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await repository.change((w) => {
                const existing = w.recipes.find((r) => r.id === draft.id);
                if (existing && JSON.stringify(existing) !== baseline)
                  throw Error(
                    "Dieses Rezept wurde inzwischen geändert. Bitte neu öffnen.",
                  );
                if (
                  !existing &&
                  baseline &&
                  JSON.parse(baseline).id === draft.id
                )
                  throw Error(
                    "Dieses Rezept wurde inzwischen gelöscht. Bitte als neue Kopie speichern.",
                  );
                w.recipes = saveCustomRecipe(w.recipes, draft);
                return w;
              });
              setSelected(draft.id);
              setDraft(null);
            });
          }}
        >
          <h2>Rezept bearbeiten</h2>
          <div className="form-grid">
            <Field label="Rezeptname">
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => edit({ name: e.target.value })}
              />
            </Field>
            <Field label="Pizzastil">
              <select
                value={draft.style}
                onChange={(e) =>
                  edit({ style: e.target.value as Recipe["style"] })
                }
              >
                {Object.entries(styles).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Belag">
              <select
                value={draft.topping}
                onChange={(e) =>
                  edit({ topping: e.target.value as Recipe["topping"] })
                }
              >
                {toppings.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Numeric
              label="Grundrezept für Pizzen"
              min={1}
              max={50}
              step={1}
              value={draft.yieldPizzas}
              onChange={(n) => edit({ yieldPizzas: n })}
            />
          </div>
          <h3>Zutaten · ohne Teig</h3>
          {draft.ingredients.map((i, index) => {
            const update = (patch: Partial<typeof i>) =>
              edit({
                ingredients: draft.ingredients.map((x) =>
                  x.id === i.id ? { ...x, ...patch } : x,
                ),
              });
            return (
              <div className="planning-row ingredient" key={i.id}>
                <Field label={`Zutat ${index + 1}`}>
                  <input
                    required
                    maxLength={100}
                    value={i.name}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </Field>
                <Numeric
                  label={`Menge ${index + 1}`}
                  min={0.001}
                  value={i.amount}
                  onChange={(n) => update({ amount: n })}
                />
                <Field label={`Einheit ${index + 1}`}>
                  <select
                    value={i.unit}
                    onChange={(e) =>
                      update({ unit: e.target.value as typeof i.unit })
                    }
                  >
                    {units.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </Field>
                <Field label={`Kategorie ${index + 1}`}>
                  <select
                    value={i.category}
                    onChange={(e) =>
                      update({ category: e.target.value as typeof i.category })
                    }
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    edit({
                      ingredients: draft.ingredients.filter(
                        (x) => x.id !== i.id,
                      ),
                    })
                  }
                >
                  Entfernen
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="text-button"
            disabled={draft.ingredients.length >= 80}
            onClick={() =>
              edit({
                ingredients: [
                  ...draft.ingredients,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    amount: 1,
                    unit: "g",
                    category: "Sonstiges",
                  },
                ],
              })
            }
          >
            Zutat hinzufügen
          </button>
          <Field label="Zubereitung">
            <textarea
              required
              maxLength={8000}
              value={draft.instructions}
              onChange={(e) => edit({ instructions: e.target.value })}
            />
          </Field>
          <div className="planning-actions">
            <button className="button" disabled={action.busy}>
              Rezept speichern
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setDraft(null)}
            >
              Bearbeitung schließen
            </button>
          </div>
        </form>
      )}
    </>
  );
}
