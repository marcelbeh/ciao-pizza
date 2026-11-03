import { AcademyLink } from "../../components/AcademyLink";
import { useState } from "react";
import { useLocal } from "../../app/LocalWorkspace";
import { createPlan } from "../../core/dough/model";
import {
  problems,
  emptyObservations,
  type DiagnosticInput,
  type Diagnosis,
} from "../../core/baking/model";
import { localDiagnosisEngine } from "../../core/baking/diagnosis";
import { assertDiagnostic } from "../../core/baking/validation";
import {
  saveDiagnosis,
  removeBakingRecord,
} from "../../infrastructure/storage/bakingRepository";
import { Field, useAction } from "../../components/planning/Shared";
import {
  SourceSelect,
  PlanFacts,
  ObservationsEditor,
  useBakingSource,
} from "../../components/baking/Shared";
import { newEntry } from "../../core/baking/journal";
export default function Page() {
  const { state, repository } = useLocal();
  const sourceData = useBakingSource();
  const [source, setSource] = useState("new");
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<DiagnosticInput>(() => ({
    problem: "sticky",
    plan: createPlan(),
    actual: emptyObservations(),
    temperature: "unknown",
    rest: "unknown",
    rise: "unknown",
    browning: "both",
  }));
  const [result, setResult] = useState<Diagnosis | null>(null);
  const action = useAction();
  if (!state) return null;
  function update(patch: Partial<DiagnosticInput>) {
    setInput({ ...input, ...patch });
    setResult(null);
  }
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">CAPIRE · VERSTEHEN & VERBESSERN</p>
        <h1>Teig-Doc</h1>
        <p>
          Nachvollziehbare Hilfe für typische Weizen-Pizzateige. Regeln statt
          einer behaupteten KI-Diagnose.
        </p>
      </div>
      <AcademyLink article="fehler" section="teig">
        Typische Fehler einordnen
      </AcademyLink>
      <section className="dough-panel">
        <h2>Deine Ausgangsdaten</h2>
        <SourceSelect value={source} onChange={setSource} includeJournal />
        <div className="baking-controls">
          <button
            className="button secondary"
            onClick={() => {
              const src = sourceData(source);
              update({
                plan: structuredClone(src.plan ?? createPlan()),
                actual: structuredClone(
                  src.entry?.actual ??
                    (src.session
                      ? newEntry(src.plan, undefined, src.session).actual
                      : emptyObservations()),
                ),
              });
              setStep(0);
            }}
          >
            Ausgangsdaten übernehmen
          </button>
        </div>
        <PlanFacts plan={input.plan} />
        <Field label="Gespeicherte Diagnose öffnen">
          <select
            value=""
            onChange={(e) => {
              const record = state.baking?.diagnoses.find(
                (d) => d.id === e.target.value,
              );
              if (record) {
                setInput(structuredClone(record.input));
                setResult(structuredClone(record.result));
                setStep(2);
              }
            }}
          >
            <option value="">Diagnose auswählen</option>
            {state.baking?.diagnoses.map((d) => (
              <option key={d.id} value={d.id}>
                {new Date(d.createdAt).toLocaleDateString("de-DE")} ·{" "}
                {problems[d.input.problem]}
              </option>
            ))}
          </select>
        </Field>
      </section>
      {action.feedback}
      <section className="dough-panel">
        <p className="eyebrow">SCHRITT {step + 1} VON 3</p>
        <progress
          className="coach-progress"
          aria-label="Diagnosefortschritt"
          max={3}
          value={step + 1}
        />
        {step === 0 && (
          <>
            <h2>Was beobachtest du?</h2>
            <Field label="Teig- oder Backproblem">
              <select
                value={input.problem}
                onChange={(e) =>
                  update({
                    problem: e.target.value as DiagnosticInput["problem"],
                  })
                }
              >
                {Object.entries(problems).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="baking-controls">
              <button className="button" onClick={() => setStep(1)}>
                Weiter zu Beobachtungen
              </button>
            </div>
          </>
        )}
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action.run(async () => {
                assertDiagnostic(input);
                setResult(await localDiagnosisEngine.analyze(input));
                setStep(2);
              }, "Regelprüfung abgeschlossen.");
            }}
          >
            <h2>Beobachtung vor Vermutung</h2>
            <div className="form-grid">
              <Field label="Teig beim Formen">
                <select
                  value={input.temperature}
                  onChange={(e) =>
                    update({
                      temperature: e.target
                        .value as DiagnosticInput["temperature"],
                    })
                  }
                >
                  <option value="unknown">Nicht beurteilt</option>
                  <option value="cold">Noch kalt</option>
                  <option value="warm">Auffällig warm</option>
                </select>
              </Field>
              <Field label="Entspannung / Raumphase">
                <select
                  value={input.rest}
                  onChange={(e) =>
                    update({ rest: e.target.value as DiagnosticInput["rest"] })
                  }
                >
                  <option value="unknown">Nicht beurteilt</option>
                  <option value="short">
                    Kurz nach dem Rundwirken geformt
                  </option>
                  <option value="long">Sehr lange in warmer Umgebung</option>
                </select>
              </Field>
              <Field label="Volumen und Struktur">
                <select
                  value={input.rise}
                  onChange={(e) =>
                    update({ rise: e.target.value as DiagnosticInput["rise"] })
                  }
                >
                  <option value="unknown">Nicht beurteilt</option>
                  <option value="none">Keine erkennbare Zunahme</option>
                  <option value="springy">Elastisch und stabil</option>
                  <option value="collapsed">Kollabiert / zerfließt</option>
                </select>
              </Field>
              <Field label="Auffällige Bräunung">
                <select
                  value={input.browning}
                  onChange={(e) =>
                    update({
                      browning: e.target.value as DiagnosticInput["browning"],
                    })
                  }
                >
                  <option value="both">Beide Seiten / unklar</option>
                  <option value="top">Oberseite</option>
                  <option value="bottom">Unterseite</option>
                </select>
              </Field>
            </div>
            <details className="baking-detail">
              <summary>Tatsächliche Zeiten und Temperaturen ergänzen</summary>
              <p>
                Unbekannte Werte leer lassen. Kaltgare zusätzlich zu den
                Raumphasen erfassen, nicht doppelt zählen.
              </p>
              <ObservationsEditor
                value={input.actual}
                onChange={(actual) => update({ actual })}
              />
            </details>
            <div className="baking-controls">
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(0)}
              >
                Zur Problemauswahl
              </button>
              <button className="button" disabled={action.busy}>
                Regeln auswerten
              </button>
            </div>
          </form>
        )}
        {step === 2 && result && (
          <>
            <h2>{problems[input.problem]}</h2>
            <p className="baking-note">{result.note}</p>
            {result.findings.map((f) => (
              <article className="diagnosis-card" key={f.id}>
                <h3>{f.cause}</h3>
                <p className="baking-muted">
                  Warum dieser Hinweis: {f.evidence}
                </p>
                <h4>Jetzt tun</h4>
                <p>{f.now}</p>
                <h4>Nächstes Mal</h4>
                <p>{f.next}</p>
                <details className="baking-detail">
                  <summary>Parameter verstehen</summary>
                  <p>{f.parameter}</p>
                </details>
              </article>
            ))}
            <div className="baking-controls">
              <button
                className="button secondary"
                onClick={() => {
                  setResult(null);
                  setStep(1);
                }}
              >
                Beobachtungen ändern
              </button>
              <button
                className="button"
                disabled={action.busy}
                onClick={() =>
                  void action.run(
                    () =>
                      saveDiagnosis(repository, {
                        id: crypto.randomUUID(),
                        createdAt: new Date().toISOString(),
                        input: structuredClone(input),
                        result: structuredClone(result),
                      }),
                    "Diagnose lokal gespeichert.",
                  )
                }
              >
                Diagnose speichern
              </button>
            </div>
            <p className="baking-muted">
              Lokales Regelwerk · Keine Datenübertragung, kein kostenpflichtiger
              Dienst. Grundlage u. a.{" "}
              <a
                href="https://www.kingarthurbaking.com/learn/pizza"
                target="_blank"
                rel="noreferrer"
              >
                King Arthur: Pizza-Grundlagen
              </a>{" "}
              und{" "}
              <a
                href="https://ooni.com/blogs/ooni-insights/how-to-make-your-first-ooni-pizza"
                target="_blank"
                rel="noreferrer"
              >
                Ooni: Backpraxis
              </a>
              . Schwellenwerte sind redaktionelle Prüfhinweise.
            </p>
          </>
        )}
      </section>
      {!!state.baking?.diagnoses.length && (
        <details className="dough-panel baking-detail">
          <summary>
            Gespeicherte Diagnosen verwalten ({state.baking.diagnoses.length}
            /100)
          </summary>
          {state.baking.diagnoses.map((d) => (
            <div className="planning-toolbar" key={d.id}>
              <span>
                {problems[d.input.problem]} ·{" "}
                {new Date(d.createdAt).toLocaleDateString("de-DE")}
              </span>
              <button
                className="text-button"
                disabled={action.busy}
                onClick={() =>
                  void action.run(
                    () => removeBakingRecord(repository, "diagnoses", d.id),
                    "Diagnose entfernt.",
                  )
                }
              >
                Diagnose entfernen
              </button>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
