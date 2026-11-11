import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { createIndexedDbStore } from '../infrastructure/storage/indexedDbStore';
import { createFornoRepository, FORNO_KEY, LEGACY_KEYS } from '../infrastructure/storage/fornoRepository';
import { PIZZA_NIGHT_KEY } from '../infrastructure/storage/pizzaNightRepository';
import { createSchedule, createTeichnerSchedule } from '../core/schedule/plan';
import { SCHEDULE_KEY } from '../infrastructure/storage/scheduleRepository';
import { defaults } from '../core/dough/forno';
import { createPlan } from '../core/dough/model';
vi.mock('../infrastructure/pwa/PwaNotice', () => ({ PwaNotice: ({ busy }: { busy: boolean }) => <span data-testid="pwa-state">{busy ? 'blocked' : 'ready'}</span> }));
const setup = async () => { const db = createIndexedDbStore(`p3-ui-${crypto.randomUUID()}`); await db.set(PIZZA_NIGHT_KEY, { version: 1, recipes: [], evening: null }); return { db, repo: createFornoRepository(db) }; };
const navigation = (label: string) => within(screen.getByRole('navigation', { name: 'Hauptnavigation' })).getByRole('link', { name: label });
async function newRecipe() {
  fireEvent.click(await screen.findByRole('button', { name: 'Rezept anlegen' }));
  fireEvent.change(screen.getByLabelText('Rezeptname'), { target: { value: '  Margherita  ' } });
  fireEvent.change(screen.getByLabelText('Zutaten – eine pro Zeile'), { target: { value: '\n Tomate \n Mozzarella \n' } });
  fireEvent.click(screen.getByRole('button', { name: 'Rezept speichern' }));
  await screen.findByText('Rezept auf diesem Gerät gespeichert.');
}
beforeEach(() => { window.location.hash = '#/rezepte'; vi.spyOn(window, 'confirm').mockReturnValue(true); });
describe('P3 recipes, evening and draft protection', () => {
  it('creates, edits and deletes recipes explicitly, preserving stable IDs and requiring confirmation', async () => {
    const { db, repo } = await setup(); render(<App repo={repo} />);
    await newRecipe(); const first = (await repo.pizzaNight.load()).pizzaNight!.recipes[0];
    expect(first.name).toBe('Margherita'); expect(first.ingredients).toEqual(['Tomate', 'Mozzarella']);
    fireEvent.click(screen.getByRole('button', { name: 'Rezept bearbeiten' }));
    fireEvent.change(screen.getByLabelText('Rezeptname'), { target: { value: 'Bianca' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rezept speichern' })); await screen.findByText('Rezept auf diesem Gerät gespeichert.');
    const second = (await repo.pizzaNight.load()).pizzaNight!.recipes[0]; expect(second.id).toBe(first.id); expect(second.createdAt).toBe(first.createdAt); expect(second.updatedAt > first.updatedAt).toBe(true);
    vi.mocked(window.confirm).mockReturnValueOnce(false); fireEvent.click(screen.getByRole('button', { name: 'Rezept löschen' }));
    expect((await repo.pizzaNight.load()).pizzaNight!.recipes).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Rezept löschen' })); await screen.findByText('Rezept gelöscht.');
    expect((await repo.pizzaNight.load()).pizzaNight!.recipes).toHaveLength(0);
    expect(await db.get(FORNO_KEY)).toBeUndefined();
  });
  it('rejects empty recipes, retains draft on storage failure, blocks PWA and asks before navigation/cancel', async () => {
    const { db, repo } = await setup(); render(<App repo={repo} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rezept anlegen' }));
    expect(screen.getByTestId('pwa-state')).toHaveTextContent('blocked');
    fireEvent.click(screen.getByRole('button', { name: 'Rezept speichern' })); expect(await screen.findByRole('alert')).toHaveTextContent('nichtleere Zutaten');
    fireEvent.change(screen.getByLabelText('Rezeptname'), { target: { value: 'Mein Entwurf' } });
    fireEvent.change(screen.getByLabelText('Zutaten – eine pro Zeile'), { target: { value: 'Ricotta' } });
    vi.spyOn(db, 'update').mockRejectedValueOnce(Error('Speicher voll'));
    fireEvent.click(screen.getByRole('button', { name: 'Rezept speichern' })); expect(await screen.findByRole('alert')).toHaveTextContent('Nicht gespeichert');
    expect(screen.queryByText('Rezept auf diesem Gerät gespeichert.')).not.toBeInTheDocument(); expect(screen.getByLabelText('Rezeptname')).toHaveValue('Mein Entwurf');
    vi.mocked(window.confirm).mockReturnValueOnce(false); fireEvent.click(navigation('Home')); expect(screen.getByLabelText('Rezeptname')).toHaveValue('Mein Entwurf');
    vi.mocked(window.confirm).mockReturnValueOnce(false); fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' })); expect(screen.getByLabelText('Rezeptname')).toHaveValue('Mein Entwurf');
    fireEvent.click(screen.getByRole('button', { name: 'Rezept speichern' })); await screen.findByText('Rezept auf diesem Gerät gespeichert.');
    await waitFor(() => expect(screen.getByTestId('pwa-state')).toHaveTextContent('ready'));
  });
  it('saves an empty evening, adds/increments snapshots, compares counts and restores everything after reload', async () => {
    const { db, repo } = await setup(); await db.set(FORNO_KEY, { version: 1, formula: { ...defaults, count: 3 } });
    const schedule = createSchedule(); await db.set(SCHEDULE_KEY, schedule);
    const view = render(<App repo={repo} />); await newRecipe();
    fireEvent.click(navigation('Pizzaabend')); expect(await screen.findByText(/Backtermin:/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend anlegen' }));
    fireEvent.change(screen.getByLabelText('Name des Pizzaabends'), { target: { value: '  Freunde  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend speichern' })); await screen.findByText('Pizzaabend auf diesem Gerät gespeichert.');
    expect((await repo.pizzaNight.load()).pizzaNight!.evening!.items).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend bearbeiten' }));
    const source = (await repo.pizzaNight.load()).pizzaNight!.recipes[0];
    fireEvent.change(screen.getByLabelText('Belagrezept auswählen'), { target: { value: source.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Rezept hinzufügen' })); fireEvent.click(screen.getByRole('button', { name: 'Rezept hinzufügen' }));
    expect(screen.getByLabelText('Stückzahl – Margherita')).toHaveValue('2'); expect(screen.getByText(/1 Teigling noch nicht verplant/)).toBeVisible();
    fireEvent.change(screen.getByLabelText('Stückzahl – Margherita'), { target: { value: '4' } }); expect(screen.getByText(/1 Pizza mehr geplant/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend speichern' })); await screen.findByText('Pizzaabend auf diesem Gerät gespeichert.');
    expect((await repo.load()).formula.count).toBe(3); expect(await db.get(SCHEDULE_KEY)).toEqual(schedule);
    view.unmount(); const changedSource = { ...source, name: 'Anderes Rezept', ingredients: ['Andere Zutat'] };
    await repo.pizzaNight.saveRecipe(changedSource, source); await repo.pizzaNight.deleteRecipe(changedSource);
    render(<App repo={createFornoRepository(db)} />);
    expect(await screen.findByText('4 × Margherita')).toBeVisible(); expect(screen.getByText('Mozzarella')).toBeVisible();
    fireEvent.click(navigation('Home')); expect(await screen.findByText(/Freunde · 4 Pizzen/)).toBeVisible();
    fireEvent.click(navigation('Pizzaabend')); await screen.findByRole('button', { name: 'Pizzaabend löschen' });
    vi.mocked(window.confirm).mockReturnValueOnce(false); fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend löschen' }));
    expect((await repo.pizzaNight.load()).pizzaNight!.evening).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend löschen' })); await screen.findByText('Pizzaabend gelöscht.');
  });
  it('keeps an evening draft and invalid quantity after a failed save; supports removal and cancel', async () => {
    const { db, repo } = await setup(); render(<App repo={repo} />); await newRecipe(); fireEvent.click(navigation('Pizzaabend'));
    fireEvent.click(await screen.findByRole('button', { name: 'Pizzaabend anlegen' }));
    fireEvent.change(screen.getByLabelText('Name des Pizzaabends'), { target: { value: 'Entwurf' } });
    const source = (await repo.pizzaNight.load()).pizzaNight!.recipes[0]; fireEvent.change(screen.getByLabelText('Belagrezept auswählen'), { target: { value: source.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Rezept hinzufügen' }));
    fireEvent.change(screen.getByLabelText('Stückzahl – Margherita'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend speichern' })); expect(await screen.findByRole('alert')).toHaveTextContent('positive ganze Stückzahlen');
    expect(screen.getByLabelText('Stückzahl – Margherita')).toHaveValue('1.5'); expect((await repo.pizzaNight.load()).pizzaNight!.evening).toBeNull();
    fireEvent.change(screen.getByLabelText('Stückzahl – Margherita'), { target: { value: '2' } });
    vi.spyOn(db, 'update').mockRejectedValueOnce(Error('Speicher voll')); fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend speichern' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nicht gespeichert'); expect(screen.getByLabelText('Name des Pizzaabends')).toHaveValue('Entwurf');
    fireEvent.click(screen.getByRole('button', { name: 'Position entfernen' })); expect(screen.getByText('Noch keine Rezeptpositionen.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' })); expect(await screen.findByRole('button', { name: 'Pizzaabend anlegen' })).toBeVisible();
    expect((await repo.pizzaNight.load()).pizzaNight!.evening).toBeNull();
  });
  it('separates legacy display, blocks unreadable P3 data, leaves backup/calculator available and respects schedule errors', async () => {
    const { db, repo } = await setup(); const dough = createPlan();
    await db.set(LEGACY_KEYS[0], { version: 2, evenings: [{ name: 'Alter Abend', bakeAt: dough.bakeAt, dough, timeZone: 'Europe/Berlin', updatedAt: new Date().toISOString() }] });
    await db.set(PIZZA_NIGHT_KEY, { version: 77, raw: true }); await db.set(SCHEDULE_KEY, { version: 88 });
    window.location.hash = '#/pizzaabend'; render(<App repo={repo} />);
    expect(await screen.findByRole('heading', { name: 'Bisheriger Pizzaabend' })).toBeVisible(); expect(screen.getByText('Alter Abend')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Lokale Verwaltung nicht verfügbar' })).toBeVisible(); expect(screen.queryByRole('button', { name: 'Pizzaabend anlegen' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Backtermin:/)).not.toBeInTheDocument(); expect(screen.getByRole('link', { name: /Zeitplan prüfen/ })).toBeVisible();
    fireEvent.click(navigation('Rezepte')); expect(await screen.findByRole('heading', { name: 'Lokale Verwaltung nicht verfügbar' })).toBeVisible();
    fireEvent.click(navigation('Teig')); expect(await screen.findByRole('textbox', { name: /Pizzaanzahl/ })).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Einstellungen' })); expect(await screen.findByRole('button', { name: 'Sicherung herunterladen' })).toBeEnabled();
    expect((await repo.backup()).entries[PIZZA_NIGHT_KEY]).toEqual({ version: 77, raw: true });
  });
  it('uses the updated shared P2 date without saving an evening date', async () => {
    const { db, repo } = await setup(); const initial = createSchedule(); await db.set(SCHEDULE_KEY, createTeichnerSchedule(initial.bakeAt, initial));
    window.location.hash = '#/pizzaabend'; render(<App repo={repo} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Pizzaabend anlegen' }));
    fireEvent.change(screen.getByLabelText('Name des Pizzaabends'), { target: { value: 'Freunde' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend speichern' })); await screen.findByText('Pizzaabend auf diesem Gerät gespeichert.');
    fireEvent.click(navigation('Zeitplan'));
    fireEvent.change(await screen.findByLabelText('Backdatum und Uhrzeit'), { target: { value: '2027-03-13T18:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' })); await screen.findByText('Zeitplan auf diesem Gerät gespeichert.');
    fireEvent.click(navigation('Pizzaabend')); expect(await screen.findByText(/13. März 2027/)).toBeVisible();
    const stored = (await repo.pizzaNight.load()).pizzaNight!.evening!;
    expect(stored).not.toHaveProperty('bakeAt'); expect(stored).not.toHaveProperty('schedule');
    fireEvent.click(navigation('Home')); expect(await screen.findByText(/13. März 2027/)).toBeVisible();
  });
  it('blocks navigation and PWA while a write is pending and reports success only on completion', async () => {
    const { repo } = await setup(); let release: (() => void) | undefined;
    vi.spyOn(repo.pizzaNight, 'saveRecipe').mockImplementationOnce(recipe => new Promise(resolve => {
      release = () => resolve({ version: 1, recipes: [recipe], evening: null });
    }));
    render(<App repo={repo} />); fireEvent.click(await screen.findByRole('button', { name: 'Rezept anlegen' }));
    fireEvent.change(screen.getByLabelText('Rezeptname'), { target: { value: 'Entwurf' } });
    fireEvent.change(screen.getByLabelText('Zutaten – eine pro Zeile'), { target: { value: 'Tomate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rezept speichern' }));
    await waitFor(() => expect(release).toBeDefined());
    expect(screen.getByLabelText('Rezeptname')).toBeDisabled(); expect(screen.getByTestId('pwa-state')).toHaveTextContent('blocked');
    expect(screen.queryByText('Rezept auf diesem Gerät gespeichert.')).not.toBeInTheDocument();
    fireEvent.click(navigation('Home')); expect(screen.getByLabelText('Rezeptname')).toHaveValue('Entwurf');
    release!(); await screen.findByText('Rezept auf diesem Gerät gespeichert.');
    await waitFor(() => expect(screen.getByTestId('pwa-state')).toHaveTextContent('ready'));
  });
  it('keeps read failures local to P3', async () => {
    const { db, repo } = await setup(); const get = db.get;
    vi.spyOn(db, 'get').mockImplementation(key => key === PIZZA_NIGHT_KEY ? Promise.reject(Error('Read failed')) : get(key));
    render(<App repo={repo} />); expect(await screen.findByRole('alert')).toHaveTextContent('nicht lesbar');
    fireEvent.click(navigation('Teig')); expect(await screen.findByRole('textbox', { name: /Pizzaanzahl/ })).toBeVisible();
    expect((await repo.backup()).entries).toEqual({ [PIZZA_NIGHT_KEY]: { version: 1, recipes: [], evening: null } });
  });
});

describe('Editable standard pizza starting recipes', () => {
  it('shows nine real, selectable recipes for a new collection without an add-standards action', async () => {
    const db = createIndexedDbStore(`standards-fresh-ui-${crypto.randomUUID()}`); const repo = createFornoRepository(db);
    render(<App repo={repo} />);
    await screen.findByRole('button', { name: '’Nduja 🌶️' });
    expect(screen.queryByRole('button', { name: 'Standardpizzen ergänzen' })).not.toBeInTheDocument();
    const state = (await repo.pizzaNight.load()).pizzaNight!; expect(state.recipes).toHaveLength(9); expect(state.standardRecipesVersion).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Pesto' }));
    const details = screen.getByRole('region', { name: 'Rezeptdetails' });
    expect(within(details).getByText('selbst gemachtes Pesto')).toBeVisible(); expect(within(details).queryByText('Fior di Latte')).not.toBeInTheDocument();
    fireEvent.click(navigation('Pizzaabend')); fireEvent.click(await screen.findByRole('button', { name: 'Pizzaabend anlegen' }));
    fireEvent.change(screen.getByLabelText('Name des Pizzaabends'), { target: { value: 'Standards testen' } });
    fireEvent.change(screen.getByLabelText('Belagrezept auswählen'), { target: { value: 'forno-standard-v1-pesto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rezept hinzufügen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend speichern' })); await screen.findByText('Pizzaabend auf diesem Gerät gespeichert.');
    expect((await repo.pizzaNight.load()).pizzaNight?.evening?.items[0].recipeSnapshot).toEqual({ name: 'Pesto', ingredients: ['San Marzano', 'selbst gemachtes Pesto', 'Tomaten', 'Pinienkerne', 'Burrata', 'Parmesan'], preparation: '' });
  });
  it('requires explicit addition for existing collections, preserves failed writes, edits and deletions across reloads', async () => {
    const { db, repo } = await setup();
    const own = { id: 'own', name: 'Meine Pizza', ingredients: ['Mein Belag'], preparation: '', createdAt: '2026-11-07T12:00:00.000Z', updatedAt: '2026-11-07T12:00:00.000Z' };
    await repo.pizzaNight.saveRecipe(own, null); const before = await db.entries!(); const view = render(<App repo={repo} />);
    await screen.findByRole('button', { name: 'Standardpizzen ergänzen' }); expect(await db.entries!()).toEqual(before);
    vi.spyOn(db, 'update').mockRejectedValueOnce(Error('Speicher voll'));
    fireEvent.click(screen.getByRole('button', { name: 'Standardpizzen ergänzen' })); expect(await screen.findByRole('alert')).toHaveTextContent('Nicht gespeichert');
    expect(screen.queryByText('Standardpizzen ergänzt. Bestehende Rezepte bleiben unverändert.')).not.toBeInTheDocument(); expect(await db.entries!()).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Standardpizzen ergänzen' })); await screen.findByText('Standardpizzen ergänzt. Bestehende Rezepte bleiben unverändert.');
    expect(screen.queryByRole('button', { name: 'Standardpizzen ergänzen' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pesto' })); fireEvent.click(screen.getByRole('button', { name: 'Rezept bearbeiten' }));
    fireEvent.change(screen.getByLabelText('Rezeptname'), { target: { value: 'Hauspesto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rezept speichern' })); await screen.findByText('Rezept auf diesem Gerät gespeichert.');
    fireEvent.click(screen.getByRole('button', { name: 'Margherita' })); fireEvent.click(screen.getByRole('button', { name: 'Rezept löschen' })); await screen.findByText('Rezept gelöscht.');
    view.unmount(); render(<App repo={createFornoRepository(db)} />); await screen.findByRole('button', { name: 'Hauspesto' });
    expect(screen.queryByRole('button', { name: 'Margherita' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Standardpizzen ergänzen' })).not.toBeInTheDocument();
    const after = (await repo.pizzaNight.load()).pizzaNight!; expect(after.recipes).toHaveLength(9); expect(after.recipes.find(row => row.id === own.id)).toEqual(own);
    expect(after.standardRecipesVersion).toBe(2);
  });
});

it('automatically adds only the V2 recipes to an initialized collection and offers them for the evening', async () => {
  const { db, repo } = await setup();
  await db.set(PIZZA_NIGHT_KEY, { version: 1, recipes: [], evening: null, standardRecipesVersion: 1 });
  render(<App repo={repo} />);
  await screen.findByRole('button', { name: 'Marcello' });
  expect(screen.getByRole('button', { name: 'Prosciutto e Funghi' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Salami' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Standardpizzen ergänzen' })).not.toBeInTheDocument();
  fireEvent.click(navigation('Pizzaabend')); fireEvent.click(await screen.findByRole('button', { name: 'Pizzaabend anlegen' }));
  fireEvent.change(screen.getByLabelText('Name des Pizzaabends'), { target: { value: 'Neue Beläge' } });
  fireEvent.change(screen.getByLabelText('Belagrezept auswählen'), { target: { value: 'forno-standard-v2-marcello' } });
  fireEvent.click(screen.getByRole('button', { name: 'Rezept hinzufügen' }));
  fireEvent.change(screen.getByLabelText('Belagrezept auswählen'), { target: { value: 'forno-standard-v2-prosciutto-e-funghi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Rezept hinzufügen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pizzaabend speichern' })); await screen.findByText('Pizzaabend auf diesem Gerät gespeichert.');
  expect((await repo.pizzaNight.load()).pizzaNight?.evening?.items.map(item => item.recipeSnapshot)).toEqual([
    { name: 'Marcello', ingredients: ['San Marzano', 'Fior di Latte', 'Salami Milano', 'Oliven', 'Burrata'], preparation: '' },
    { name: 'Prosciutto e Funghi', ingredients: ['San Marzano', 'Fior di Latte', 'Prosciutto cotto (gekochter Schinken)', 'Champignons'], preparation: '' },
  ]);
});
