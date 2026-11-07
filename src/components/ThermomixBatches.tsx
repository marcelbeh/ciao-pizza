import { thermomixBatches } from '../core/dough/thermomix';
const grams = (value: number) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
export function ThermomixBatches({ ingredients }: { ingredients: { flour: number; water: number; salt: number; yeast: number } }) {
  const batches = thermomixBatches(ingredients.flour, ingredients.water);
  return <section className="card saved-evening" aria-label="Thermomix-Chargen">
    <div className="card-heading"><h2>Thermomix · {batches.count} {batches.count === 1 ? 'Charge' : 'Chargen'}</h2></div>
    <h3>1. Autolyse: Mehl + Wasser</h3>
    <p className="field-hint">Maximal 400 g Mehl je Charge. {batches.count > 1 ? 'Mehl und Wasser gleichmäßig aufteilen.' : 'Mehl und Wasser in einer Charge verarbeiten.'}</p>
    <p>Je Charge: <strong>{grams(batches.flourPerBatch)} g Mehl</strong> + <strong>{grams(batches.waterPerBatch)} g Wasser</strong>.</p>
    <p><strong>30 Sekunden · Teigstufe</strong> je Charge. Anschließend herausnehmen.</p>
    <h3 className="save-status">2. Von Hand fertigstellen</h3>
    <p className="field-hint">Insgesamt <strong>{grams(ingredients.salt)} g Salz</strong> und <strong>{ingredients.yeast > 0 && ingredients.yeast < .01 ? '< 0,01' : grams(ingredients.yeast)} g Trockenhefe</strong> per Hand einarbeiten.{batches.count > 1 ? ' Die Teige aller Chargen zusammenführen.' : ''}</p>
    <p className="precision-note">Salz und Hefe sind die Gesamtmengen für alle Chargen, nicht je Charge. Angezeigte Mengen sind gerundet. Die Rezeptur bleibt unverändert; die gesamte Vorbereitung im Zeitplan berücksichtigt zusätzlich deine Handarbeit.</p>
  </section>;
}
