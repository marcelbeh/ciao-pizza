# P5 – Classico, Bedienung und Qualität

## Ausgangsstand und Umfang

Grundlage ist der veröffentlichte P4-Stand `23c97076ff5f9b27d925ab357db9fdda829d1467`. Zu Beginn gab es keinen P5-Branch oder offenen PR. P0/P1, P3 und P4 sind funktionsfähig. Reife-Monitor/P2 und Academy bleiben ihre vorhandenen Platzhalter; P5 führt keine neue große Fachfunktion ein.

Neue gemeinsame Gestaltung in `src/classico.css`: warme Oberflächen, definierte Abstände, abgerundete Karten, ruhige Schatten, systemnahe Typografie, rote Hauptaktionen, grüne Fach-/Navigationsicons und goldene Orientierungshinweise. Höhere Selektorspezifität hält die Gestaltung auch bei nachgeladenen Modul-Styles konsistent. Ausgediente Regeln für die frühere Dashboard-Illustration wurden entfernt. Datenhaltung und Berechnungsmodelle bleiben unverändert.

## Branding und Dashboard

[Asset-Übersicht, Formate, Quellen und Lizenzen](brand/ASSETS.md).

Kompakter mittiger Schriftzug mit rotem Mützenmotiv, responsive eigenständige Teigaufnahme, „Benvenuto!“-Begrüßung und ein Raster der neun Hauptmodule übernehmen den Aufbau der Referenz. Academy und alle bisherigen Routen bleiben erreichbar. Die mobile Navigation bietet Übersicht, Teig, Rezepte, Planung und Mehr; im Teigstudio/Reife-Monitor bzw. Backcoach/Einkauf zeigt sie die passende übergeordnete Gruppe an.

Der aktive Teig verwendet ausschließlich `DoughProvider.state.active`. Name, Stil, Anzahl und Teiglingsgewicht kommen aus dem echten Plan bzw. dem vorhandenen Rechner. Es gibt keinen eingebauten Beispielplan für das Dashboard. Ohne aktiven Plan erscheint ein klarer Einstieg in den Pizza-Piloten.

`dashboardStatus` verwendet die bestehenden `plannedPhases`: Zeitfortschritt zwischen Beginn der Stockgare und geplantem Backen, auf 0–100 % begrenzt. Kalte Zeiten sind enthalten; paralleles Vorheizen ist ein eigener nächster Arbeitsschritt. Vergangene Backtermine werden als solche gekennzeichnet. **Zeitfortschritt ist keine Messung biologischer Reife.** Prozent, nächste Aktion und Restzeit sind ausdrücklich Planungsschätzungen. Es wird weder eine tatsächliche Startbestätigung erfunden noch ein Sensor simuliert.

## Bedienbarkeit und gezielte Verbesserungen

- Die zuvor große permanente lokale Hinweisleiste liegt jetzt kompakt im Daten-/Sicherungsmenü rechts im Kopf. Speicherung, Export, Import, Offline-Hinweise und Installation bleiben erhalten.
- Der permanente schwebende Installationsbutton konnte Inhalte im unteren Bildschirmbereich überlagern. Installation ist nun im Datenmenü; wichtige Update-/Fehlermeldungen bleiben sichtbar. In erkanntem Standalone-Modus entfällt der Installationsbutton.
- Formulare behalten 16-px-Eingabeschrift, erhalten konsistente 48-px-Eingaben, abgerundete Oberflächen und erkennbare Fokus-/Fehlerzustände. Fachliche Grenzwerte werden nicht verändert.
- Die Modulnavigation erhält nach dem Öffnen Tastaturfokus; Escape schließt sie auch dann, wenn der Fokus noch am Öffnen-Button liegt, und gibt den Fokus dorthin zurück. Dieser Randfall wird im bestehenden Navigationstest geprüft.
- Sichere Bildschirmränder werden berücksichtigt. Bei erkanntem Tastaturzustand über `visualViewport` wird die untere Navigation ausgeblendet; beim Zurückkehren wieder eingeblendet. Ohne diese Browser-API bleibt die normale Navigation nutzbar.
- PWA-Updates weisen darauf hin, ungespeicherte Entwürfe vorher zu speichern. Kein automatisches Neuladen, keine neue Speicherbereinigung und keine IndexedDB-Migration.
- Der Backcoach aktualisiert die Zeitanzeige nur bei tatsächlich laufendem Timer. Versteckte Tabs erzeugen keine laufenden Anzeige-Updates; nach Sichtbarwerden wird aus den unveränderten Zeitstempeln neu gerechnet. Dashboard-Ticks sind nur mit aktivem Plan nötig und bleiben auf Minuten beschränkt.

## Performance und PWA

Keine neue App-Abhängigkeit. Vektorlogos benötigen keine Schrift zur Darstellung; nur der Begrüßungstitel nutzt eine lokale Schrift von etwa 32 KB. Mobile und große Teigaufnahme liegen bei etwa 23 bzw. 85 KB. Vorhandenes Lazy Loading bleibt erhalten. Die visuelle Überarbeitung erhöht bewusst die lokalen Bild-/Schriftressourcen; sie behauptet keine unbelegten Lighthouse-Verbesserungen.

Der Service Worker enthält jetzt auch WebP-Bilder und die lokale Schrift. Basispfad, Manifest-Scope und Hash-Routing bleiben `/ciao-pizza/`. Apple-/PWA-Icons, Favicon, maskierbares Zeichen und lokale Ressourcen werden beim Build überprüft. Der neue Installationsort verhindert eine dauerhafte Überlagerung von Back-/Formularaktionen.

P4-Vergleich: Haupt-JavaScript etwa 299 KB bzw. 97 KB gzip; P5 etwa 301 KB bzw. 98 KB gzip. Der gesamte Offline-Precache wächst durch das Branding und das Bildmotiv auf rund 0,71 MiB. Das ist eine bewusste Bild-/Designentscheidung, keine zusätzliche Cloud- oder Analysebibliothek.

## Local First, Datenschutz und Supabase

IndexedDB-Schlüssel, Schema, aktive Pläne, Profile, Rezepte, Pizzaabende, Listen, Reife-Datenplatz und P4-Einträge/Fotos bleiben erhalten. Neue Dashboard-Daten sind nur abgeleitete Ansichten. Keine erzwungene Anmeldung, kein anonymes Konto, kein Tracking, keine externe Font-/Bildanforderung und kein Upload. Supabase-Vorbereitung und vorhandene RLS-Migrationen bleiben unverändert; die Aktivierung der optionalen Synchronisierung gehört weiterhin zu einem späteren eigenen Schritt. SMTP bleibt zurückgestellt.

## Prüfungen und bekannte Grenzen

- Bestehende automatisierte Tests bleiben aktiv. Vier zusätzliche kleine Tests prüfen echte Planphasen, Grenzen 0/100 %, kalte Führung, paralleles Vorheizen und Restzeitformatierung.
- `npm run verify:branding`, TypeScript und Produktionsbuild.
- Browserprüfung aller elf Routen bei 320 und 390 px: Dokumentbreite entspricht jeweils der Viewportbreite, kein horizontaler Seitenüberlauf.
- Teigstudio: sechs Teiglinge zu 250 g ergeben weiterhin 1.500 g Gesamtteig; Speicherung und tatsächliche Anzeige dieses Plans auf dem Dashboard geprüft.
- Lokales Datenmenü, mobile Navigation, Fokuszustände und sichtbare Erhaltung bisheriger P3-/P4-Testdaten geprüft.
- Vorschau-Server abgeschaltet und Nichterreichbarkeit bestätigt: neues Browserfenster aus dem PWA-Cache geöffnet; Logo, Teigaufnahme, Playball-Schrift und gespeicherter Sechs-Pizzen-Plan bleiben verfügbar. Schriftverfügbarkeit und geladene Bilder wurden im Browser kontrolliert. Desktop-Anpassung ohne horizontalen Überlauf ebenfalls geprüft.
- 105 Tests erfolgreich; TypeScript, Branding-Prüfung und Produktionsbuild erfolgreich.

Ein physischer iPhone-/Safari-Test mit geöffneter Systemtastatur und echtem PWA-Standalone-Fenster ist in dieser Umgebung nicht möglich. Die CSS-/Viewport-Unterstützung ersetzt diesen Gerätetest nicht. Hintergrundalarme bleiben die bekannte P4-Grenze. Reife-Monitor und Academy werden nicht als bereits fertig dargestellt.

**Freigabeprozess:** eigener Branch/PR, nicht automatisch mergen und nicht veröffentlichen. Erst nach ausdrücklicher Freigabe den bestehenden manuellen Pages-Workflow starten.
