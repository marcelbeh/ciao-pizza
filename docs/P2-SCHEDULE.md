# FORNO. P2 — Teichner-Zeitplan

## Aktuelle Bedienung

Für neue Planungen gibt es nur noch **Teichner · 48 Stunden**. Kein Vorlagen- oder
Teigführungsmenü. Der Ablauf wird beim ersten Öffnen als ungespeicherter Vorschlag angezeigt;
Laden allein schreibt weiterhin nichts.

Backdatum/Uhrzeit, Phasendauern, Knet-/Vorbereitungsdauer, Vorheizen und Raum-/Kühlschranktemperatur
bleiben einstellbar. Die Zeiten werden sofort als Vorschau angezeigt und erst mit **Zeitplan
speichern / Änderungen speichern** übernommen. Nach manueller Änderung einer Phase zeigt die
Oberfläche die resultierende Gärdauer; es wird nicht pauschal weiterhin „48 h“ behauptet.

| Zeitpunkt vor dem Backen | Übergang / Phase | Dauer |
| --- | --- | --- |
| 48 h plus Vorbereitungsdauer | Mischen/Kneten bzw. alle Thermomix-Chargen und Handarbeit | zusätzlich |
| 48 h | Ende Vorbereitung, Stockgare im Kühlschrank | 24 h |
| 24 h | Portionieren/Rundschleifen, Stückgare im Kühlschrank | 20 h |
| 4 h | Teiglinge herausnehmen, Akklimatisierung im Raum | 4 h |
| 30 min | Ofen vorheizen, parallel zur Akklimatisierung | 30 min |
| Backtermin | Formen, Belegen und Backen | Zeitpunkt |

Die Vorgabe ergibt **24 + 20 + 4 = exakt 48 verstrichene Stunden**. Portionieren ist der Übergang
und verlängert den Plan nicht. Vorheizen wird unabhängig vom Backtermin abgezogen. Kneten bzw.
die gesamte Vorbereitung liegt zusätzlich davor. Die 30 Sekunden Teigstufe aus der
[Thermomix-Übersicht](THERMOMIX.md) gelten je Charge; die Handarbeit dauert zusätzlich und wird
nicht automatisch geschätzt. Die bisherige Vorbereitungsdauer wird deshalb nicht verändert.

## Datenerhalt und alte Abläufe

Vorhandene Version-1-Pläne bleiben unverändert und **lesend** im Zeitstrahl erreichbar.
Die bisherige Bedeutung (Raum-Stockgare → optional kalte Stockgare → Raum-Stückgare) wird weder
umgedeutet noch gelöscht. Neue alte Abläufe können nicht mehr ausgewählt werden.

**Teichner · 48 Stunden verwenden** erstellt zunächst nur eine Vorschau mit bisherigen
Backtermin, Knetdauer und Temperaturen sowie 24/20/4 Stunden und 30 Minuten Vorheizen. Erst
Speichern ersetzt den alten Plan ausdrücklich. **Gespeicherten Plan wiederherstellen** setzt
den Entwurf zurück, solange noch nicht gespeichert wurde. Ein Speicherausfall erhält den
Entwurf und meldet keinen Erfolg.

Version 2 enthält `method: cold-staged`, `coldBulkHours`, `coldBallHours`, `acclimationHours`
sowie Backtermin, `mixMinutes`, `preheatMinutes`, `roomC`, `fridgeC`. Der Schlüssel bleibt
`forno:schedule:v1` (historischer Schlüsselname), Datenbank `ciao-pizza`, DB-Version 1 und Store
`key-value` bleiben unverändert. Keine automatische Migration, kein Schreiben beim Laden,
kein Löschen/Überschreiben fremder oder persönlicher Daten. Rechner- und P3-Daten bleiben unabhängig.
Unbekannte oder beschädigte Pläne bleiben schreibgeschützt und vollständig exportierbar;
Rechner und Datensicherung sind weiterhin erreichbar.

## Berechnung und Anzeige

Version 1 wird weiterhin unverändert mit `plannedPhases` gelesen. Version 2 unterscheidet kalte
Stockgare, kalte Stückgare und Akklimatisierung ausdrücklich. Vorschau, gespeicherter Zeitstrahl
und nächster Dashboard-Schritt verwenden dieselbe Berechnung. Der vertikale Zeitstrahl gruppiert
nach lokalem Kalendertag mit ausgeschriebenem Wochentag; Dauer, Temperatur und Endzeit stehen an
jeder Phase. Zeitstrahl-Abstände sind nicht maßstäblich.

Dauern: kalte Phasen je 0,25–72 h, Akklimatisierung 0,25–24 h, Vorbereitung 5–60 min,
Vorheizen 10–120 min. Temperaturen sind Angaben, keine automatische Reifeprognose oder Hefeanpassung.
ISO-UTC-Zeitpunkte und verstrichene Dauern bewahren echte Stunden über Zeitumstellungen.
Nicht existierende bzw. doppelte lokale Backuhrzeiten werden abgewiesen.

Das Dashboard zeigt den nächsten geplanten Zeitpunkt; gleichzeitige Schritte bleiben beide sichtbar.
Die Anzeige aktualisiert sich minütlich und beim Zurückkehren zur App. Vergangene Arbeitsschritte
werden nicht als tatsächlich ausgeführt markiert. Ungespeicherte P2-Entwürfe werden beim Verlassen
der Seite verworfen; ein PWA-Update bleibt während eines Entwurfs/Schreibvorgangs gesperrt.

## Prüfung

Gezielte Tests sichern 48 h, zusätzliche Knetzeit, dauerloses Portionieren, paralleles Vorheizen,
Temperaturen, Sommerzeit, Datenerhalt, ältere lesbare Pläne, ausdrückliche Umstellung und Speichern,
Schreibfehler und Dashboard-Schritte ab. Thermomix-Tests prüfen die 400-g-Grenze, Aufteilung,
Massenerhalt, ungültige Eingaben und unveränderte Rezepturen. `npm run check` führt Tests,
Typecheck und Produktionsbuild aus. Keine neuen Abhängigkeiten oder Deployment-Änderungen.
