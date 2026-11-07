# FORNO. P2 — Lokaler Zeitplan

## Bedienung

Unter „Zeitplan“ Backdatum und Uhrzeit wählen, mit oder ohne Kühlschrankphase planen und die Dauern für Stockgare, kalte Stockgare und Stückgare einstellen. Knetdauer, Vorheizen sowie Raum-/Kühlschranktemperatur stehen unter den Details. Alle Felder zeigen ihre unterstützten Bereiche. Die Vorauswahl ist ein Vorschlag und noch kein gespeicherter Zeitplan.

Die Schritte werden sofort als **Vorschau** angezeigt. Erst „Zeitplan speichern“ bzw. „Änderungen speichern“ übernimmt sie auf diesem Gerät. Ungültige Eingaben werden markiert; bis zur Korrektur kann nicht gespeichert werden. Beim Wechsel auf eine andere Seite werden ungespeicherte Entwürfe verworfen. Ein fehlgeschlagener Schreibvorgang bleibt sichtbar und kann mit demselben Entwurf erneut versucht werden. Ein PWA-Update ist während eines ungespeicherten Entwurfs bzw. Schreibvorgangs gesperrt.

Das Dashboard zeigt den nächsten geplanten Zeitpunkt und bei gleichen Startzeiten alle betroffenen Schritte. Die Anzeige aktualisiert sich minütlich und beim Zurückkehren zur App. Nach dem Backtermin wird der Plan als vergangen angezeigt; Arbeitsschritte werden dadurch nicht als tatsächlich ausgeführt markiert. Pläne mit bereits vergangenem Beginn bleiben lesbar und zeigen einen Hinweis.

## Berechnung und Grenzen

Für vorhandene Pläne der Version 1 verwendet `src/core/schedule/plan.ts` unverändert die bestehende Funktion `plannedPhases`. Vom Backtermin rückwärts: Stückgare → optionale kalte Stockgare → Stockgare im Raum → Mischen/Kneten. Vorheizen wird unabhängig vom Backtermin abgezogen und chronologisch einsortiert, auch wenn es vor dem Kneten beginnt. Das Backen selbst ist der abschließende Zeitpunkt; P2 berechnet keine Ofenchargen oder Backlaufdauer.

Die bisherigen Bereiche gelten weiter: Stock-/Stückgare jeweils 0,25–24 Stunden, kalte Stockgare 12–72 Stunden, Kneten 5–60 Minuten, Vorheizen 10–120 Minuten. Es sind manuell gewählte Dauern, **keine automatische Reifeprognose**. Temperaturen werden als Phasenangaben gespeichert, ändern aber weder Zeiten noch Hefemenge. Teigzustand, Mehl und tatsächliche Bedingungen bleiben ausschlaggebend.

Zeitpunkte werden als ISO-UTC gespeichert, Dauern als verstrichene Stunden/Minuten gerechnet. Die Oberfläche zeigt die jeweilige Gerätezeitzone und Zeitzonenkürzel an den Schritten. Dadurch bleiben echte Dauern bei Reisen oder Zeitumstellungen erhalten; die lokale Anzeige kann sich ändern. Nicht existierende Frühlings-Uhrzeiten und doppelte Herbst-Uhrzeiten beim Backtermin werden abgewiesen, statt unbemerkt verschoben zu werden. Ein anderer eindeutiger Backtermin ist dann erforderlich.

## Speicherung und Datenerhalt

Weiterhin derselbe Schlüssel: `forno:schedule:v1` in derselben IndexedDB-Datenbank `ciao-pizza`, Store `key-value`. Beim Laden wird nichts geschrieben. Vorhandene Teigrezepturen, Einstellungen, Belagrezepte, alte Pizzaabende, Fotos und Cloud-Archive werden nicht geändert oder gelöscht. Ein altes automatisch erzeugtes Backdatum wird nicht als neuer Zeitplan importiert.

Die bestehende vollständige JSON-Sicherung enthält den neuen Zeitplan auch im Speicheradapter-Fallback ohne `entries`. Ein unbekannter oder beschädigter gespeicherter Zeitplan wird nicht überschrieben. Nur die Zeitplanansicht meldet den Fehler; der Teigrechner und die Datensicherung bleiben verfügbar. Wiederherstellungsoberfläche, mehrere Zeitpläne, Erinnerungs-Pushs, tatsächliche Fortschrittserfassung und Pizzaabend-/Rezeptverwaltung gehören nicht zu P2.

## Prüfung und Auslieferung

Gezielte Tests für kalte/direkte Planung, Vorheiz-Überlappung, gleiche Startzeiten, ungültige Eingaben, UTC-/Sommerzeitverhalten, Speicherung/Wiederherstellung, unveränderte Altbestände, unbekannte Versionen, vollständige Sicherung und UI-Schreibfehler. Die bisherigen Rechner-/Navigationsprüfungen laufen mit. Typecheck und Produktionsbuild ergänzen die Checks.

Design und Header aus dem aktuellen `main` bleiben bestehen. Die Zeitplanseite und ihre Logik sind im bestehenden App-Bundle und dadurch im bisherigen Service-Worker-Precache enthalten; keine neuen Pakete, APIs oder Konten. Eine physische iPhone-/Offline-Geräteabnahme ist nicht enthalten. Kein automatischer Merge oder Deployment.

## Darstellung als Zeitstrahl

Die Schritte stehen auf einem vertikalen Zeitstrahl mit durchgehender Linie und Ereignismarkierungen. Tagesabschnitte nennen den ausgeschriebenen Wochentag sowie Datum und Jahr. Die Gruppierung folgt dem lokalen Kalendertag des Geräts. Uhrzeit, Dauer, Temperatur und Endzeit bleiben an der jeweiligen Phase; Endzeiten und die Dashboard-Zusammenfassung nennen ebenfalls den Wochentag. Gleichzeitige Schritte bleiben unter demselben Tag und werden beide als nächste Schritte markiert. Die Abstände dienen der Lesbarkeit und sind keine maßstäbliche Zeitachse.

Die ursprüngliche Zeitstrahl-Ergänzung betrifft nur die Darstellung. Die neue Vorlage ergänzt die unten beschriebene zweite Planversion; vorhandene Pläne bleiben unverändert. Zusätzliche gezielte UI-Tests prüfen Tagesgruppierung, Wochentage, gleichzeitige Schritte und Endzeiten über Mitternacht.


## Vorlage „Teichner · 48 Stunden“

Unter **Vorlage** bewusst „Teichner · 48 Stunden“ auswählen. Das ändert ausschließlich den
Entwurf und seine Vorschau; erst **Zeitplan speichern / Änderungen speichern** ersetzt den
vorhandenen Plan. Ohne diese Auswahl bleibt auch bei einem Neustart die alte Phasenbedeutung
unverändert. Die Option zum Beibehalten/Zurücksetzen stellt den zuletzt gespeicherten Ablauf
wieder her. Backtermin, aktuelle Knetdauer sowie eingegebene Raum-/Kühlschranktemperatur bleiben
bei der Vorlagenauswahl erhalten; Vorheizen wird auf 30 Minuten gesetzt.

| Zeitpunkt relativ zum Backen | Arbeitsschritt / Phase | Dauer |
| --- | --- | --- |
| −48 h minus Knetdauer | Mischen und Kneten | zusätzlich, z. B. 20 min |
| −48 h | Ende Kneten, Stockgare im Kühlschrank | 24 h |
| −24 h | Portionieren/Rundschleifen, Stückgare im Kühlschrank | 20 h |
| −4 h | Teiglinge herausnehmen, Akklimatisierung im Raum | 4 h |
| −30 min | Ofen vorheizen, parallel zur Akklimatisierung | 30 min |
| Backtermin | Formen, Belegen und Backen | Zeitpunkt |

Die Gärphasen ergeben **24 + 20 + 4 = exakt 48 verstrichene Stunden**, auch über eine
Zeitumstellung hinweg. Portionieren ist der Übergang zur kalten Stückgare und bekommt keine
zusätzliche Dauer. Vorheizen wird unabhängig vom Backtermin abgezogen und verlängert den Plan
nicht. Mit 20 Minuten Kneten startet die Vorbereitung 48 h 20 min vor dem Backtermin.

Die Phasendauern bleiben wie bisher manuell anpassbar. Die Oberfläche zeigt die resultierende
Gärdauer und weist darauf hin, dass geänderte Dauern die Vorlage anpassen; beispielsweise
24 + 21 + 4 ergeben dann 49 statt 48 Stunden. Für Version 2 gelten 0,25–72 h für jede kalte
Phase und 0,25–24 h für die Akklimatisierung; die übrigen Grenzen bleiben unverändert.
Temperaturen sind weiterhin einstellbare Angaben, keine Prognose oder automatische Hefeanpassung.

### Kompatibilität

- Gespeicherte Version 1 bleibt Version 1: Raum-Stockgare → optional kalte Stockgare → Raum-Stückgare.
- Erst nach Vorlagenauswahl und ausdrücklichem Speichern entsteht Version 2 mit `method: cold-staged`,
  `coldBulkHours`, `coldBallHours` und `acclimationHours` sowie den bisherigen gemeinsamen Feldern.
- Kein Schreiben beim Laden oder bei der Vorschau, keine automatische Migration/Umdeutung.
- Der Schlüssel bleibt `forno:schedule:v1` (historischer Schlüsselname); die **Datensatzversion**
  unterscheidet die Modelle. Datenbank `ciao-pizza`, DB-Version 1 und Store `key-value` bleiben gleich.
- Der bestehende Repository-Schutz gegen unbekannte/beschädigte Daten bleibt aktiv; vollständige
  Sicherungen enthalten beide Versionen unverändert. Rechner, P3 und alle persönlichen Daten
  werden von dieser Änderung nicht geschrieben oder angepasst.
- Vorschau, gespeicherter Zeitstrahl und nächster Dashboard-Schritt verwenden dieselbe Berechnung.

Gezielte Tests prüfen Phasenfolge/Temperaturen, exakte 48 h, zusätzliche Knetzeit,
dauerlosen Portionierübergang, paralleles Vorheizen, nächste Schritte und Sommerzeit.
Repository-/UI-Tests sichern explizite Auswahl/Speichern, Zurücksetzen, Speicherausfall,
Wiederherstellung und unveränderte Alt-/P3-/Rechner-/unbekannte Daten ab. `npm run check`
umfasst diese Tests, Typecheck und Produktionsbuild. Kein Merge und kein Deployment.

Abnahme dieser Ergänzung: `npm run check` erfolgreich mit **119 Tests in 10 Dateien**, Typecheck
und Produktionsbuild; `git diff --check` ohne Befund. Ein gezielter Chromium-Browsercheck am lokalen
Produktionsbuild (390 × 844) bestätigt: Vorschau verändert den alten Plan nicht, Version 2 wird
explizit gespeichert und nach Neuladen wiederhergestellt, Knetdauer/Temperaturen bleiben erhalten,
kein horizontaler Überlauf und derselbe kalte Portionierschritt im Dashboard. Kein physischer
Safari-/iPhone-Test. P3, Berechnungskern, Design, DB-Implementierung und Deployment bleiben unverändert.
