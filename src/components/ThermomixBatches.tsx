import { useState, type FormEvent } from 'react';
import { tm5Recipe, TM5_SOURCE, TM5_MANUAL_SOURCE } from '../core/dough/tm5';
import { SharedTemperatures, type MonitorAccess } from '../app/MaturityPage';
import { useDraftProtection } from '../app/useDraftProtection';
import { Link } from 'react-router-dom';
const grams = (value: number) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
function AutolyseEditor({ access, close }: { access: MonitorAccess; close: () => void }) {
  const [base] = useState(access.state?.autolyseMinutes ?? 30); const [value,setValue] = useState(String(base)); const [error,setError] = useState('');
  useDraftProtection(value !== String(base), access.busy, true, access.editingChanged);
  async function save(e: FormEvent) { e.preventDefault(); setError(''); try {
    if (!/^\d+$/.test(value) || Number(value)>240) throw Error('Bitte 0 bis 240 ganze Minuten eingeben.');
    await access.run(()=>access.repository.autolyse(Number(value))); close();
  } catch(e) { setError(`Nicht gespeichert. ${e instanceof Error?e.message:'Bitte erneut versuchen.'}`); } }
  return <form className="p3-fields" onSubmit={e=>void save(e)} noValidate><label>Autolyse (Minuten)<input inputMode="numeric" value={value} disabled={access.busy} onChange={e=>setValue(e.target.value)} /></label>
    <div className="p3-actions"><button type="submit" disabled={access.busy}>Autolyse speichern</button><button type="button" disabled={access.busy} onClick={()=>{if(value===String(base)||window.confirm('Ungespeicherte Änderungen verwerfen?'))close();}}>Abbrechen</button></div>{error&&<p className="error" role="alert">{error}</p>}</form>;
}
export function ThermomixBatches({ ingredients, access }: { ingredients: { flour: number; water: number; salt: number; yeast: number }; access: MonitorAccess }) {
  const recipe = tm5Recipe(ingredients, access.state?.autolyseMinutes ?? 30);
  const [autolyseEditing,setAutolyseEditing] = useState(false); const [temperatureEditing,setTemperatureEditing] = useState(false);
  return <section className="card saved-evening" aria-label="Thermomix-Chargen"><details onToggle={event=>{if(!event.currentTarget.open&&(autolyseEditing||temperatureEditing))event.currentTarget.open=true;}}><summary>TM5-Rezeptansicht (optional)</summary>
    <h2>Thermomix · {recipe.count} {recipe.count===1?'Charge':'Chargen'}</h2>
    <p className="field-hint">Persönliche Aufteilung: höchstens 400 g Mehl je Charge. Das ist keine validierte TM5-Maximalmenge. Gerätegrenze für dieses Rezept vor Ort prüfen.</p>
    <p>Je Charge: <strong>{grams(recipe.flourPerBatch)} g Mehl</strong> · <strong>{grams(recipe.waterPerBatch)} g Wasser</strong> · <strong>{grams(recipe.yeastPerBatch)} g Trockenhefe</strong> · <strong>{grams(recipe.saltPerBatch)} g Salz</strong>.</p>
    <p className="field-hint">Gesamt: {grams(ingredients.flour)} g Mehl, {grams(ingredients.water)} g Wasser, {grams(ingredients.yeast)} g Trockenhefe, {grams(ingredients.salt)} g Salz. Mengen gerundet.</p>
    {access.schedule && access.schedule.mixMinutes < recipe.autolyseMinutes && <p className="schedule-warning">Die gespeicherte Vorbereitung ({access.schedule.mixMinutes} Minuten) ist kürzer als die Autolyse allein. Plane zusätzlich alle Chargen und Handarbeit ein und passe den Zeitplan bei Bedarf selbst an.</p>}
    <ol className="tm5-phases">
      <li><strong>Vorbereitung und Wassertemperatur</strong><p>Kühlschrankkaltes Wasser ist möglich. Mehl- und Raumtemperatur sowie Knetwärme beachten; keine exakte Wassertemperatur ohne Messung berechenbar. Nicht pauschal erwärmen.</p></li>
      <li><strong>Mehl und Wasser mischen</strong><p>Das gesamte Wasser der jeweiligen Charge zu Beginn mit dem Mehl verbinden. Kein Wasser zurückhalten. Nur bis zur Verbindung mischen; konkrete Drehzahl und Mischzeit sind für dieses Rezept nicht bestätigt.</p></li>
      <li><strong>Autolyse · {recipe.autolyseMinutes} Minuten</strong><p>Mehl und Wasser abgedeckt ruhen lassen. Persönliche Rezeptvorgabe, keine Geräteeinstellung.</p></li>
      <li><strong>Trockenhefe einarbeiten</strong><p>{grams(recipe.yeastPerBatch)} g je Charge gleichmäßig per Hand einarbeiten. Geräteintervalle dafür sind nicht validiert.</p></li>
      <li><strong>Salz einarbeiten</strong><p>{grams(recipe.saltPerBatch)} g je Charge gründlich per Hand einarbeiten. Kein zusätzliches Wasser nötig.</p></li>
      <li><strong>Kontrolliert fertigkneten</strong><p>Nach jeder kurzen Bearbeitung Konsistenz und Temperatur prüfen. Bei Erwärmung pausieren. Keine pauschale Knetdauer und keine unbestätigten Knetintervalle. Weitere Gerätebearbeitung nur nach geprüftem TM5-Rezept. {recipe.count>1?'Chargen anschließend zusammenführen.':''}</p></li>
      <li><strong>Teigtemperatur messen</strong><p>Mit Thermometer nach der gesamten Vorbereitung messen und unten einmalig erfassen; derselbe Wert erscheint im Reifemonitor.</p></li>
      <li><strong>Stockgare starten</strong><p>Abgedeckt gemäß gespeichertem Zeitplan führen. Bei späterem tatsächlichem Beginn den Zeitplan selbst anpassen; die Karte verändert ihn niemals automatisch.</p><Link className="text-link" to="/zeitplan">Zeitplan prüfen →</Link></li>
    </ol>
    <p className="field-hint">Bestätigt: TM5-Teigmodus über das Ährensymbol wählen und mit dem Drehregler starten. Vorwerk verweist für Mengen auf geprüfte Rezepte und empfiehlt bei Überlastung kleinere Mengen. Keine allgemeine Mehlobergrenze oder Intervalle für dieses Rezept bestätigt.</p>
    <p className="field-hint">Die Anleitung nennt 2,2 Liter als maximale Füllmarkierung. Nicht überschreiten; die Gramm-Aufteilung prüft das Volumen nicht. Im Teigmodus ist die Heizfunktion deaktiviert.</p>
    <a className="text-link" href={TM5_MANUAL_SOURCE} target="_blank" rel="noreferrer">TM5-Anleitung: Füllmarkierung und Teigmodus (S. 44)</a><br />
    <a className="text-link" href={TM5_SOURCE} target="_blank" rel="noreferrer">Vorwerk: TM5-Teigmodus und Mengen</a>
    <p className="field-hint">Deine Referenz 500 g Mehl / 320 g Wasser / 0,5 g Trockenhefe / 15 g Salz entspricht 64 % Hydration, 0,1 % Hefe und 3 % Salz. Die Karte folgt deiner aktuellen Rezeptur und verändert keine gespeicherten Werte. 500 g Gesamtmehl werden mit deiner 400-g-Aufteilung in zwei Chargen geteilt.</p>
    {autolyseEditing ? <AutolyseEditor access={access} close={()=>setAutolyseEditing(false)} /> : <button disabled={access.busy||temperatureEditing||!!access.loadError} onClick={()=>setAutolyseEditing(true)}>Autolyse anpassen</button>}
    <h3 className="save-status">Teigtemperatur an den Monitor übergeben</h3>
    <SharedTemperatures access={access} requireCurrent disabled={autolyseEditing} onEditingChange={setTemperatureEditing} />
  </details></section>;
}
