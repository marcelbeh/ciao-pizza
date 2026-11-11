// Optional external Playwright tool; no app dependency. Run against the production preview.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.FORNO_PREVIEW_URL || 'http://127.0.0.1:4175/ciao-pizza/';
const output = process.env.FORNO_VISUAL_OUTPUT || path.join(__dirname, '../docs/p3-visual');
fs.mkdirSync(output, { recursive: true });
async function entries(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('ciao-pizza', 1);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('key-value', 'readonly');
      const cursor = tx.objectStore('key-value').openCursor(); const values = {};
      cursor.onsuccess = () => { const row = cursor.result; if (row) { values[row.key] = row.value; row.continue(); } };
      tx.oncomplete = () => { db.close(); resolve(values); }; tx.onerror = () => reject(tx.error);
    };
  }));
}
async function seed(page, values) {
  await page.evaluate(values => new Promise((resolve, reject) => {
    const request = indexedDB.open('ciao-pizza', 1);
    request.onsuccess = () => {
      const db = request.result; const tx = db.transaction('key-value', 'readwrite');
      for (const [key, value] of Object.entries(values)) tx.objectStore('key-value').put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
    };
  }), values);
}
const nav = (page, name) => page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name, exact: true }).click();
async function noOverflow(page) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow'); }
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.FORNO_BROWSER_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const report = { browser: browser.version(), capturedAt: new Date().toISOString(), checks: [] };
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => { throw error; });
  await page.goto(base + '#/rezepte', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Deine Belagrezepte' }).waitFor();
  const p1p2 = {
    'forno:calculator:v1': { version: 1, formula: { count: 8, ballGrams: 280, hydration: 66, salt: 3, yeastPercent: .1, flourProfile: 'Caputo Pizzeria 00' } },
    'forno:schedule:v1': { version: 1, bakeAt: '2027-01-09T17:00:00.000Z', method: 'cold', bulkHours: 2, coldHours: 24, ballHours: 4, mixMinutes: 20, preheatMinutes: 30, roomC: 22, fridgeC: 4 },
    'ciao-workspace:v2': { version: 99, personalRecipes: ['untouched'], future: true },
    'unknown-cache:preserve': { opaque: ['all', 'fields'] },
  };
  await seed(page, { ...p1p2, 'forno:pizza-night:v1': { version: 1, recipes: [], evening: null } }); await page.reload({ waitUntil: 'networkidle' });
  await nav(page, 'Teig'); await nav(page, 'Rezepte');
  await page.getByRole('button', { name: 'Rezept anlegen', exact: true }).click();
  await page.getByLabel('Rezeptname', { exact: true }).fill('Margherita');
  await page.getByLabel('Zutaten – eine pro Zeile').fill('Tomate\nMozzarella\nBasilikum');
  console.log('Checking browser Back');
  const backDialog = page.waitForEvent('dialog', { timeout: 5000 }).catch(async error => { console.log('After Back:', await page.evaluate(() => ({ href: location.href, history: history.state, text: document.querySelector('main').innerText.slice(0,500) }))); throw error; }).then(async dialog => { assert(dialog.message().includes('verwerfen')); await dialog.dismiss(); });
  await page.evaluate(() => history.back()); await backDialog;
  await page.waitForFunction(() => history.state.idx === 2 && location.hash === '#/rezepte');
  assert.equal(await page.getByLabel('Rezeptname', { exact: true }).inputValue(), 'Margherita');
  console.log('Checking link discard protection');
  const linkDialog = page.waitForEvent('dialog', { timeout: 5000 }).then(dialog => dialog.dismiss());
  await nav(page, 'Home'); await linkDialog;
  assert.equal(await page.getByLabel('Rezeptname', { exact: true }).inputValue(), 'Margherita');
  console.log('Saving recipe');
  await page.getByRole('button', { name: 'Rezept speichern', exact: true }).click();
  await page.getByText('Rezept auf diesem Gerät gespeichert.', { exact: true }).waitFor();
  await nav(page, 'Pizzaabend'); await page.getByRole('button', { name: 'Pizzaabend anlegen' }).click();
  await page.getByLabel('Name des Pizzaabends').fill('Samstag mit Freunden');
  const recipeId = Object.values(await entries(page)).find(v => v && v.version === 1 && Array.isArray(v.recipes)).recipes[0].id;
  await page.getByLabel('Belagrezept auswählen').selectOption(recipeId);
  await page.getByRole('button', { name: 'Rezept hinzufügen', exact: true }).click();
  await page.getByRole('button', { name: 'Rezept hinzufügen', exact: true }).click();
  assert.equal(await page.getByLabel('Stückzahl – Margherita', { exact: true }).inputValue(), '2');
  await page.getByLabel('Stückzahl – Margherita', { exact: true }).fill('9');
  await page.getByText(/1 Pizza mehr geplant/).waitFor();
  await noOverflow(page);
  await page.getByRole('button', { name: 'Pizzaabend speichern', exact: true }).click();
  await page.getByText('Pizzaabend auf diesem Gerät gespeichert.', { exact: true }).waitFor();
  await nav(page, 'Rezepte'); await page.getByRole('button', { name: 'Margherita', exact: true }).click();
  await page.getByRole('button', { name: 'Rezept bearbeiten', exact: true }).click();
  await page.getByLabel('Rezeptname', { exact: true }).fill('Bianca');
  await page.getByLabel('Zutaten – eine pro Zeile').fill('Ricotta');
  console.log('Saving recipe');
  await page.getByRole('button', { name: 'Rezept speichern', exact: true }).click();
  await page.getByText('Rezept auf diesem Gerät gespeichert.', { exact: true }).waitFor();
  await nav(page, 'Pizzaabend');
  await page.getByText('9 × Margherita', { exact: true }).waitFor();
  await page.getByText('Mozzarella', { exact: true }).waitFor();
  await nav(page, 'Rezepte'); await page.getByRole('button', { name: 'Bianca', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Rezept löschen', exact: true }).click();
  await page.getByText('Rezept gelöscht.', { exact: true }).waitFor();
  await nav(page, 'Pizzaabend'); await page.getByText('9 × Margherita', { exact: true }).waitFor();
  console.log('Checking offline reload and write');
  await page.evaluate(() => navigator.serviceWorker.ready); await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true); await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('9 × Margherita', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Pizzaabend bearbeiten', exact: true }).click();
  await page.getByLabel('Notiz (optional)').fill('Auch offline gespeichert.');
  await page.getByRole('button', { name: 'Pizzaabend speichern', exact: true }).click();
  await page.getByText('Pizzaabend auf diesem Gerät gespeichert.', { exact: true }).waitFor();
  const all = await entries(page);
  for (const [key, value] of Object.entries(p1p2)) assert.deepEqual(all[key], value);
  assert.equal(all['forno:pizza-night:v1'].evening.items[0].recipeSnapshot.name, 'Margherita');
  assert.equal(all['forno:pizza-night:v1'].recipes.length, 0);
  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  console.log('Checking offline backup');
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Sicherung herunterladen' }).click();
  const download = await downloadEvent; const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.deepEqual(backup.entries, all);
  report.checks.push('iPhone: browser Back and links confirm discard; recipe and evening CRUD; source edits/deletion preserve snapshots; quantities leave P1/P2/legacy/unknown data unchanged; offline reload and save; full downloaded backup matches all entries');
  await nav(page, 'Rezepte'); await page.getByRole('button', { name: 'Rezept anlegen', exact: true }).click();
  await page.getByLabel('Rezeptname', { exact: true }).fill('Offline Bianca');
  await page.getByLabel('Zutaten – eine pro Zeile').fill('Ricotta');
  await page.getByRole('button', { name: 'Rezept speichern', exact: true }).click();
  await page.getByText('Rezept auf diesem Gerät gespeichert.', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Offline Bianca', exact: true }).click();
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Rezept löschen', exact: true }).click();
  await page.getByText('Rezept gelöscht.', { exact: true }).waitFor();
  await nav(page, 'Pizzaabend');
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'Pizzaabend löschen', exact: true }).click();
  assert((await entries(page))['forno:pizza-night:v1'].evening);
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Pizzaabend löschen', exact: true }).click();
  await page.getByText('Pizzaabend gelöscht.', { exact: true }).waitFor();
  assert.equal((await entries(page))['forno:pizza-night:v1'].evening, null);
  report.checks.push('Offline recipe create/reload/delete and evening delete; declining delete preserves the evening');
  await context.close();
  // Seed the same independent fixture for actual Light/Dark and desktop UI checks.
  const date = new Date().toISOString();
  const visualRecipe = { id: 'visual-recipe', name: 'Margherita', ingredients: ['Tomate', 'Mozzarella', 'Basilikum'], preparation: 'Gleichmäßig belegen und backen.', createdAt: date, updatedAt: date };
  all['forno:pizza-night:v1'].recipes = [visualRecipe];
  for (const width of [390, 1280]) for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width < 800, hasTouch: width < 800, colorScheme: theme });
    await ctx.addInitScript(theme => localStorage.setItem('forno:theme:v1', theme), theme);
    const p = await ctx.newPage(); await p.goto(base + '#/rezepte', { waitUntil: 'networkidle' });
    await p.getByRole('heading', { name: 'Deine Belagrezepte' }).waitFor(); await seed(p, all); await p.reload({ waitUntil: 'networkidle' });
    await p.getByRole('button', { name: 'Margherita', exact: true }).click(); await noOverflow(p);
    await p.screenshot({ path: `${output}/recipes-${theme}-${width}.png`, fullPage: true });
    await nav(p, 'Pizzaabend'); await p.getByText('9 × Margherita', { exact: true }).waitFor(); await noOverflow(p);
    await p.screenshot({ path: `${output}/evening-${theme}-${width}.png`, fullPage: true });
    await p.getByRole('button', { name: 'Pizzaabend bearbeiten', exact: true }).click();
    await p.getByLabel('Notiz (optional)').fill('Ungespeicherter Theme-Entwurf'); await noOverflow(p);
    // Full-page capture from scroll origin avoids off-screen fixed skip-link artifacts.
    await p.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await p.screenshot({ path: `${output}/evening-editor-${theme}-${width}.png`, fullPage: true });
    await p.getByRole('button', { name: theme === 'light' ? 'Dunkel' : 'Hell', exact: true }).click();
    assert.equal(await p.getByLabel('Name des Pizzaabends').inputValue(), 'Samstag mit Freunden');
    assert.equal(await p.getByLabel('Notiz (optional)').inputValue(), 'Ungespeicherter Theme-Entwurf');
    p.once('dialog', dialog => dialog.accept());
    await p.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await ctx.close(); report.checks.push(`${width}px ${theme}: recipe details, evening display/editor without overflow; theme switch keeps draft`);
  }
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2)); await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
