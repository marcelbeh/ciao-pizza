import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLocal } from "../../app/LocalWorkspace";
import { useDough } from "../../app/DoughProvider";
import { ovens, ovenDefaults } from "../../core/dough/model";
import {
  newSession,
  transition,
  recommendations,
  remaining,
  elapsed,
  clockLabel,
  coachHint,
  freshTimer,
} from "../../core/baking/coach";
import { assertSession } from "../../core/baking/validation";
import type { BakeSettings, CoachSession } from "../../core/baking/model";
import {
  saveSession,
  removeBakingRecord,
} from "../../infrastructure/storage/bakingRepository";
import { Field, Numeric, useAction } from "../../components/planning/Shared";
import {
  PlanFacts,
  SourceSelect,
  useBakingSource,
} from "../../components/baking/Shared";
const steps = {
  preheat: "Vorheizen",
  prepare: "Vorbereiten",
  bake: "Backen",
  check: "Prüfen",
  complete: "Fertig",
};
export default function Page() {
  const { state, repository } = useLocal();
  const dough = useDough();
  const resolve = useBakingSource();
  const [source, setSource] = useState("new");
  const [session, setSession] = useState<CoachSession | null>(
    () => state?.baking?.sessions.at(-1) ?? null,
  );
  const action = useAction();
  const [now, setNow] = useState(Date.now());
  const focus = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === focus.current);
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
    };
  }, []);
  // Timestamp math stays in the domain; only redraw an actually running, visible timer.
  useEffect(() => {
    if (!session || session.timer.startedAt === null) return;
    const update = () => setNow(Date.now());
    const tick = setInterval(() => {
      if (!document.hidden) update();
    }, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", update);
    };
  }, [session?.timer.startedAt]);
  if (!state) return null;
  const editable =
    session?.step === "preheat" &&
    session.timer.startedAt === null &&
    session.timer.elapsedMs === 0;
  let issue = "";
  if (session)
    try {
      assertSession(session);
    } catch (e) {
      issue = (e as Error).message;
    }
  async function act(kind: Parameters<typeof transition>[1]) {
    if (!session) return;
    const next = transition(session, kind);
    setSession(await saveSession(repository, next));
    setNow(Date.now());
  }
  function settings(patch: Partial<BakeSettings>) {
    if (session) {
      const next = { ...session.settings, ...patch };
      setSession({
        ...session,
        settings: next,
        timer: freshTimer(next.preheatMinutes * 60),
      });
    }
  }
  async function toggleFullscreen() {
    if (!focus.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (focus.current.requestFullscreen)
      await focus.current.requestFullscreen();
    else
      throw Error(
        "Dieser Browser unterstützt Vollbild nicht. Du kannst den Backcoach normal weiter nutzen.",
      );
  }
  const left = session ? remaining(session.timer, now) : 0;
  const due =
    session?.step === "bake" &&
    elapsed(session.timer, now) >=
      (session.lastTurnMs ?? 0) + session.settings.turnSeconds * 1000;
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">AL FORNO · SCHRITT FÜR SCHRITT</p>
        <h1>Backcoach</h1>
        <p>
          Dein geführter Backmodus. Richtwerte lassen sich an dein Gerät
          anpassen; der sichtbare Backzustand entscheidet.
        </p>
      </div>
      <section className="dough-panel">
        <h2>Backlauf wählen</h2>
        <div className="form-grid">
          <SourceSelect value={source} onChange={setSource} />
          <Field label="Gespeicherten Backlauf öffnen">
            <select
              value={session?.revision ? session.id : ""}
              onChange={(e) => {
                const s = state.baking?.sessions.find(
                  (s) => s.id === e.target.value,
                );
                if (s) setSession(structuredClone(s));
              }}
            >
              <option value="">Neuer Entwurf</option>
              {state.baking?.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.completed.length}/{s.pizzas.length}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="baking-controls">
          <button
            className="button secondary"
            disabled={!dough.ready || action.busy}
            onClick={() => {
              const src = resolve(source);
              const next = newSession(src.plan, src.evening);
              if (src.session) {
                next.pizzas = structuredClone(src.session.pizzas);
                next.recipes = structuredClone(src.session.recipes);
                next.name = src.session.name;
              }
              setSession(next);
            }}
          >
            Neuen Backlauf vorbereiten
          </button>
          {!!session?.revision && (
            <button
              className="text-button"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await removeBakingRecord(
                    repository,
                    "sessions",
                    session.id,
                    session.revision,
                  );
                  setSession(null);
                }, "Backlauf entfernt. Tagebucheinträge behalten ihre Kopien.")
              }
            >
              Backlauf entfernen
            </button>
          )}
        </div>
        <p className="baking-muted">
          Neue Läufe ersetzen keine bestehenden. Maximal 30 Läufe; Timer laufen
          nach Zeitstempeln weiter. Im Hintergrund oder bei gesperrtem
          Bildschirm gibt es keinen verlässlichen Alarm. Ofen und Pizza selbst
          im Blick behalten.
        </p>
      </section>
      {action.feedback}
      {session && (
        <section ref={focus} className="dough-panel coach-focus">
          <div className="planning-toolbar">
            <h2>{session.name}</h2>
            <button
              className="button secondary"
              disabled={action.busy}
              onClick={() =>
                void action.run(toggleFullscreen, "Ansicht angepasst.")
              }
            >
              {fullscreen ? "Vollbild verlassen" : "Vollbild"}
            </button>
          </div>
          <PlanFacts plan={session.plan} />
          <p className="baking-muted">
            Geplanter Backbeginn:{" "}
            {new Intl.DateTimeFormat("de-DE", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: session.plan.timeZone,
            }).format(new Date(session.plan.bakeAt))}{" "}
            ({session.plan.timeZone}). Vor dem Einschieben auch Teigentspannung
            und Stein prüfen; die Uhrzeit allein belegt keine Reife.
          </p>
          <ol className="coach-steps" aria-label="Backschritte">
            {Object.entries(steps).map(([key, title]) => (
              <li
                key={key}
                aria-current={session.step === key ? "step" : undefined}
              >
                {title}
              </li>
            ))}
          </ol>
          <label htmlFor="pizza-progress">
            {session.completed.length} von {session.pizzas.length} Pizzen fertig
          </label>
          <progress
            id="pizza-progress"
            className="coach-progress"
            max={session.pizzas.length}
            value={session.completed.length}
          />
          <p className="baking-note">
            {coachHint(session)} Alle Werte sind Richtwerte für
            Weizen-Pizzateige. Gerätegrenzen und Herstelleranleitung haben
            Vorrang; keine automatische Ofensteuerung.
          </p>
          {session.step === "preheat" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action.run(async () =>
                  setSession(await saveSession(repository, session)),
                );
              }}
            >
              <fieldset disabled={!editable || action.busy}>
                <legend>Gerät & Richtwerte einstellen</legend>
                <div className="form-grid">
                  <Field label="Backgerät">
                    <select
                      value={session.plan.oven}
                      onChange={(e) => {
                        const oven = e.target.value as typeof session.plan.oven;
                        const plan = {
                          ...session.plan,
                          oven,
                          ...ovenDefaults(oven, session.plan.style),
                        };
                        const next = recommendations(plan);
                        setSession({
                          ...session,
                          plan,
                          settings: next,
                          timer: freshTimer(next.preheatMinutes * 60),
                        });
                      }}
                    >
                      {Object.entries(ovens).map(([id, title]) => (
                        <option key={id} value={id}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Numeric
                    label="Backtemperatur Soll (°C)"
                    min={100}
                    max={session.plan.oven === "home" ? 350 : 550}
                    value={session.settings.ovenC}
                    onChange={(ovenC) => settings({ ovenC })}
                  />
                  <Numeric
                    label="Steintemperatur Soll (°C)"
                    min={50}
                    max={session.plan.oven === "home" ? 350 : 550}
                    value={session.settings.stoneC}
                    onChange={(stoneC) => settings({ stoneC })}
                  />
                  {session.plan.oven !== "grill" && (
                    <>
                      <Field label="Oberhitze separat einstellbar">
                        <select
                          value={session.settings.topC === null ? "no" : "yes"}
                          onChange={(e) =>
                            settings({
                              topC:
                                e.target.value === "yes"
                                  ? session.settings.ovenC
                                  : null,
                            })
                          }
                        >
                          <option value="no">Keine getrennte Regelung</option>
                          <option value="yes">
                            Gerät erlaubt getrennte Temperatur
                          </option>
                        </select>
                      </Field>
                      {session.settings.topC !== null && (
                        <Numeric
                          label="Oberhitze Soll (°C)"
                          min={100}
                          max={550}
                          value={session.settings.topC}
                          onChange={(topC) => settings({ topC })}
                        />
                      )}
                    </>
                  )}
                  <Numeric
                    label="Vorheizen (min)"
                    min={5}
                    max={120}
                    value={session.settings.preheatMinutes}
                    onChange={(preheatMinutes) => settings({ preheatMinutes })}
                  />
                  <Numeric
                    label="Backdauer Richtwert (s)"
                    min={10}
                    max={1800}
                    value={session.settings.bakeSeconds}
                    onChange={(bakeSeconds) =>
                      settings({
                        bakeSeconds,
                        turnSeconds: Math.min(
                          session.settings.turnSeconds,
                          bakeSeconds,
                        ),
                      })
                    }
                  />
                  <Numeric
                    label="Drehhinweis alle (s)"
                    min={5}
                    max={session.settings.bakeSeconds}
                    value={session.settings.turnSeconds}
                    onChange={(turnSeconds) => settings({ turnSeconds })}
                  />
                </div>
              </fieldset>
              {editable && (
                <button
                  className="button secondary"
                  disabled={!!issue || action.busy}
                >
                  Backlauf speichern
                </button>
              )}
              <p>
                Nach Timerstart sind diese Einstellungen geschützt. Ein
                Timer-Neustart gibt sie im Vorheizschritt wieder frei.
              </p>
            </form>
          )}
          {issue && (
            <p role="alert" className="planning-error">
              {issue}
            </p>
          )}
          {(session.step === "preheat" || session.step === "bake") && (
            <>
              <div
                className="coach-timer"
                role="timer"
                aria-label="Verbleibende Zeit"
                aria-live="off"
              >
                {clockLabel(left)}
              </div>
              {left === 0 && (
                <p className="baking-note">
                  Richtzeit erreicht. Jetzt nach Sicht und Messung prüfen; der
                  Coach schaltet nicht automatisch weiter.
                </p>
              )}
              {session.step === "bake" && (
                <p>
                  Pizza {session.completed.length + 1}:{" "}
                  <strong>{session.pizzas[session.completed.length]}</strong>
                </p>
              )}
              <div className="baking-controls">
                <button
                  className="button"
                  disabled={
                    !!issue || action.busy || session.timer.startedAt !== null
                  }
                  onClick={() =>
                    void action.run(() => act("start"), "Timer läuft.")
                  }
                >
                  Timer starten / fortsetzen
                </button>
                <button
                  className="button secondary"
                  disabled={action.busy || session.timer.startedAt === null}
                  onClick={() =>
                    void action.run(() => act("pause"), "Timer pausiert.")
                  }
                >
                  Pause
                </button>
                <button
                  className="button secondary"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => act("restart"),
                      "Timer auf Anfang zurückgesetzt.",
                    )
                  }
                >
                  Timer neu starten
                </button>
              </div>
            </>
          )}
          {session.step === "preheat" && (
            <>
              <h3>Stein wirklich bereit?</h3>
              <p>
                Timer allein genügt nicht: Oberfläche möglichst mit
                Infrarotthermometer prüfen. Im Haushaltsofen kann das
                Durchheizen länger als die Aufheizanzeige dauern; beim Grill
                indirekt aufheizen.
              </p>
              <div className="baking-controls">
                <button
                  className="button"
                  disabled={!!issue || action.busy}
                  onClick={() =>
                    void action.run(() => act("ready"), "Vorheizen bestätigt.")
                  }
                >
                  Stein geprüft – weiter
                </button>
              </div>
            </>
          )}
          {session.step === "prepare" && (
            <>
              <h3>Pizza {session.completed.length + 1} vorbereiten</h3>
              <p>
                <strong>{session.pizzas[session.completed.length]}</strong> ·
                Teig behutsam öffnen, Belag sparsam und abgetropft auflegen.
                Prüfen, ob die Pizza frei auf dem Schieber gleitet. Zwischen
                Pizzen den Stein wieder auf Solltemperatur kommen lassen.
              </p>
              <div className="baking-controls">
                <button
                  className="button"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(() => act("launch"), "Backtimer gestartet.")
                  }
                >
                  Pizza einschieben & Timer starten
                </button>
              </div>
            </>
          )}
          {session.step === "bake" && (
            <>
              <p role="status" className={due ? "baking-note" : "baking-muted"}>
                {due
                  ? "Drehhinweis: Ist der Teigboden stabil? Pizza vorsichtig drehen und Bräunung prüfen."
                  : "Erst drehen, wenn sich der Boden sicher lösen lässt. Drehhinweise sind Richtwerte."}
              </p>
              <div className="baking-controls">
                <button
                  className="button secondary"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(() => act("turn"), "Drehung vermerkt.")
                  }
                >
                  Pizza gedreht
                </button>
                <button
                  className="button"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => act("check"),
                      "Backtimer pausiert: Ergebnis prüfen.",
                    )
                  }
                >
                  Pizza herausnehmen & prüfen
                </button>
              </div>
            </>
          )}
          {session.step === "check" && (
            <>
              <h3>Ergebnis prüfen</h3>
              <p>
                Rand und Unterseite gebräunt? Mitte stabil und durchgebacken?
                Die gemessene Timerzeit beträgt{" "}
                {clockLabel(elapsed(session.timer, now))}. Eine Pause zählt
                nicht zur Backdauer.
              </p>
              <div className="baking-controls">
                <button
                  className="button secondary"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => act("continue"),
                      "Backtimer läuft weiter.",
                    )
                  }
                >
                  Weiterbacken
                </button>
                <button
                  className="button"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => act("done"),
                      "Pizza als fertig vermerkt.",
                    )
                  }
                >
                  Pizza fertig – nächste
                </button>
              </div>
            </>
          )}
          {session.step === "complete" && (
            <>
              <h3>Buon appetito!</h3>
              <p>
                Alle {session.pizzas.length} Pizzen sind als fertig vermerkt.
                Die tatsächliche Garzeit und Temperatur kannst du im Tagebuch
                ergänzen; Solltemperaturen werden dort nicht als Messwerte
                ausgegeben.
              </p>
              <Link
                className="button"
                to={"/pizza-tagebuch?session=" + session.id}
              >
                Backlauf ins Tagebuch übernehmen
              </Link>
            </>
          )}
          {session.completed.length > 0 && (
            <details className="baking-detail">
              <summary>Fertige Pizzen ansehen</summary>
              <ol>
                {session.completed.map((p, i) => (
                  <li key={i}>
                    {p.name} · {Math.round(p.seconds)} s Timerzeit
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>
      )}
    </>
  );
}
