import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useLocal } from "../../app/LocalWorkspace";
import { createPlan, styles, ovens } from "../../core/dough/model";
import {
  toLocalInput,
  fromLocalInput,
  validatePlan,
} from "../../core/dough/calculations";
import { problems, type JournalEntry } from "../../core/baking/model";
import {
  newEntry,
  successful,
  insights,
  compareEntries,
  recipeFromEntry,
} from "../../core/baking/journal";
import { assertEntry, photoLimits } from "../../core/baking/validation";
import { builtInRecipes, saveCustomRecipe } from "../../core/planning/recipes";
import {
  saveEntry,
  removeBakingRecord,
} from "../../infrastructure/storage/bakingRepository";
import { preparePhoto } from "../../infrastructure/storage/photos";
import { PlanEditor } from "../../components/dough/PlanEditor";
import { RecipeSummary } from "../../components/dough/RecipeSummary";
import { Field, useAction } from "../../components/planning/Shared";
import {
  SourceSelect,
  useBakingSource,
  PlanFacts,
  ObservationsEditor,
  observationLabels,
} from "../../components/baking/Shared";
function format(value: number | null) {
  return value === null
    ? "nicht erfasst"
    : new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(
        value,
      );
}
export default function Page() {
  const { state, repository } = useLocal();
  const resolve = useBakingSource();
  const [params] = useSearchParams();
  const initial = params.get("session");
  const [source, setSource] = useState(initial ? "session:" + initial : "new");
  const [draft, setDraft] = useState<JournalEntry>(() =>
    newEntry(
      undefined,
      undefined,
      state?.baking?.sessions.find((s) => s.id === initial),
    ),
  );
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const action = useAction();
  if (!state) return null;
  const entries = state.baking?.entries ?? [];
  const saved = entries.find((e) => e.id === draft.id);
  const recipes = [...builtInRecipes, ...state.recipes];
  const patch = (update: Partial<JournalEntry>) =>
    setDraft({ ...draft, ...update });
  let issue = "";
  try {
    assertEntry(draft);
  } catch (e) {
    issue = (e as Error).message;
  }
  const otherPhotos = entries
    .filter((e) => e.id !== draft.id)
    .flatMap((e) => e.photos);
  const allPhotos = [...otherPhotos, ...draft.photos];
  const bytes = allPhotos.reduce((sum, p) => sum + p.bytes, 0);
  const overPhotos =
    bytes > photoLimits.totalBytes || allPhotos.length > photoLimits.count;
  const dirty = !saved || JSON.stringify(saved) !== JSON.stringify(draft);
  const ordered = [...entries].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );
  const comparisonA = entries.find((e) => e.id === first) ?? ordered.at(-1);
  const comparisonB = entries.find((e) => e.id === second) ?? ordered[0];
  async function addPhoto(file: File) {
    const photo = await preparePhoto(file);
    const id = draft.id;
    setDraft((current) =>
      current.id === id
        ? { ...current, photos: [...current.photos, photo] }
        : current,
    );
  }
  async function save() {
    assertEntry(draft);
    setDraft(await saveEntry(repository, draft));
  }
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">RICORDARE · MIT JEDEM BACKTAG LERNEN</p>
        <h1>Pizza-Tagebuch</h1>
        <p>
          Rezeptur, echte Messwerte und deine Beobachtungen. Lokal auf diesem
          Gerät – einschließlich deiner Fotos.
        </p>
      </div>
      <section className="dough-panel">
        <h2>Backversuch übernehmen</h2>
        <div className="form-grid">
          <SourceSelect value={source} onChange={setSource} includeJournal />
          <Field label="Gespeicherten Eintrag öffnen">
            <select
              value={saved?.id ?? ""}
              disabled={action.busy}
              onChange={(e) => {
                const entry = entries.find((x) => x.id === e.target.value);
                if (entry) setDraft(structuredClone(entry));
              }}
            >
              <option value="">Neuer Entwurf</option>
              {ordered.map((e) => (
                <option key={e.id} value={e.id}>
                  {new Date(e.date).toLocaleDateString("de-DE")} · {e.name}
                  {successful(e) ? " · Gelungen" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="baking-controls">
          <button
            className="button secondary"
            disabled={action.busy}
            onClick={() => {
              const src = resolve(source);
              const entry = newEntry(src.plan, src.evening, src.session);
              if (src.entry) {
                entry.plan = structuredClone(src.entry.plan);
                entry.recipe = structuredClone(src.entry.recipe);
                entry.name = src.entry.name + " · Vergleich";
                entry.name = entry.name.slice(0, 80);
              }
              setDraft(entry);
            }}
          >
            Als neuen Versuch übernehmen
          </button>
          <button
            className="text-button"
            disabled={action.busy}
            onClick={() => setDraft(newEntry(createPlan()))}
          >
            Leerer Standardversuch
          </button>
        </div>
        <p className="baking-muted">
          Die Übernahme erstellt eine Kopie. Bei mehreren Pizzasorten den
          verwendeten Belag unten auswählen. Aus Backläufen wird nur die
          mittlere gemessene Timerdauer übernommen; Solltemperaturen bleiben
          Messfeldern fern.
        </p>
      </section>
      {action.feedback}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(save);
        }}
      >
        <section className="dough-panel">
          <h2>{saved ? "Backversuch bearbeiten" : "Neuer Backversuch"}</h2>
          <div className="form-grid">
            <Field label="Titel des Backversuchs">
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field label="Datum und Uhrzeit des Backversuchs">
              <input
                required
                type="datetime-local"
                value={toLocalInput(draft.date)}
                onChange={(e) => {
                  let date = "";
                  try {
                    date = fromLocalInput(e.target.value);
                  } catch {
                    /* Inline validation keeps the draft intact. */
                  }
                  patch({ date });
                }}
              />
            </Field>
            <Field label="Verwendeter Belag">
              <select
                value={draft.recipe?.id ?? ""}
                onChange={(e) => {
                  const recipe = recipes.find((r) => r.id === e.target.value);
                  patch({ recipe: recipe ? structuredClone(recipe) : null });
                }}
              >
                <option value="">Nur Teigrezeptur / Belag nicht erfasst</option>
                {draft.recipe &&
                  !recipes.some((r) => r.id === draft.recipe!.id) && (
                    <option value={draft.recipe.id}>
                      {draft.recipe.name} · gespeicherte Kopie
                    </option>
                  )}
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <PlanFacts plan={draft.plan} />
          <details className="baking-detail">
            <summary>Verwendete Teigrezeptur ansehen oder korrigieren</summary>
            <p>
              Hier die tatsächlich verwendeten Zutatenprozente, den Pizzastil
              und das Gerät erfassen. Der aktive Teigplan und die Quelle werden
              nicht verändert. Tatsächliche Zeiten und Temperaturen unten
              getrennt notieren.
            </p>
            <PlanEditor
              plan={draft.plan}
              onChange={(plan) => patch({ plan })}
            />
            {!Object.keys(validatePlan(draft.plan)).length && (
              <RecipeSummary plan={draft.plan} />
            )}
          </details>
          <h3>Tatsächliche Zeiten & Temperaturen</h3>
          <p>
            Nur gemessene Werte eingeben. Raum-Stockgare und Stückgare ohne die
            separat erfasste Kaltgare notieren. Backdauer ist pro Pizza bzw. der
            Mittelwert eines übernommenen Backlaufs.
          </p>
          <ObservationsEditor
            value={draft.actual}
            onChange={(actual) => patch({ actual })}
          />
        </section>
        <section className="dough-panel">
          <h2>Wie war deine Pizza?</h2>
          <div className="form-grid">
            {(
              [
                ["taste", "Geschmack"],
                ["structure", "Teigstruktur"],
                ["bake", "Backergebnis"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={`Bewertung ${label}`}>
                <select
                  value={draft.ratings[key] ?? ""}
                  onChange={(e) =>
                    patch({
                      ratings: {
                        ...draft.ratings,
                        [key]: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                >
                  <option value="">Noch nicht bewertet</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                      {n === 1
                        ? " · unzufrieden"
                        : n === 5
                          ? " · ausgezeichnet"
                          : ""}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <h3>Beobachtete Probleme</h3>
          <div className="baking-problems">
            {Object.entries(problems).map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={draft.problems.includes(id as keyof typeof problems)}
                  onChange={(e) =>
                    patch({
                      problems: e.target.checked
                        ? [...draft.problems, id as keyof typeof problems]
                        : draft.problems.filter((p) => p !== id),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <Field label="Notizen zum Backversuch">
            <textarea
              maxLength={8000}
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>
          <p className="baking-muted">
            Probleme werden nur aus deiner Auswahl gezählt, nicht aus Notizen
            erraten. „Gelungen“ bedeutet: alle drei Bewertungen mindestens 4/5
            und kein markiertes Problem.
          </p>
        </section>
        <section className="dough-panel">
          <h2>Fotos · nur lokal</h2>
          <p>
            {allPhotos.length} / {photoLimits.count} Fotos ·{" "}
            {(bytes / 1000000).toFixed(2)} / 5 MB Bilddaten. Maximal 3 Fotos je
            Eintrag, 350 KB je Foto und 1280 Pixel längste Seite. JPEG, PNG und
            WebP werden lokal als JPEG neu gespeichert; Originaldateien bleiben
            unberührt. HEIC bitte vorher als JPEG exportieren.
          </p>
          <Field label="Foto hinzufügen">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={
                action.busy ||
                draft.photos.length >= photoLimits.perEntry ||
                allPhotos.length >= photoLimits.count
              }
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file)
                  void action.run(
                    () => addPhoto(file),
                    "Foto vorbereitet. Bitte Eintrag speichern.",
                  );
              }}
            />
          </Field>
          {overPhotos && (
            <p role="alert" className="planning-error">
              Fotolimit erreicht. Bitte Fotos aus dem Entwurf entfernen oder
              bestehende Einträge bearbeiten. Nichts wurde automatisch gelöscht.
            </p>
          )}
          <div className="photo-grid">
            {draft.photos.map((photo) => (
              <figure key={photo.id}>
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || "Pizza vom Backversuch"}
                  width={photo.width}
                  height={photo.height}
                />
                <figcaption>
                  <Field label="Bildbeschreibung">
                    <input
                      maxLength={200}
                      value={photo.caption}
                      onChange={(e) =>
                        patch({
                          photos: draft.photos.map((p) =>
                            p.id === photo.id
                              ? { ...p, caption: e.target.value }
                              : p,
                          ),
                        })
                      }
                    />
                  </Field>
                  <button
                    className="text-button"
                    type="button"
                    disabled={action.busy}
                    onClick={() =>
                      patch({
                        photos: draft.photos.filter((p) => p.id !== photo.id),
                      })
                    }
                  >
                    Foto aus Entwurf entfernen
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="baking-muted">
            Fotos sind Bestandteil der heruntergeladenen Sicherung. Bei
            Speicherfehlern bleibt der Entwurf sichtbar. Browserdaten regelmäßig
            sichern; keine automatische Cloud-Übertragung.
          </p>
        </section>
        <section className="dough-panel">
          <h2>Versuch festhalten</h2>
          {issue && (
            <p role="alert" className="planning-error">
              {issue}
            </p>
          )}
          <p>{dirty ? "Ungespeicherter Entwurf" : "Lokal gespeichert"}</p>
          <div className="baking-controls">
            <button
              className="button"
              disabled={!!issue || overPhotos || action.busy}
            >
              Backversuch speichern
            </button>
            {saved && (
              <button
                type="button"
                className="text-button"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await removeBakingRecord(
                      repository,
                      "entries",
                      draft.id,
                      draft.revision,
                    );
                    setDraft(newEntry());
                  }, "Eintrag entfernt. Gespeicherte Rezepte bleiben erhalten.")
                }
              >
                Eintrag löschen
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              disabled={action.busy || dirty || !successful(draft) || !!issue}
              onClick={() =>
                void action.run(
                  () =>
                    repository.change((w) => {
                      w.recipes = saveCustomRecipe(
                        w.recipes,
                        recipeFromEntry(draft),
                      );
                      return w;
                    }),
                  "Neue Rezeptkopie mit Teigrezeptur in der Bibliothek gespeichert.",
                )
              }
            >
              Gelungenen Versuch als neues Rezept speichern
            </button>
          </div>
          <p>
            Für die Rezeptkopie zuerst einen gelungenen Versuch speichern. Die
            Kopie enthält Teigrezeptur, erfassten Belag, Messwerte und Notizen;
            Fotos bleiben im Tagebuch.
          </p>
          <Link className="text-button" to="/rezeptbibliothek">
            Zur Rezeptbibliothek
          </Link>
        </section>
      </form>
      <section className="dough-panel">
        <h2>Aus deinen Backversuchen lernen</h2>
        <p>
          {entries.length} gespeicherte Versuche. Kleine Stichproben und eigene
          Bewertungen liefern Hinweise, keine statistisch gesicherten Ursachen
          oder Erfolgsprognosen.
        </p>
        {insights(entries).length ? (
          insights(entries).map((i) => (
            <article className="diagnosis-card" key={i.id}>
              <h3>{i.title}</h3>
              <p>{i.detail}</p>
              <p>{i.suggestion}</p>
            </article>
          ))
        ) : (
          <p>
            Noch kein wiederkehrendes Muster oder als gelungen bewerteter
            Versuch. Ab zwei Einträgen mit demselben markierten Problem
            erscheint ein Hinweis.
          </p>
        )}
        {ordered.filter(successful).map((e) => (
          <p key={e.id}>
            <span className="baking-tag">Gelungen</span>{" "}
            <button
              className="text-button"
              onClick={() => setDraft(structuredClone(e))}
            >
              {e.name} · {new Date(e.date).toLocaleDateString("de-DE")}
            </button>
          </p>
        ))}
      </section>
      {entries.length >= 2 && comparisonA && comparisonB && (
        <section className="dough-panel">
          <h2>Zwei Versuche vergleichen</h2>
          <div className="form-grid">
            <Field label="Erster Vergleichsversuch">
              <select
                value={comparisonA.id}
                onChange={(e) => setFirst(e.target.value)}
              >
                {ordered.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Zweiter Vergleichsversuch">
              <select
                value={comparisonB.id}
                onChange={(e) => setSecond(e.target.value)}
              >
                {ordered.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p>
            Erster: {styles[comparisonA.plan.style].name} ·{" "}
            {ovens[comparisonA.plan.oven]} · {comparisonA.plan.flourProfile} ·{" "}
            {comparisonA.plan.yeastKind}
            <br />
            Zweiter: {styles[comparisonB.plan.style].name} ·{" "}
            {ovens[comparisonB.plan.oven]} · {comparisonB.plan.flourProfile} ·{" "}
            {comparisonB.plan.yeastKind}
          </p>
          <p className="baking-muted">
            Gerät, Mehl und Hefeart können den Vergleich beeinflussen. Fehlende
            Messwerte bleiben unbekannt. Differenz = zweiter minus erster
            Versuch; keine Ursache-Wirkungs-Aussage.
          </p>
          <div className="baking-table-wrap">
            <table className="baking-table">
              <caption>Rezeptur und tatsächlich erfasste Messwerte</caption>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Erster</th>
                  <th>Zweiter</th>
                  <th>Differenz</th>
                </tr>
              </thead>
              <tbody>
                {compareEntries(comparisonA, comparisonB).map((row) => (
                  <tr key={row.label}>
                    <th>
                      {observationLabels[
                        row.label as keyof typeof observationLabels
                      ] ?? row.label}
                    </th>
                    <td>
                      {format(row.first)} {row.first !== null ? row.unit : ""}
                    </td>
                    <td>
                      {format(row.second)} {row.second !== null ? row.unit : ""}
                    </td>
                    <td>
                      {format(
                        row.label === "Hefe (manuell)" &&
                          comparisonA.plan.yeastKind !==
                            comparisonB.plan.yeastKind
                          ? null
                          : row.delta,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
