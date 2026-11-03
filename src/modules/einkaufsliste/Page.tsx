import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocal } from "../../app/LocalWorkspace";
import {
  categories,
  type ShoppingItem,
  type ShoppingList,
} from "../../core/planning/model";
import {
  formatQuantity,
  ingredientKey,
  toBase,
  toBuy,
} from "../../core/planning/calculations";
import { Field, Numeric, useAction } from "../../components/planning/Shared";
export default function Page() {
  const { state, repository } = useLocal();
  const [selected, setSelected] = useState("");
  const [manual, setManual] = useState({
    name: "",
    amount: 1,
    unit: "g" as "g" | "kg" | "ml" | "l" | "Stück",
    category: "Sonstiges" as ShoppingItem["category"],
  });
  const action = useAction();
  if (!state) return null;
  const list =
    state.shopping.find((l) => l.id === selected) ?? state.shopping.at(-1);
  const evening = state.evenings.find((e) => e.id === list?.eveningId);
  async function mutate(change: (l: ShoppingList) => ShoppingList) {
    if (!list) return;
    await repository.change((w) => {
      const current = w.shopping.find((l) => l.id === list.id);
      if (!current) throw Error("Einkaufsliste fehlt.");
      w.shopping = w.shopping.map((l) =>
        l.id === list.id
          ? {
              ...change(structuredClone(current)),
              updatedAt: new Date().toISOString(),
            }
          : l,
      );
      return w;
    });
  }
  function update(id: string, patch: Partial<ShoppingItem>) {
    void action.run(() =>
      mutate((l) => ({
        ...l,
        items: l.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      })),
    );
  }
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">TUTTO PRONTO · ALLES BEREIT</p>
        <h1>Einkaufsliste</h1>
        <p>
          Zusammengefasste Zutaten, Vorräte und deine Ergänzungen. Jede Änderung
          wird direkt lokal gespeichert.
        </p>
      </div>
      <div className="planning-toolbar">
        <Field label="Einkaufsliste auswählen">
          <select
            value={list?.id ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="" disabled>
              Bitte wählen
            </option>
            {state.shopping.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          className="button secondary"
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              const next: ShoppingList = {
                id: crypto.randomUUID(),
                name: "Meine Einkaufsliste",
                eveningId: null,
                sourceUpdatedAt: null,
                items: [],
                updatedAt: new Date().toISOString(),
              };
              await repository.change((w) => {
                w.shopping.push(next);
                return w;
              });
              setSelected(next.id);
            })
          }
        >
          Freie Liste erstellen
        </button>
        <Link className="button secondary" to="/pizzaabend-planer">
          Pizzaabend planen
        </Link>
      </div>
      {action.feedback}
      {!list ? (
        <section className="dough-panel">
          <h2>Dein Einkauf beginnt beim Pizzaabend</h2>
          <p>
            Erstelle dort eine Liste inklusive Teig und Belägen oder starte eine
            freie Liste.
          </p>
        </section>
      ) : (
        <>
          <section className="dough-panel">
            <h2>{list.name}</h2>
            {evening && evening.updatedAt !== list.sourceUpdatedAt && (
              <p role="alert">
                Der Pizzaabend wurde geändert. Bitte im Pizzaabend-Planer die
                Liste neu berechnen. Vorräte und manuelle Änderungen bleiben
                erhalten.
              </p>
            )}
            <p className="planning-muted">
              „Vorhanden“ wird vom Bedarf abgezogen. Vorräte gelten pro Liste;
              es erfolgt keine automatische Bestandsbuchung. Gramm und
              Milliliter werden ohne bekannte Dichte getrennt geführt.
            </p>
            <p>
              {list.items.filter((i) => i.checked || toBuy(i) === 0).length} von{" "}
              {list.items.length} Artikeln erledigt oder vorhanden
            </p>
          </section>
          {categories.map((category) => {
            const items = list.items.filter((i) => i.category === category);
            return (
              items.length > 0 && (
                <section className="dough-panel" key={category}>
                  <h2>{category}</h2>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={item.checked ? "shopping-done" : ""}
                    >
                      <div className="planning-row">
                        <div>
                          <label className="shopping-check">
                            <input
                              type="checkbox"
                              aria-label={`${item.name} abhaken`}
                              disabled={action.busy}
                              checked={item.checked}
                              onChange={(e) =>
                                update(item.id, { checked: e.target.checked })
                              }
                            />
                            <strong>{item.name}</strong>
                          </label>
                          <p className="planning-summary">
                            Noch kaufen: {formatQuantity(toBuy(item))}{" "}
                            {item.unit}
                          </p>
                          {item.sourceRemoved && (
                            <small>
                              Im aktuellen Pizzaabend nicht mehr enthalten.
                            </small>
                          )}
                          {item.edited && (
                            <p className="planning-muted">
                              Manuell geändert. Planbedarf:{" "}
                              {formatQuantity(item.generatedQuantity ?? 0)}{" "}
                              {item.unit}{" "}
                              <button
                                className="text-button"
                                disabled={action.busy}
                                onClick={() =>
                                  update(item.id, {
                                    quantity: item.generatedQuantity ?? 0,
                                    edited: false,
                                  })
                                }
                              >
                                Planmenge übernehmen
                              </button>
                            </p>
                          )}
                        </div>
                        <Numeric
                          label={`Bedarf ${item.name} (${item.unit})`}
                          value={Number(item.quantity.toFixed(item.quantity > 0 && item.quantity < 0.1 ? 4 : 2))}
                          onChange={(n) => {
                            if (Number.isFinite(n) && n >= 0)
                              update(item.id, {
                                quantity: n,
                                edited: !item.manual,
                                checked: false,
                              });
                          }}
                        />
                        <Numeric
                          label={`Vorhanden ${item.name} (${item.unit})`}
                          value={item.onHand}
                          onChange={(n) => {
                            if (Number.isFinite(n) && n >= 0)
                              update(item.id, { onHand: n });
                          }}
                        />
                      </div>
                      <div className="planning-actions">
                        <label className="shopping-check">
                          <input
                            type="checkbox"
                            checked={item.excluded}
                            disabled={action.busy}
                            onChange={(e) =>
                              update(item.id, { excluded: e.target.checked })
                            }
                          />
                          Nicht einkaufen
                        </label>
                        {item.manual && (
                          <>
                            <Field label={`Name ${item.name}`}>
                              <input
                                maxLength={100}
                                defaultValue={item.name}
                                onBlur={(e) => {
                                  if (e.target.value.trim())
                                    update(item.id, {
                                      name: e.target.value.trim(),
                                    });
                                }}
                              />
                            </Field>
                            <Field label={`Kategorie ${item.name}`}>
                              <select
                                value={item.category}
                                onChange={(e) =>
                                  update(item.id, {
                                    category: e.target
                                      .value as ShoppingItem["category"],
                                  })
                                }
                              >
                                {categories.map((c) => (
                                  <option key={c}>{c}</option>
                                ))}
                              </select>
                            </Field>
                            <button
                              className="text-button"
                              disabled={action.busy}
                              onClick={() =>
                                void action.run(() =>
                                  mutate((l) => ({
                                    ...l,
                                    items: l.items.filter(
                                      (i) => i.id !== item.id,
                                    ),
                                  })),
                                )
                              }
                            >
                              Artikel entfernen
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
              )
            );
          })}
          <form
            className="dough-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(() =>
                mutate((l) => {
                  if (
                    !manual.name.trim() ||
                    !Number.isFinite(manual.amount) ||
                    manual.amount <= 0
                  )
                    throw Error("Name und positive Menge eingeben.");
                  const base = toBase({
                    amount: manual.amount,
                    unit: manual.unit,
                  });
                  l.items.push({
                    id: crypto.randomUUID(),
                    key: ingredientKey(manual.name, base.unit),
                    name: manual.name.trim(),
                    unit: base.unit,
                    category: manual.category,
                    quantity: base.amount,
                    generatedQuantity: null,
                    onHand: 0,
                    checked: false,
                    manual: true,
                    edited: false,
                    excluded: false,
                    sourceRemoved: false,
                  });
                  setManual({ ...manual, name: "" });
                  return l;
                }),
              );
            }}
          >
            <h2>Artikel ergänzen</h2>
            <div className="form-grid">
              <Field label="Artikelname">
                <input
                  required
                  maxLength={100}
                  value={manual.name}
                  onChange={(e) =>
                    setManual({ ...manual, name: e.target.value })
                  }
                />
              </Field>
              <Numeric
                label="Artikelmenge"
                min={0.001}
                value={manual.amount}
                onChange={(amount) => setManual({ ...manual, amount })}
              />
              <Field label="Artikeleinheit">
                <select
                  value={manual.unit}
                  onChange={(e) =>
                    setManual({
                      ...manual,
                      unit: e.target.value as typeof manual.unit,
                    })
                  }
                >
                  {["g", "kg", "ml", "l", "Stück"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
              <Field label="Artikelkategorie">
                <select
                  value={manual.category}
                  onChange={(e) =>
                    setManual({
                      ...manual,
                      category: e.target.value as typeof manual.category,
                    })
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <button className="button" disabled={action.busy}>
              Artikel hinzufügen
            </button>
          </form>
        </>
      )}
    </>
  );
}
