import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { calculateFormula } from '../core/dough/forno';
import { recipeSnapshot } from '../core/maturity/model';
import { cookPosition, createCookSession, timerRemaining, type CookSession } from '../core/dough/cookSession';
import { tm5Recipe, TM5_MANUAL_SOURCE } from '../core/dough/tm5';
import type { CookRepository } from '../infrastructure/storage/cookRepository';
import { SharedTemperatures, type MonitorAccess } from '../app/MaturityPage';
import { calculateSchedule } from '../core/schedule/plan';
import { Icon } from './Icon';
export type CookAccess = { session: CookSession | null; error: string; repository: CookRepository;
  run: (task: () => Promise<CookSession>) => Promise<void> };
const grams = (n: number) => n > 0 && n < .01 ? '< 0,01' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
const clock = (ms: number) => { const seconds = Math.ceil(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
const titles = ['Vorbereitung und Wassertemperatur', 'Mehl und Wasser mischen', 'Autolyse', 'Trockenhefe einarbeiten', 'Salz einarbeiten', 'Kontrolliert fertigkneten', 'Teigtemperatur messen', 'Stockgare starten'];
function CookStepSettings({ step, minutes, access }: { step: number; minutes: number; access: MonitorAccess }) {
  const firstPhase = access.schedule && !access.scheduleError ? calculateSchedule(access.schedule).find(phase => phase.id === 'bulk' || phase.id === 'cold-bulk') : null;
  const facts = step === 0 ? [['Wasser', 'Kalt möglich', 'Ausgangstemperatur selbst prüfen']]
    : step === 1 ? [['Mischzeit / Drehzahl', 'Nicht bestätigt', 'Keine konkrete Geräteangabe für dieses Rezept']]
    : step === 2 ? [['Ruhezeit', `${minutes} Min.`, 'Persönliche Autolyse-Vorgabe']]
    : step === 3 || step === 4 ? [['Einarbeiten', 'Von Hand', 'Keine unbestätigte Geräteeinstellung']]
    : step === 5 ? [['Modus', 'Teigstufe', 'Nur nach geprüftem TM5-Rezept'], ['Drehrichtung', 'Automatischer Wechsel', 'Im Teigmodus · kein zusätzlicher Linkslauf'], ['Dauer / Drehzahl', 'Nicht bestätigt', 'Keine Rezeptintervalle vorgeben']]
    : step === 6 ? [['Teigtemperatur', 'Messen', 'Nach allen Chargen einmal erfassen']]
    : [['Gärstart laut Plan', firstPhase?.temperatureC === undefined ? 'Termin prüfen' : `${firstPhase.temperatureC} °C`, firstPhase ? firstPhase.label : 'Kein aktueller Zeitplan']];
  return <dl className="cook-settings" aria-label="Angaben für diesen Kochschritt">{facts.map(([label, value, hint]) => <div key={label}><dt>{label}</dt><dd>{value}</dd><small>{hint}</small></div>)}</dl>;
}
export function CookMode({ cook, access, open, setOpen, temperatureEditing }: {
  cook: CookAccess; access: MonitorAccess; open: boolean; setOpen: (open: boolean) => void; temperatureEditing: (editing: boolean) => void;
}) {
  const [error, setError] = useState(''); const [now, setNow] = useState(Date.now);
  const mode = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null); const session = cook.session;
  useEffect(() => { if (!open) return; const update = () => setNow(Date.now()); update(); const id = window.setInterval(update, 1000); document.addEventListener('visibilitychange', update); return () => { clearInterval(id); document.removeEventListener('visibilitychange', update); }; }, [open]);
  useEffect(() => { if (open) { title.current?.focus({ preventScroll: true }); mode.current?.scrollIntoView?.({ block: 'start' }); } }, [open, session?.step, session?.batch]);
  async function save(next: CookSession, show = true) {
    setError(''); try { await cook.run(() => cook.repository.save(next, session)); if (show) setOpen(true); }
    catch(e) { setError(`Nicht gespeichert. Der bisherige Schritt bleibt erhalten. ${e instanceof Error ? e.message : 'Bitte erneut versuchen.'}`); }
  }
  function move(step: number, batch = session?.batch ?? 0) {
    if (!session) return;
    if (session.timer.endAt !== null && timerRemaining(session, Date.now()) > 0 && !window.confirm('Autolyse-Timer läuft noch. Timer beenden und Schritt oder Charge wechseln?')) return;
    void save(cookPosition(session, step, batch));
  }
  async function start() {
    if (session && !window.confirm('Kochfortschritt neu starten? Nur der bisherige Kochmodus wird ersetzt. Rezeptur, Zeitplan und Monitor bleiben unverändert.')) return;
    await save(createCookSession(access.formula, access.state?.autolyseMinutes ?? 30));
  }
  const disabled = access.busy || access.editing || !!cook.error;
  if (!open || !session) return <section className="cook-launch" aria-label="TM5-Kochmodus">
    <div className="empty-state-heading"><span className="premium-icon"><Icon name="dough" /></span><div><h3>{cook.error ? 'Kochmodus nicht verfügbar' : session ? 'Dein Kochmodus wartet' : 'Dein geführter Kochmodus'}</h3><p>Schritt für Schritt · lokal fortsetzbar</p></div></div>
    {session && <p>Gespeichert: Charge {session.batch + 1}, Schritt {session.step + 1} von 8{session.completed ? ' · abgeschlossen' : ''}.</p>}
    {cook.error && <p className="error" role="alert">{cook.error} <Link to="/einstellungen">Zur Sicherung</Link></p>}
    <div className="p3-actions">{session && <button className="primary" disabled={disabled} onClick={() => setOpen(true)}>Kochmodus fortsetzen</button>}<button disabled={disabled} className={session ? 'quiet' : 'primary'} onClick={() => void start()}>{session ? 'Kochmodus neu starten' : 'Kochmodus starten'}</button></div>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
  const ingredients = calculateFormula(session.formula).ingredients;
  const recipe = tm5Recipe(ingredients, session.autolyseMinutes);
  const changed = JSON.stringify(session.formula) !== JSON.stringify(recipeSnapshot(access.formula));
  const remaining = timerRemaining(session, now);
  const amounts = session.step === 1 ? [['Mehl', recipe.flourPerBatch], ['Wasser', recipe.waterPerBatch]] as const
    : session.step === 3 ? [['Trockenhefe', recipe.yeastPerBatch]] as const : session.step === 4 ? [['Salz', recipe.saltPerBatch]] as const : [];
  const instructions = [
    'Mehl und alle Zutaten abwiegen. Kühlschrankkaltes Wasser ist möglich. Raumtemperatur und Knetwärme beachten; Wasser nicht pauschal erwärmen.',
    'Das gesamte Wasser dieser Charge mit dem Mehl verbinden. Kein Wasser zurückhalten. Nur bis zur Verbindung mischen; Mischzeit und Drehzahl für dieses Rezept sind nicht bestätigt.',
    'Mehl und Wasser abgedeckt ruhen lassen. Die Ruhezeit ist deine persönliche Rezeptvorgabe.',
    'Trockenhefe gleichmäßig per Hand einarbeiten. Geräteintervalle sind nicht bestätigt.',
    'Salz gründlich per Hand einarbeiten. Kein zusätzliches Wasser nötig.',
    'Kontrolliert fertigkneten. Nach kurzen Bearbeitungen Konsistenz und Temperatur prüfen, bei Erwärmung pausieren. Keine pauschale Dauer oder unbestätigte Knetintervalle. Gerätebearbeitung nur nach geprüftem TM5-Rezept.',
    'Erst nach allen Chargen die Teige zusammenführen. Temperatur des gesamten Teigs mit Thermometer messen und einmal im gemeinsamen Reifemonitor erfassen.',
    'Stockgare erst nach Vorbereitung aller Chargen gemäß Zeitplan beginnen. Bei späterem tatsächlichem Beginn den Zeitplan bewusst selbst anpassen. Hier wird kein Termin verschoben.',
  ];
  return <section className="cook-mode" aria-label="TM5-Kochmodus" ref={mode}>
    <div className="cook-topline"><span className="monitor-tag">Charge {session.batch + 1} / {recipe.count}</span><button className="quiet" disabled={access.busy || access.editing} onClick={() => setOpen(false)}>Kochmodus schließen</button></div>
    <div className="cook-progress" role="progressbar" aria-label="Position im Kochrezept" aria-valuemin={1} aria-valuemax={8} aria-valuenow={session.step + 1} aria-valuetext={`Schritt ${session.step + 1} von 8, ${titles[session.step]}`}>{titles.map((label, index) => <span key={label} data-state={index <= session.step ? 'reached' : 'future'} aria-hidden="true" />)}</div>
    <p className="section-kicker">Schritt {session.step + 1} von 8 · {session.formula.flourProfile}</p>
    <h2 ref={title} tabIndex={-1}>{titles[session.step]}</h2>
    {changed && <p className="schedule-warning">Die Rechnerwerte wurden geändert. Dieser Kochmodus bleibt bei seiner gespeicherten Rezeptur. Ein Neustart übernimmt neue Werte ausdrücklich.</p>}
    <dl className="cook-amounts">{amounts.map(([name, value]) => <div key={name}><dt>{name} je Charge</dt><dd>{grams(value)} <span>g</span></dd></div>)}</dl>
    <p className="cook-instruction">{instructions[session.step]}</p>
    <CookStepSettings step={session.step} minutes={session.autolyseMinutes} access={access} />
    {session.step === 0 && <p className="field-hint">Je Charge: {grams(recipe.flourPerBatch)} g Mehl · {grams(recipe.waterPerBatch)} g Wasser. Höchstens 400 g Mehl ist deine persönliche Aufteilung, keine Herstellerfreigabe.</p>}
    {session.step === 2 && <div className="cook-timer"><span>Autolyse-Timer (optional)</span><strong role="timer" aria-label="Verbleibende Autolysezeit">{clock(remaining)}</strong>
      {remaining === 0 && <p role="status">Timer beendet. Teig selbst prüfen; kein automatischer Schrittwechsel.</p>}
      <div className="p3-actions"><button disabled={disabled || remaining === 0} onClick={() => { const left = timerRemaining(session, Date.now()); void save({ ...session, timer: session.timer.endAt === null ? { endAt: Date.now() + left, remainingMs: left } : { endAt: null, remainingMs: left } }); }}>{session.timer.endAt === null ? 'Timer starten' : 'Timer pausieren'}</button>
        <button disabled={disabled} onClick={() => void save({ ...session, timer: { endAt: null, remainingMs: session.autolyseMinutes * 60000 } })}>Timer zurücksetzen</button></div>
      <details className="cook-help"><summary>Timerhinweise · kein Wecker</summary><p>Läuft anhand der Gerätezeit auch nach Schließen weiter. Kein Wecker und keine Hintergrundbenachrichtigung.</p></details>
    </div>}
    {session.step === 5 && <details className="cook-device"><summary>Bestätigte Geräteangaben</summary><p>Teigmodus über Ährensymbol und Drehregler. Heizfunktion im Teigmodus deaktiviert; maximale Füllmarkierung 2,2 Liter. Gramm-Aufteilung prüft das Volumen nicht. Rezeptbezogene Drehzahlen, Knetintervalle und Mehl-Maximalmenge sind nicht bestätigt.</p><a className="text-link" href={TM5_MANUAL_SOURCE} target="_blank" rel="noreferrer">Vorwerk-Anleitung</a></details>}
    {session.step === 6 && (changed ? <p className="schedule-warning">Temperatur nicht automatisch dem aktuellen Monitor zuordnen: Die Kochrezeptur unterscheidet sich vom Rechner. Bitte den passenden Monitor bewusst prüfen.</p> : <SharedTemperatures access={access} requireCurrent onEditingChange={temperatureEditing} />)}
    {session.step === 7 && <Link className="text-link" to="/zeitplan">Zeitplan prüfen →</Link>}
    {session.completed && <p className="save-status" role="status">Kochmodus abgeschlossen. Rezeptur und Zeitplan wurden nicht verändert.</p>}
    <p className="cook-up-next">{session.completed ? 'Abgeschlossen' : 'Als Nächstes'}<strong>{session.completed ? 'Kochmodus schließen' : session.step === 5 && session.batch < recipe.count - 1 ? `Charge ${session.batch + 2} vorbereiten` : session.step < 7 ? titles[session.step + 1] : 'Kochmodus abschließen'}</strong></p>
    <div className="cook-navigation"><button disabled={disabled || session.step === 0} onClick={() => move(session.step - 1)}>Zurück</button>
      {session.step === 5 && session.batch < recipe.count - 1 ? <button className="primary" disabled={disabled} onClick={() => move(0, session.batch + 1)}>Nächste Charge</button> : session.step < 7 ? <button className="primary" disabled={disabled} onClick={() => move(session.step + 1)}>Weiter <Icon name="arrow" /></button>
        : session.batch < recipe.count - 1 ? <button className="primary" disabled={disabled} onClick={() => move(0, session.batch + 1)}>Nächste Charge</button>
        : <button className="primary" disabled={disabled || session.completed} onClick={() => void save({ ...session, completed: true })}>Kochmodus abschließen</button>}
    </div>
    <label className="cook-batch-select">Charge wechseln<select aria-label="Charge wechseln" value={session.batch} disabled={disabled} onChange={e => move(0, Number(e.target.value))}>{Array.from({ length: recipe.count }, (_, index) => <option key={index} value={index}>Charge {index + 1} von {recipe.count}</option>)}</select></label>
    <details className="cook-help"><summary>Speichern und Fortsetzen</summary><p>Fortschritt wird erst nach erfolgreichem Speichern umgeschaltet. Schritte zeigen eine Anleitung, keine automatisch bestätigten Arbeiten. Schließen und Offline-Neuladen behalten die letzte gespeicherte Position.</p></details>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
