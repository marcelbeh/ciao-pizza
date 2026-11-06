# FORNO. by Marcel

Privater, offline-fähiger Pizzarechner im Fresh-Food-Design mit Hell-, Dunkel- und Systemmodus. React, TypeScript, Vite und installierbare PWA; ohne Konto oder externe API. P1 umfasst Dashboard, Teigrechner und dezente Bottom-Navigation. P2 ergänzt den lokalen Zeitplan. Pizzaabend/Belagrezepte (P3) bleiben vorbereitet.

[Fresh-Food-Design, Theme-Verhalten und Prüfungen](docs/FRESH-FOOD.md)

## Entwickeln

Node.js >=22.12 (empfohlen 24 LTS), npm:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

`npm test` führt die relevanten Rechner-, Zeitplan-, Speicher- und UI-Tests aus. `npm run check` kombiniert diese mit Typecheck und Build. Basispfad bleibt `/ciao-pizza/`; Navigation per Hash. Der Pages-Workflow bleibt ausschließlich manuell auf `main` mit `FREIGEGEBEN`. Ein Push oder PR veröffentlicht nichts.

## P1

- Sofortige Mengenberechnung mit acht Pizzen à 280 g, 66 % Hydration, 3 % Salz, 0,1 % Trockenhefe und Caputo Pizzeria 00 als Ausgangswerten.
- Mehl = Gesamtteig / (1 + Hydration/100 + Salz/100 + Trockenhefe/100). Der vorhandene Berechnungskern bleibt erhalten. Zwischenwerte werden nicht gerundet.
- Automatisches lokales Speichern gültiger Änderungen; Fehler werden sichtbar angezeigt. Ungültige Eingaben überschreiben keine gespeicherten Werte.
- Dashboard zeigt die aktuellen Teigeinstellungen und einen vorhandenen Pizzaabend mit Backtermin in dessen Zeitzone. Der Teigrechner und die vorbereitete Pizzaabend-Seite sind direkt erreichbar. Ohne Zeitplandaten werden keine nächsten Zeitpunkte erfunden.
- Einheitliche Inter-Wortmarke, Terrakotta-Akzent und typografische PWA-Icons. Keine Gitarrenmotive, dekorativen Bilder oder Schatten: [Designsystem](docs/BRANDING.md).
- Inter ist die einzige Schriftfamilie. Sie wird lokal ausgeliefert und offline gecacht; SIL-OFL-Lizenz unter `public/fonts/`.

## P2 · Zeitplan

Backtermin, Raum-/Kühlschrankphasen und daraus rückwärts berechnete Arbeitsschritte. Vorschau mit ausdrücklichem Speichern; nächster geplanter Schritt im Dashboard. Keine automatische Gärprognose oder Anpassung der Hefemenge. [Bedienung, Grenzen und Datenerhalt](docs/P2-SCHEDULE.md).

## Daten bleiben erhalten

Die IndexedDB-Datenbank heißt weiterhin **`ciao-pizza`**, Version 1, Object Store `key-value`. Origin und Pages-Pfad bleiben gleich. FORNO. löscht oder überschreibt keine alten Datensätze.

`forno:calculator:v1` enthält ausschließlich die neue Rezeptur. `ciao-workspace:v2`, `dough-workspace:v1` und vorhandene Cloud-Caches bleiben unverändert. Persönliche Belagrezepte, Profile, Abende, Listen, Tagebuch und Fotos bleiben gespeichert, auch wenn die alten Ansichten entfernt wurden. Unter „Daten & Offline“ lässt sich eine JSON-Sicherung **aller** Einträge des Object Stores herunterladen. Der P1-Export ist ein Datenarchiv; Importoberfläche und Belagrezeptverwaltung sind nicht Teil von P1. Browserdaten nicht ohne Sicherung löschen.

Eine passende aktive alte Rezeptur wird lesend als Kopie übernommen: Mengenbasis Teiglinge, kein Öl/Zucker, manuell gewählte Hefe, gültige P1-Werte. Frischhefe wird mit der bisherigen 3:1-Konvention in Trockenhefe umgerechnet. Andere alte Rezepturen bleiben unverändert erhalten; der neue Rechner startet dann mit den Standardwerten. Neue FORNO.-Einstellungen haben Vorrang. Unbekannte/beschädigte FORNO.-Versionen werden mit Fehler abgewiesen, statt sie zu ersetzen.

Entfernt wurden Auth-/Sync-Clients, Cloud-Konfiguration, Academy, Teig-Doc, Tagebuch, Backcoach, Rezept-/Planungs-/Einkaufs-UIs, komplexe Navigation und Classico-Assets. Im Ausgangsstand gab es keine Gemini-/Premium-Implementierung. Historische SQL-Dateien unter `supabase/` bleiben als Schemahistorie erhalten und werden von der App weder eingebunden noch ausgeführt. Der Cloud-Dienst selbst wurde nicht verändert.

## Offline und Prüfung

Nach dem ersten vollständigen Online-Laden und der Service-Worker-Aktivierung sind Rechner, Navigation, lokale Schriften und Daten offline verfügbar. Updates erfordern einen bewussten Klick; während Speichern oder ungültigen Eingaben ist die Aktualisierung gesperrt. Installation auf dem iPhone über Safari → Teilen → Zum Home-Bildschirm.

Abnahme und bekannte Grenzen: [P1-Prüfprotokoll](docs/P1-FORNO.md).
