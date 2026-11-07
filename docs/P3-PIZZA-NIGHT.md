# P3: Lokale Pizzaabende und Belagrezepte

Ausgangspunkt: `main` mit `9c95df7` (finaler Markenabgleich). Kein Redesign, keine neuen
Abhängigkeiten und keine Änderungen an Berechnung, P2-Zeitlogik oder Deployment.

## Tatsächlich implementiert

- `/rezepte`: Belagrezepte anlegen, in derselben Seite anzeigen/bearbeiten und nach Bestätigung löschen.
  Name und mindestens eine nichtleere Zutatenzeile sind erforderlich. Zubereitung ist optional.
- `/pizzaabend`: genau ein aktueller Abend, Name erforderlich, optionale Notiz. Ohne Positionen
  speicherbar. Bibliotheksrezept auswählen, hinzufügen, positive ganze Stückzahl ändern,
  Position entfernen; Abend bearbeiten und nach Bestätigung löschen.
- Beim Hinzufügen entsteht eine unabhängige Inhaltskopie. Erneutes Hinzufügen derselben
  Bibliotheks-ID erhöht die vorhandene Stückzahl, ohne deren Kopie aufzufrischen. Nach dem
  Löschen eines Bibliotheksrezepts bleiben die Abendposition und ihre Kopie unverändert.
- Gesamtanzahl, numerische Differenz und Unter-/Überplanung zur aktuellen Teiglingsanzahl.
  Kein automatisches Ändern oder Speichern des Teigrechners.
- Es wird **kein eigener Backtermin** gespeichert. Angezeigt wird ausschließlich der gespeicherte
  P2-Zeitplan einschließlich Fehlerzustand. Ohne Termin führt ein Link zur Zeitplanung;
  spätere Terminänderungen gelten für denselben aktuellen Abend.
- Dashboard-Kachel zeigt den neuen Abend mit Anzahl und P2-Termin; alte Abendprojektion separat
  als „Bisheriger Pizzaabend“. Alte Daten werden weder importiert noch bearbeitet.
- Explizites Speichern/Abbrechen, verständliche leere Zustände, sichtbare Fehler. Erfolg erst
  nach bestätigtem Commit; bei Fehler bleibt der Entwurf einschließlich ungültiger Eingaben erhalten.
- Linknavigation und Browser-Zurück/-Vorwärts werden über die Blockierfunktion des vorhandenen
  React Routers geschützt. Dafür verwendet die unveränderte Hash-Routenstruktur jetzt dessen
  `createHashRouter`/`RouterProvider`. Beim Schließen/Neuladen schützt `beforeunload` nach den Regeln
  des Browsers. PWA-Update während einer Bearbeitung und während eines Schreibvorgangs gesperrt.

## Datenmodell und Datenerhalt

Ausschließlich neuer Schlüssel **`forno:pizza-night:v1`** im bisherigen Store:

```ts
{
  version: 1,
  recipes: ToppingRecipe[],
  evening: PizzaEvening | null
}
// ToppingRecipe: id, name, ingredients: string[], preparation, createdAt, updatedAt
// PizzaEvening: id, name, notes, items: Item[], createdAt, updatedAt
// Item: id, sourceRecipeId?: string,
//       recipeSnapshot: { name, ingredients: string[], preparation }, quantity
```

Neue IDs sind UUIDs, bleiben bei Bearbeitung erhalten. ISO-Zeitstempel in UTC, `createdAt`
unverändert, `updatedAt` bei explizitem Speichern erneuert. Es gibt keine Terminverknüpfung im P3-Datensatz.
Eine gelöschte Quell-ID darf im Snapshot verbleiben; eine aktuelle Bibliotheksreferenz ist bewusst
keine Voraussetzung. Doppelte Positions-/Rezept-IDs oder mehrere Positionen derselben Quell-ID
werden abgewiesen. Snapshot-Inhalt und Version werden vollständig validiert.

Grenzen: Name 100 Zeichen; 1–100 Zutaten, je 300 Zeichen; Zubereitung 4000 Zeichen;
Notiz 2000 Zeichen; 500 Bibliotheksrezepte/Abendpositionen; Stückzahl 1–10000. Texte werden nur
bei ausdrücklicher Benutzereingabe getrimmt, leere Zutatenzeilen entfernt. Vorhandene gespeicherte
Daten werden beim Lesen niemals normalisiert, migriert oder neu geschrieben. Unbekannte Felder,
Versionen, ungültige IDs, Datenstrukturen, Zeitstempel und Mengen sperren P3-Schreibzugriffe.
Ein fehlender Schlüssel ergibt einen leeren Zustand **ohne Schreibvorgang**.

Jeder P3-Schreibzugriff validiert den bisherigen Datensatz **innerhalb von `store.update`**, klont
ihn, wendet nur die gezielte Änderung an und validiert vor dem atomaren Commit erneut. Ohne
atomare Update-Unterstützung wird Schreiben abgelehnt, statt auf `get`/`set` auszuweichen.
Änderungen an inzwischen bearbeiteten/gelöschten Rezepten oder Abenden werden als Konflikt
abgewiesen; der Entwurf bleibt zum Sichern/Kopieren erhalten. Andere gleichzeitige Änderungen
am gemeinsamen Datensatz bleiben durch den atomaren Zugriff erhalten. Keine automatische
Aktualisierung zwischen Tabs; bei Konflikten Entwurf sichern und neu laden.

Datenbank `ciao-pizza`, Version 1, Store `key-value`, Origin und Basispfad `/ciao-pizza/` bleiben
unverändert. P3 schreibt weder Rechner-/Zeitplanschlüssel noch alte Daten und Cloud-Caches.
Unlesbare P3-Daten blockieren nur die neue Verwaltung; Rechner, Zeitplan und Einstellungen bleiben
zugänglich. Die vollständige Sicherung über `store.entries` exportiert auch unbekannte Einträge
und beschädigte P3-Daten unverändert. Der bisherige Repository-Fallback ohne `entries` enthält
alle bekannten Schlüssel einschließlich P3 und der vollständigen alten Workspace-Datensätze;
eine Aufzählung frei benannter unbekannter Schlüssel setzt weiterhin `entries` voraus.

## Prüfungen

`npm run check` erfolgreich: **104 Tests in 10 Dateien**, Typecheck und Produktionsbuild.
`git diff --check` ohne Befund. Rechner-/Zeitplankern, DB-Implementierung, Theme-Bootstrap,
Pages-Konfiguration und Abhängigkeiten sind unverändert.

Neue Tests prüfen Modell/Version/IDs/Struktur/Grenzen, atomare parallele Änderungen,
Speicherausfälle und Konflikte, fehlenden Schlüssel ohne Schreiben, Schutz beschädigter Daten,
Snapshot-Erhalt nach Rezeptänderung/-löschung, vollständigen Export und P3 im Export-Fallback,
Datenerhalt aller bestehenden/unklaren Schlüssel, CRUD und Bestätigungen, Entwurfserhalt,
PWA-Sperre, unveränderten Rechner und späteren gemeinsamen P2-Termin.

Echte Chromium-Browserprüfung gegen den Produktionsbuild, frische Testprofile:

- iPhone-ähnlich 390 × 844, Desktop 1280 × 900; Hell und Dunkel, echte Screenshots.
- Browser-Zurück und Links: Verwerfen abgelehnt, Entwurf bleibt erhalten.
- Lokale Rezepte und Abend speichern, neu laden; Bibliotheksänderungen/-löschung erhalten Kopien.
- Offline-Neustart, Abend bearbeiten/speichern, Rezept anlegen/neu laden/löschen und Abend löschen.
- Vollständige heruntergeladene JSON-Sicherung gegen alle IndexedDB-Einträge verglichen.
- Bestehende P1-/P2-, alte und unbekannte Testeinträge nach P3-Schreibvorgängen unverändert.
- Kein horizontaler Überlauf; Theme-Wechsel erhält den geöffneten Abendentwurf.

[Browserbericht](p3-visual/browser-report.json) ·
[Rezepte iPhone Hell](p3-visual/recipes-light-390.png) ·
[Rezepte iPhone Dunkel](p3-visual/recipes-dark-390.png) ·
[Abend iPhone Hell](p3-visual/evening-light-390.png) ·
[Abend iPhone Dunkel](p3-visual/evening-dark-390.png) ·
[Bearbeitung iPhone Hell](p3-visual/evening-editor-light-390.png) ·
[Bearbeitung iPhone Dunkel](p3-visual/evening-editor-dark-390.png) ·
[Rezepte Desktop](p3-visual/recipes-light-1280.png) ·
[Abend Desktop](p3-visual/evening-dark-1280.png).

Reproduktion optional mit extern installiertem Playwright (keine App-Abhängigkeit):
`npm run build`, `npm run preview -- --host 127.0.0.1 --port 4175`, anschließend
`NODE_PATH=<Playwright-Verzeichnis>/node_modules node scripts/check-p3-ui.cjs`.

Grenzen: Chromium mit iPhone-ähnlichem Viewport, kein physisches iPhone/Safari-Test.
Keine Importoberfläche, Archive/mehrere Abende, Einkaufsliste, Skalierung, Bilder/Kategorien für
Rezepte, Cloud, Accounts, KI, Journal oder Reife-Monitor. Keine öffentliche PR-Vorschau eingerichtet;
lokaler Produktionsbuild und dokumentierte Screenshots. Kein Merge oder Deployment beauftragt.
