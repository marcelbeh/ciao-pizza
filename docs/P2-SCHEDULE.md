# FORNO. P2 — Lokaler Zeitplan

## Bedienung

Unter „Zeitplan“ Backdatum und Uhrzeit wählen, mit oder ohne Kühlschrankphase planen und die Dauern für Stockgare, kalte Stockgare und Stückgare einstellen. Knetdauer, Vorheizen sowie Raum-/Kühlschranktemperatur stehen unter den Details. Alle Felder zeigen ihre unterstützten Bereiche. Die Vorauswahl ist ein Vorschlag und noch kein gespeicherter Zeitplan.

Die Schritte werden sofort als **Vorschau** angezeigt. Erst „Zeitplan speichern“ bzw. „Änderungen speichern“ übernimmt sie auf diesem Gerät. Ungültige Eingaben werden markiert; bis zur Korrektur kann nicht gespeichert werden. Beim Wechsel auf eine andere Seite werden ungespeicherte Entwürfe verworfen. Ein fehlgeschlagener Schreibvorgang bleibt sichtbar und kann mit demselben Entwurf erneut versucht werden. Ein PWA-Update ist während eines ungespeicherten Entwurfs bzw. Schreibvorgangs gesperrt.

Das Dashboard zeigt den nächsten geplanten Zeitpunkt und bei gleichen Startzeiten alle betroffenen Schritte. Die Anzeige aktualisiert sich minütlich und beim Zurückkehren zur App. Nach dem Backtermin wird der Plan als vergangen angezeigt; Arbeitsschritte werden dadurch nicht als tatsächlich ausgeführt markiert. Pläne mit bereits vergangenem Beginn bleiben lesbar und zeigen einen Hinweis.

## Berechnung und Grenzen

`src/core/schedule/plan.ts` verwendet die bestehende Funktion `plannedPhases`. Vom Backtermin rückwärts: Stückgare → optionale kalte Stockgare → Stockgare im Raum → Mischen/Kneten. Vorheizen wird unabhängig vom Backtermin abgezogen und chronologisch einsortiert, auch wenn es vor dem Kneten beginnt. Das Backen selbst ist der abschließende Zeitpunkt; P2 berechnet keine Ofenchargen oder Backlaufdauer.

Die bisherigen Bereiche gelten weiter: Stock-/Stückgare jeweils 0,25–24 Stunden, kalte Stockgare 12–72 Stunden, Kneten 5–60 Minuten, Vorheizen 10–120 Minuten. Es sind manuell gewählte Dauern, **keine automatische Reifeprognose**. Temperaturen werden als Phasenangaben gespeichert, ändern aber weder Zeiten noch Hefemenge. Teigzustand, Mehl und tatsächliche Bedingungen bleiben ausschlaggebend.

Zeitpunkte werden als ISO-UTC gespeichert, Dauern als verstrichene Stunden/Minuten gerechnet. Die Oberfläche zeigt die jeweilige Gerätezeitzone und Zeitzonenkürzel an den Schritten. Dadurch bleiben echte Dauern bei Reisen oder Zeitumstellungen erhalten; die lokale Anzeige kann sich ändern. Nicht existierende Frühlings-Uhrzeiten und doppelte Herbst-Uhrzeiten beim Backtermin werden abgewiesen, statt unbemerkt verschoben zu werden. Ein anderer eindeutiger Backtermin ist dann erforderlich.

## Speicherung und Datenerhalt

Neuer additiver Schlüssel: `forno:schedule:v1` in derselben IndexedDB-Datenbank `ciao-pizza`, Store `key-value`. Beim Laden wird nichts geschrieben. Vorhandene Teigrezepturen, Einstellungen, Belagrezepte, alte Pizzaabende, Fotos und Cloud-Archive werden nicht geändert oder gelöscht. Ein altes automatisch erzeugtes Backdatum wird nicht als neuer Zeitplan importiert.

Die bestehende vollständige JSON-Sicherung enthält den neuen Zeitplan auch im Speicheradapter-Fallback ohne `entries`. Ein unbekannter oder beschädigter gespeicherter Zeitplan wird nicht überschrieben. Nur die Zeitplanansicht meldet den Fehler; der Teigrechner und die Datensicherung bleiben verfügbar. Wiederherstellungsoberfläche, mehrere Zeitpläne, Erinnerungs-Pushs, tatsächliche Fortschrittserfassung und Pizzaabend-/Rezeptverwaltung gehören nicht zu P2.

## Prüfung und Auslieferung

Gezielte Tests für kalte/direkte Planung, Vorheiz-Überlappung, gleiche Startzeiten, ungültige Eingaben, UTC-/Sommerzeitverhalten, Speicherung/Wiederherstellung, unveränderte Altbestände, unbekannte Versionen, vollständige Sicherung und UI-Schreibfehler. Die bisherigen Rechner-/Navigationsprüfungen laufen mit. Typecheck und Produktionsbuild ergänzen die Checks.

Design und Header aus dem aktuellen `main` bleiben bestehen. Die Zeitplanseite und ihre Logik sind im bestehenden App-Bundle und dadurch im bisherigen Service-Worker-Precache enthalten; keine neuen Pakete, APIs oder Konten. Eine physische iPhone-/Offline-Geräteabnahme ist nicht enthalten. Kein automatischer Merge oder Deployment.

## Darstellung als Zeitstrahl

Die Schritte stehen auf einem vertikalen Zeitstrahl mit durchgehender Linie und Ereignismarkierungen. Tagesabschnitte nennen den ausgeschriebenen Wochentag sowie Datum und Jahr. Die Gruppierung folgt dem lokalen Kalendertag des Geräts. Uhrzeit, Dauer, Temperatur und Endzeit bleiben an der jeweiligen Phase; Endzeiten und die Dashboard-Zusammenfassung nennen ebenfalls den Wochentag. Gleichzeitige Schritte bleiben unter demselben Tag und werden beide als nächste Schritte markiert. Die Abstände dienen der Lesbarkeit und sind keine maßstäbliche Zeitachse.

Diese Änderung betrifft nur die Darstellung. Berechnung, Reihenfolge, gespeicherte Zeitpunkte und Speicherschlüssel bleiben unverändert. Zusätzliche gezielte UI-Tests prüfen Tagesgruppierung, Wochentage, gleichzeitige Schritte und Endzeiten über Mitternacht.
