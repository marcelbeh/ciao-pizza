# FORNO. by Marcel

Privater, offline-fähiger Pizzarechner im Fresh-Food-Design mit Hell-, Dunkel- und Systemmodus. React, TypeScript, Vite und installierbare PWA; ohne Konto oder externe API. P1 umfasst Dashboard, Teigrechner und dezente Bottom-Navigation. P2 ergänzt den lokalen Zeitplan. P3 verwaltet lokale Belagrezepte und einen aktuellen Pizzaabend.

[Fresh-Food-Design, Theme-Verhalten und Prüfungen](docs/FRESH-FOOD.md) · [P3: Bedienung, Datenerhalt und Prüfung](docs/P3-PIZZA-NIGHT.md)

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
- Thermomix-Chargen: maximal 400 g Mehl pro Charge, gleichmäßig aufgeteilt; Mehl + Wasser jeweils 30 Sekunden Teigstufe, anschließend Salz und Trockenhefe per Hand einarbeiten und mehrere Chargen zusammenführen. [Ablauf und Berechnung](docs/THERMOMIX.md).
- Mehl = Gesamtteig / (1 + Hydration/100 + Salz/100 + Trockenhefe/100). Der vorhandene Berechnungskern bleibt erhalten. Zwischenwerte werden nicht gerundet.
- Automatisches lokales Speichern gültiger Änderungen; Fehler werden sichtbar angezeigt. Ungültige Eingaben überschreiben keine gespeicherten Werte.
- Dashboard zeigt die aktuellen Teigeinstellungen und den aktuellen Pizzaabend mit Pizzaanzahl und gespeichertem P2-Backtermin. Ein lesbarer alter Abend bleibt separat als „Bisheriger Pizzaabend“ sichtbar. Ohne Zeitplandaten werden keine nächsten Zeitpunkte erfunden.
- Geliefertes illustriertes FORNO.-Logo, Terrakotta-/Oliv-Akzente, lokale Food-Fotos und passende Ofen-Icons in beiden Themes: [Marke und Design](docs/BRANDING.md).
- Die UI verwendet lokales Inter (SIL-OFL-Lizenz unter `public/fonts/`); die Dashboard-Begrüßung eine kursive System-Serifenschrift. Keine externen Schriftabrufe.

## P2 · Zeitplan

Backtermin, Raum-/Kühlschrankphasen und daraus rückwärts berechnete Arbeitsschritte. Für neue Planungen gibt es ausschließlich „Teichner · 48 Stunden“ mit 24 h kalte Stockgare, 20 h kalte Stückgare und 4 h Akklimatisierung, mit zusätzlicher Knetzeit und parallelem Vorheizen. Gespeicherte ältere Pläne bleiben lesbar und werden erst auf ausdrücklichen Wunsch umgestellt. Vorschau mit ausdrücklichem Speichern; nächster geplanter Schritt im Dashboard. Keine automatische Gärprognose oder Anpassung der Hefemenge. [Bedienung, Grenzen und Datenerhalt](docs/P2-SCHEDULE.md).

## P3 · Pizzaabend und Belagrezepte

Neue lokale Sammlungen starten einmalig mit neun bearbeitbaren Standardpizzen: Margherita,
Salami, Funghi, Pesto, Bianca, Tonno, ’Nduja 🌶️, Marcello und Prosciutto e Funghi. Bereits mit Version 1 initialisierte
Sammlungen erhalten einmalig nur die beiden neuen Rezepte; gelöschte alte Rezepte bleiben gelöscht.
Bei bestehenden Sammlungen ohne Initialisierungsmarker erfolgt die Ergänzung ausschließlich mit **Standardpizzen ergänzen** hinzugefügt. Ein dauerhaft gespeicherter
Versionsmarker schützt eigene Änderungen und Löschungen vor erneutem Einfügen. Keine erfundenen
Mengen oder Zubereitungsschritte. [Initialisierung und Datenerhalt](docs/P3-PIZZA-NIGHT.md#standardpizzen).

Unter **Rezepte** Beläge mit Name, einer Zutat pro Zeile und optionaler Zubereitung anlegen,
anzeigen, bearbeiten und nach Bestätigung löschen. Unter **Pizzaabend** einen aktuellen Abend
mit Name, optionaler Notiz und Rezeptpositionen planen. Eine feste Rezeptkopie schützt den Abend
vor späteren Bibliotheksänderungen oder Löschungen. Erneutes Hinzufügen desselben Rezepts erhöht
seine Stückzahl. Der Mengenabgleich gibt Hinweise, verändert aber keine Teigwerte.

Beide Seiten speichern ausdrücklich; Abbrechen verwirft den Entwurf nach Rückfrage bei Änderungen.
Navigation und Browser-Zurück fragen vor dem Verwerfen; PWA-Updates bleiben während Bearbeitung
und Speichern gesperrt. Es gibt keinen eigenen Abendtermin: Es gilt immer der gespeicherte P2-Zeitplan.
Keine Rezeptskalierung oder Übernahme alter Daten; keine mehreren gleichzeitigen Abende und keine Import-/Archivfunktion.

## Daten bleiben erhalten

Die IndexedDB-Datenbank heißt weiterhin **`ciao-pizza`**, Version 1, Object Store `key-value`. Origin und Pages-Pfad bleiben gleich. FORNO. löscht oder überschreibt keine alten Datensätze.

`forno:calculator:v1` enthält ausschließlich die neue Rezeptur. `ciao-workspace:v2`, `dough-workspace:v1` und vorhandene Cloud-Caches bleiben unverändert. Persönliche Belagrezepte, Profile, Abende, Listen, Tagebuch und Fotos bleiben gespeichert, auch wenn die alten Ansichten entfernt wurden. Unter „Daten & Offline“ lässt sich eine JSON-Sicherung **aller** Einträge des Object Stores herunterladen. Die Sicherung ist ein Datenarchiv; eine Importoberfläche gibt es nicht. P3 verwendet ausschließlich den neuen Schlüssel `forno:pizza-night:v1` und übernimmt keine alten Rezepte oder Abende. Unbekannte oder beschädigte P3-Daten werden sichtbar gemeldet und nicht überschrieben; andere Bereiche und Sicherung bleiben erreichbar. Browserdaten nicht ohne Sicherung löschen.

Eine passende aktive alte Rezeptur wird lesend als Kopie übernommen: Mengenbasis Teiglinge, kein Öl/Zucker, manuell gewählte Hefe, gültige P1-Werte. Frischhefe wird mit der bisherigen 3:1-Konvention in Trockenhefe umgerechnet. Andere alte Rezepturen bleiben unverändert erhalten; der neue Rechner startet dann mit den Standardwerten. Neue FORNO.-Einstellungen haben Vorrang. Unbekannte/beschädigte FORNO.-Versionen werden mit Fehler abgewiesen, statt sie zu ersetzen.

Entfernt wurden Auth-/Sync-Clients, Cloud-Konfiguration, Academy, Teig-Doc, Tagebuch, Backcoach, Rezept-/Planungs-/Einkaufs-UIs, komplexe Navigation und Classico-Assets. Im Ausgangsstand gab es keine Gemini-/Premium-Implementierung. Historische SQL-Dateien unter `supabase/` bleiben als Schemahistorie erhalten und werden von der App weder eingebunden noch ausgeführt. Der Cloud-Dienst selbst wurde nicht verändert.

## Offline und Prüfung

Nach dem ersten vollständigen Online-Laden und der Service-Worker-Aktivierung sind Rechner, Navigation, lokale Schriften und Daten offline verfügbar. Updates erfordern einen bewussten Klick; während Speichern, ungültigen Eingaben oder einer P3-Bearbeitung ist die Aktualisierung gesperrt. Installation auf dem iPhone über Safari → Teilen → Zum Home-Bildschirm.

Abnahme und bekannte Grenzen: [P1-Prüfprotokoll](docs/P1-FORNO.md).
