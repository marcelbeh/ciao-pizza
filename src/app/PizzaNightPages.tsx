import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeading } from '../components/PageHeading';
import { Icon } from '../components/Icon';
import { addRecipe, assertEvening, pizzaCount, pizzaLimits, planningHint, recipeInput, type PizzaEvening, type PizzaItem, type PizzaNightState, type ToppingRecipe } from '../core/pizzaNight/model';
import type { PizzaNightRepository } from '../infrastructure/storage/pizzaNightRepository';
import type { SchedulePlan } from '../core/schedule/plan';
import { formatScheduleTime } from './ScheduleTimeline';
import { useDraftProtection } from './useDraftProtection';

type Common = { saved: PizzaNightState | null; loadError: string; repository: PizzaNightRepository; busy: boolean;
  run: (task: () => Promise<PizzaNightState>) => Promise<void>; editingChanged: (editing: boolean) => void; hasLegacy: boolean };
const timestamp = (previous?: string) => new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();
const saveFailure = (error: unknown) => `Nicht gespeichert. Dein Entwurf bleibt erhalten. ${error instanceof Error ? error.message : 'Bitte erneut versuchen.'}`;
function LegacyNotice({ hasLegacy }: { hasLegacy: boolean }) {
  return hasLegacy ? <p className="field-hint">Bisherige Rezepte und Pizzaabende bleiben erhalten und sind in der vollständigen Sicherung enthalten. Sie können hier noch nicht bearbeitet werden. <Link className="text-link" to="/einstellungen">Zur Datensicherung</Link></p> : null;
}
function LoadFailure({ message }: { message: string }) {
  return <section className="card p3-panel" role="alert"><h2>Lokale Verwaltung nicht verfügbar</h2><p>{message}</p>
    <div className="p3-actions"><button onClick={() => window.location.reload()}>Erneut laden</button><Link className="button" to="/einstellungen">Zur Sicherung</Link></div></section>;
}
function RecipeDetails({ recipe }: { recipe: Pick<ToppingRecipe, 'name' | 'ingredients' | 'preparation'> }) {
  return <div className="p3-recipe-detail"><h3>{recipe.name}</h3><ul>{recipe.ingredients.map((ingredient, index) => <li key={index}>{ingredient}</li>)}</ul>
    {recipe.preparation && <p className="p3-multiline">{recipe.preparation}</p>}</div>;
}
function RecipeForm({ original, busy, save, cancel, changed }: { original: ToppingRecipe | null; busy: boolean;
  save: (recipe: ToppingRecipe) => Promise<void>; cancel: () => void; changed: (dirty: boolean) => void }) {
  const [base] = useState(() => original ?? { id: crypto.randomUUID(), name: '', ingredients: [], preparation: '', createdAt: timestamp(), updatedAt: timestamp() });
  const [name, setName] = useState(base.name); const [ingredients, setIngredients] = useState(base.ingredients.join('\n')); const [preparation, setPreparation] = useState(base.preparation);
  const [error, setError] = useState('');
  const dirty = name !== base.name || ingredients !== base.ingredients.join('\n') || preparation !== base.preparation;
  function change(next: { name?: string; ingredients?: string; preparation?: string }) {
    if (next.name !== undefined) setName(next.name); if (next.ingredients !== undefined) setIngredients(next.ingredients); if (next.preparation !== undefined) setPreparation(next.preparation);
    changed((next.name ?? name) !== base.name || (next.ingredients ?? ingredients) !== base.ingredients.join('\n') || (next.preparation ?? preparation) !== base.preparation); setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    let values;
    try { values = recipeInput(name, ingredients, preparation); }
    catch { setError(`Bitte einen Namen (1–${pizzaLimits.name} Zeichen) und 1–${pizzaLimits.ingredients} nichtleere Zutaten (je höchstens ${pizzaLimits.ingredient} Zeichen) eingeben. Zubereitung: höchstens ${pizzaLimits.preparation} Zeichen.`); return; }
    try { await save({ ...base, ...values, updatedAt: timestamp(base.updatedAt) }); }
    catch (e) { setError(saveFailure(e)); }
  }
  return <form className="card p3-panel" onSubmit={event => void submit(event)} noValidate aria-label="Rezept bearbeiten">
    <h2>{original ? 'Rezept bearbeiten' : 'Neues Belagrezept'}</h2>
    <fieldset disabled={busy} className="p3-fields"><label htmlFor="recipe-name">Rezeptname<input id="recipe-name" value={name} maxLength={pizzaLimits.name} required onChange={e => change({ name: e.target.value })} /></label>
      <label htmlFor="recipe-ingredients">Zutaten – eine pro Zeile<textarea id="recipe-ingredients" value={ingredients} rows={5} maxLength={pizzaLimits.ingredients * (pizzaLimits.ingredient + 1)} required onChange={e => change({ ingredients: e.target.value })} /></label>
      <p className="field-hint">Mindestens eine Zutat. Höchstens {pizzaLimits.ingredients} Zeilen mit je {pizzaLimits.ingredient} Zeichen. Keine automatische Mengenberechnung.</p>
      <label htmlFor="recipe-preparation">Zubereitung (optional)<textarea id="recipe-preparation" rows={4} value={preparation} maxLength={pizzaLimits.preparation} onChange={e => change({ preparation: e.target.value })} /></label>
      <div className="p3-actions"><button type="submit" className="primary">{busy ? 'Wird gespeichert …' : 'Rezept speichern'}</button><button type="button" onClick={() => { if (!dirty || window.confirm('Ungespeicherte Änderungen verwerfen?')) cancel(); }}>Abbrechen</button></div>
    </fieldset>{error && <p role="alert" className="error">{error}</p>}
  </form>;
}
export function RecipesPage(props: Common) {
  const { saved, loadError, repository, busy, run, editingChanged, hasLegacy } = props;
  const [editing, setEditing] = useState<{ original: ToppingRecipe | null } | null>(null);
  const [selected, setSelected] = useState<string | null>(null); const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  useDraftProtection(dirty, busy, !!editing, editingChanged);
  const selectedRecipe = saved?.recipes.find(recipe => recipe.id === selected);
  function close() { setEditing(null); setDirty(false); }
  async function remove(recipe: ToppingRecipe) {
    if (!window.confirm(`„${recipe.name}“ wirklich löschen? Gespeicherte Pizzaabend-Positionen bleiben unverändert.`)) return;
    setError(''); setNotice('');
    try { await run(() => repository.deleteRecipe(recipe)); setSelected(null); setNotice('Rezept gelöscht.'); }
    catch (e) { setError(saveFailure(e)); }
  }
  return <><PageHeading title="Rezepte" description="Deine Belagrezepte. Lokal auf diesem Gerät." />
    <LegacyNotice hasLegacy={hasLegacy} />
    {loadError || !saved ? <LoadFailure message={loadError || 'Daten konnten nicht geladen werden.'} /> : <>
      {editing ? <RecipeForm original={editing.original} busy={busy} changed={setDirty} cancel={close} save={async recipe => {
        await run(() => repository.saveRecipe(recipe, editing.original)); close(); setSelected(recipe.id); setNotice('Rezept auf diesem Gerät gespeichert.');
      }} /> : <div className="p3-layout">
        <section className="card p3-panel"><div className="card-heading"><h2>Deine Belagrezepte</h2></div>
          <button className="primary" disabled={busy || saved.recipes.length >= pizzaLimits.recipes} onClick={() => { setEditing({ original: null }); setNotice(''); setError(''); }}>Rezept anlegen</button>
          {!saved.recipes.length ? <p>Noch keine Belagrezepte. Lege dein erstes Rezept an.</p> : <ul className="p3-list">{saved.recipes.map(recipe => <li key={recipe.id}>
            <button className="p3-list-button" aria-pressed={selected === recipe.id} disabled={busy} onClick={() => { setSelected(recipe.id); setNotice(''); setError(''); }}>{recipe.name}<Icon name="chevron" /></button>
          </li>)}</ul>}
        </section>
        {selectedRecipe && <section className="card p3-panel" aria-label="Rezeptdetails"><RecipeDetails recipe={selectedRecipe} />
          <div className="p3-actions"><button disabled={busy} onClick={() => { setEditing({ original: selectedRecipe }); setNotice(''); setError(''); }}>Rezept bearbeiten</button>
            <button disabled={busy} onClick={() => void remove(selectedRecipe)}>Rezept löschen</button></div></section>}
      </div>}
      {notice && <p className="save-status" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    </>}
  </>;
}
export function EveningSchedule({ schedule, error }: { schedule: SchedulePlan | null; error: string }) {
  return <div className="p3-schedule">{error ? <p role="alert" className="error">{error}</p> : schedule ? <p>Backtermin: <strong>{formatScheduleTime(schedule.bakeAt)}</strong></p> : <p>Noch kein Backtermin. Lege ihn im Zeitplan an.</p>}
    <Link className="text-link" to="/zeitplan">{error ? 'Zeitplan prüfen' : schedule ? 'Zeitplan öffnen' : 'Backtermin planen'} <Icon name="arrow" /></Link>
    <p className="field-hint">Es gilt immer der gespeicherte Zeitplan. Terminänderungen gelten auch für diesen Abend.</p></div>;
}
function CountSummary({ count, doughCount }: { count: number; doughCount: number }) {
  return <div className="p3-count" role="status"><p><strong>{count} Pizzen</strong> geplant · {doughCount} Teiglinge</p>
    <p className="field-hint">Differenz: {count - doughCount > 0 ? '+' : ''}{count - doughCount}. {planningHint(count, doughCount)} Der Teigrechner bleibt unverändert.</p></div>;
}
function EveningForm({ original, recipes, doughCount, busy, save, cancel, changed }: {
  original: PizzaEvening | null; recipes: ToppingRecipe[]; doughCount: number; busy: boolean; save: (evening: PizzaEvening) => Promise<void>; cancel: () => void; changed: (dirty: boolean) => void;
}) {
  const [base] = useState<PizzaEvening>(() => original ?? { id: crypto.randomUUID(), name: '', notes: '', items: [], createdAt: timestamp(), updatedAt: timestamp() });
  const [name, setName] = useState(base.name); const [notes, setNotes] = useState(base.notes);
  const [items, setItems] = useState(base.items); const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(base.items.map(item => [item.id, String(item.quantity)])));
  const [recipeId, setRecipeId] = useState(''); const [error, setError] = useState('');
  const dirty = name !== base.name || notes !== base.notes || JSON.stringify(items) !== JSON.stringify(base.items) || items.some(item => quantities[item.id] !== String(item.quantity));
  function mark() { changed(true); setError(''); }
  const validQuantity = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= pizzaLimits.quantity;
  const candidateItems: PizzaItem[] = items.map(item => ({ ...item, quantity: validQuantity(quantities[item.id] ?? '') ? Number(quantities[item.id]) : NaN }));
  const validQuantities = candidateItems.every(item => Number.isFinite(item.quantity));
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); const candidate = { ...base, name: name.trim(), notes: notes.trim(), items: candidateItems, updatedAt: timestamp(base.updatedAt) };
    try { assertEvening(candidate); }
    catch { setError(`Bitte einen Namen (1–${pizzaLimits.name} Zeichen) und positive ganze Stückzahlen von 1 bis ${pizzaLimits.quantity} eingeben. Notiz: höchstens ${pizzaLimits.notes} Zeichen.`); return; }
    try { await save(candidate); } catch (e) { setError(saveFailure(e)); }
  }
  function includeRecipe() {
    const recipe = recipes.find(row => row.id === recipeId); if (!recipe) return;
    if (!validQuantities) { setError('Bitte zuerst die markierten Stückzahlen korrigieren.'); return; }
    try {
      const next = addRecipe(candidateItems, recipe); setItems(next); setQuantities(Object.fromEntries(next.map(item => [item.id, String(item.quantity)]))); mark();
    } catch (e) { setError(e instanceof Error ? e.message : 'Rezept konnte nicht hinzugefügt werden.'); }
  }
  return <form className="card p3-panel" aria-label="Pizzaabend bearbeiten" onSubmit={event => void submit(event)} noValidate>
    <h2>{original ? 'Pizzaabend bearbeiten' : 'Neuer Pizzaabend'}</h2>
    <fieldset className="p3-fields" disabled={busy}>
      <label htmlFor="evening-name">Name des Pizzaabends<input id="evening-name" value={name} maxLength={pizzaLimits.name} required onChange={e => { setName(e.target.value); mark(); }} /></label>
      <label htmlFor="evening-notes">Notiz (optional)<textarea id="evening-notes" rows={3} maxLength={pizzaLimits.notes} value={notes} onChange={e => { setNotes(e.target.value); mark(); }} /></label>
      <div className="p3-fields"><label htmlFor="evening-recipe">Belagrezept auswählen<select id="evening-recipe" value={recipeId} onChange={e => setRecipeId(e.target.value)}>
        <option value="">Rezept wählen</option>{recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label>
        <button type="button" disabled={!recipeId || !validQuantities} onClick={includeRecipe}>Rezept hinzufügen</button></div>
      {!recipes.length && <p className="field-hint">Noch keine Bibliotheksrezepte. Du kannst den Abend ohne Positionen speichern und anschließend unter Rezepte einen Belag anlegen.</p>}
      <p className="field-hint">Rezeptinhalt wird beim Hinzufügen als feste Kopie gespeichert. Erneutes Hinzufügen erhöht nur die Stückzahl.</p>
      {!items.length && <p>Noch keine Rezeptpositionen.</p>}
      {items.map(item => <section className="p3-item" key={item.id} aria-label={`Position ${item.recipeSnapshot.name}`}>
        <RecipeDetails recipe={item.recipeSnapshot} /><label htmlFor={`quantity-${item.id}`}>Stückzahl – {item.recipeSnapshot.name}<input id={`quantity-${item.id}`} inputMode="numeric" type="text" value={quantities[item.id] ?? ''}
          aria-invalid={!validQuantity(quantities[item.id] ?? '')} aria-describedby={!validQuantity(quantities[item.id] ?? '') ? `quantity-error-${item.id}` : undefined}
          onChange={e => { setQuantities(previous => ({ ...previous, [item.id]: e.target.value })); mark(); }} /></label>
        {!validQuantity(quantities[item.id] ?? '') && <p className="error" id={`quantity-error-${item.id}`}>Bitte eine ganze Zahl von 1 bis {pizzaLimits.quantity} eingeben.</p>}
        <button type="button" onClick={() => { setItems(previous => previous.filter(row => row.id !== item.id)); mark(); }}>Position entfernen</button>
      </section>)}
      {validQuantities ? <CountSummary count={candidateItems.reduce((sum, item) => sum + item.quantity, 0)} doughCount={doughCount} /> : <p role="status" className="error">Mengenabgleich erst mit gültigen Stückzahlen verfügbar.</p>}
      <div className="p3-actions"><button type="submit" className="primary">{busy ? 'Wird gespeichert …' : 'Pizzaabend speichern'}</button><button type="button" onClick={() => { if (!dirty || window.confirm('Ungespeicherte Änderungen verwerfen?')) cancel(); }}>Abbrechen</button></div>
    </fieldset>{error && <p className="error" role="alert">{error}</p>}
  </form>;
}
export function PizzaEveningPage(props: Common & { doughCount: number; schedule: SchedulePlan | null; scheduleError: string; legacyEvening: ReactNode }) {
  const { saved, loadError, repository, busy, run, editingChanged, hasLegacy, doughCount, schedule, scheduleError, legacyEvening } = props;
  const [editing, setEditing] = useState(false); const [dirty, setDirty] = useState(false); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  useDraftProtection(dirty, busy, editing, editingChanged);
  function close() { setEditing(false); setDirty(false); }
  async function remove() {
    if (!saved?.evening || !window.confirm(`„${saved.evening.name}“ wirklich löschen? Die Belagrezepte bleiben erhalten.`)) return;
    const original = saved.evening; setError(''); setNotice('');
    try { await run(() => repository.deleteEvening(original)); setNotice('Pizzaabend gelöscht.'); } catch (e) { setError(saveFailure(e)); }
  }
  return <><PageHeading title="Pizzaabend" description="Ein aktueller Abend, deine Beläge und der gemeinsame Backtermin." />
    <LegacyNotice hasLegacy={hasLegacy} />
    <section className="card p3-panel"><h2>Dein Backtermin</h2><EveningSchedule schedule={schedule} error={scheduleError} /></section>
    {loadError || !saved ? <LoadFailure message={loadError || 'Daten konnten nicht geladen werden.'} /> : <>
      {editing ? <EveningForm original={saved.evening} recipes={saved.recipes} doughCount={doughCount} busy={busy} changed={setDirty} cancel={close} save={async evening => {
        await run(() => repository.saveEvening(evening, saved.evening)); close(); setNotice('Pizzaabend auf diesem Gerät gespeichert.');
      }} /> : <section className="card p3-panel">
        {saved.evening ? <><h2>{saved.evening.name}</h2>{saved.evening.notes && <p className="p3-multiline">{saved.evening.notes}</p>}
          <CountSummary count={pizzaCount(saved.evening)} doughCount={doughCount} />
          {!saved.evening.items.length && <p>Noch keine Rezeptpositionen. Du kannst sie beim Bearbeiten hinzufügen.</p>}
          {saved.evening.items.map(item => <section className="p3-item" key={item.id}><p><strong>{item.quantity} × {item.recipeSnapshot.name}</strong> · gespeicherte Rezeptkopie</p><RecipeDetails recipe={item.recipeSnapshot} /></section>)}
          <div className="p3-actions"><button disabled={busy} onClick={() => { setEditing(true); setNotice(''); setError(''); }}>Pizzaabend bearbeiten</button><button disabled={busy} onClick={() => void remove()}>Pizzaabend löschen</button></div>
        </> : <><h2>Dein nächster Pizzaabend</h2><p>Noch kein aktueller Pizzaabend. Du kannst zunächst nur einen Namen speichern und die Beläge später ergänzen.</p>
          <button className="primary" disabled={busy} onClick={() => { setEditing(true); setNotice(''); setError(''); }}>Pizzaabend anlegen</button></>}
      </section>}
      {notice && <p role="status" className="save-status">{notice}</p>}{error && <p role="alert" className="error">{error}</p>}
    </>}{legacyEvening}
  </>;
}
