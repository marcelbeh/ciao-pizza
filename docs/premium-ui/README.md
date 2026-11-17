# FORNO. – Premium UI/UX

Die bestehende FORNO.-Identität bleibt erhalten: lokale Ofen-Wortmarke, cremefarbene Flächen,
Olivgrün und Terrakotta, Inter und gleichwertige helle/dunkle Ansichten. Gemeinsame Design-Tokens
in `src/styles.css` bestimmen Karten, 24-px-Radien, 14-px-Bedienelemente, Abstände, Konturen,
Textfarben, Fokus und Schatten. Kein zusätzliches UI-Paket, kein externes Bild/Font zur Laufzeit.

## Sichtbare Änderungen

- **Dashboard:** Backtermin und nächster geplanter Schritt zuerst; aktiver Teig als eigene
  Statuskarte mit kleinem Zeitbogen, darunter Rezeptur, Zeitplan/Pizzaabend und Schnellzugriffe.
- **Monitor:** Zeitbogen, getrennte qualitative Reifeeinschätzung, freiwilliger nächster Check,
  Backtermin, Handlungshinweise und aufklappbare Begründung. Gesamter Prozess von Vorbereitung
  über Stock-/Stückgare und Akklimatisierung bis zum Backtermin als Timeline.
- **Teig-Checks:** große native Radio-Auswahlflächen statt kleiner Select-Menüs, inklusive
  Tastaturbedienung und sichtbarem Fokus. Volumen, Oberfläche (inklusive Blasen/Spannung) und
  Elastizität behalten exakt ihre bisherigen gespeicherten Werte.
- **Rechner:** klare Trennung von Einstellen und Abwiegen; größere Zutatenwerte, gemeinsame
  Eingabestile. TM5-Karte mit acht nummerierten Phasenkarten, auf Desktop zweispaltig.
- **Rezepte/Pizzaabend:** Rezeptkarten mit Zutatenvorschau, Zutaten als Chips, klare Mengen und
  konsistente Aktionen. Rezeptdetails erscheinen mobil vor der Liste; Fokus/Scroll führen bei
  Auswahl direkt dorthin. „Zur Rezeptübersicht“ führt zurück, ohne Daten zu ändern.
- **Zeitplan, Einstellungen, Sicherung, Journal-Platzhalter, Fehler und Formulare:** dieselben
  Flächen, Typografie und Bedienelemente. Schwebende Navigation mit sicheren iPhone-Abständen.
- Subtile 160–200-ms-Übergänge; `prefers-reduced-motion` wird beachtet.

## Fachliche Grenzen und Datenerhalt

**Der Ring zeigt ausschließlich verstrichene Planzeit innerhalb einer Phase.** Die Restzeit
bezieht sich auf das geplante Phasenende, nicht auf biologische Backbereitschaft. Es gibt keine
Reife-Prozentzahl. „Zeit abgelaufen“ bzw. „Läuft laut Plan“ bestätigt keine tatsächlich erledigte
Arbeit. Nach dem Backtermin steht „Termin erreicht“, kein automatisch behauptetes optimales Fenster.
Die qualitative Prognose verwendet weiterhin unverändert Modell 1 und seine vier Reifezustände.

Geruch wird als zusätzliche Prüfhilfe erwähnt, **nicht als neuer gespeicherter Messwert** angeboten.
Dafür wäre eine bewusste Erweiterung des bisherigen Beobachtungsmodells erforderlich. Oberflächen-
und Elastizitätsangaben decken bereits Blasen/Spannung ab; keine neuen Scheinfelder oder Analyse.

Keine Änderung unter `src/core` oder an Repositories, Datenbank, Versionen, Schlüsseln, Rezepten,
Gärdauern oder Mengenberechnung. `phasePresentation` in der UI berechnet nur verstrichene Anzeigezeit
anhand der bestehenden `calculateSchedule`-Ergebnisse. Keine automatisch veränderten Termine,
Hefemengen oder Wasser-/Knetvorgaben. Offline-PWA, lokale Bilder und GitHub-Pages-Basis bleiben erhalten.
Ein veralteter unbestätigter 30-Sekunden-Gerätehinweis wurde aus dem Zeitplan-Hilfetext entfernt.

## Echte Screenshots

Produktionsbuild, Chromium mit isolierten Testprofilen. Gleicher Musterplan, feste Browserzeit
19.11.2026, 18 Uhr UTC. Der Beispielteig befindet sich in der Akklimatisierung; der Zeitbogen ist
halb durchlaufen, während die qualitative Reife noch „Reife entwickelt sich“ lautet.
Das ist bewusst keine Gleichsetzung der beiden Anzeigen.

| Ansicht | iPhone hell | iPhone dunkel | Desktop hell | Desktop dunkel |
| --- | --- | --- | --- | --- |
| Reifemonitor | [PNG](monitor-light-390.png) | [PNG](monitor-dark-390.png) | [PNG](monitor-light-1280.png) | [PNG](monitor-dark-1280.png) |
| Dashboard | [PNG](dashboard-light-390.png) | [PNG](dashboard-dark-390.png) | [PNG](dashboard-light-1280.png) | [PNG](dashboard-dark-1280.png) |
| Rechner/TM5 | [PNG](calculator-light-390.png) | [PNG](calculator-dark-390.png) | [PNG](calculator-light-1280.png) | [PNG](calculator-dark-1280.png) |
| Rezepte | [PNG](recipes-light-390.png) | [PNG](recipes-dark-390.png) | [PNG](recipes-light-1280.png) | [PNG](recipes-dark-1280.png) |
| Teig-Check | [PNG](check-light-390.png) | [PNG](check-dark-390.png) | [PNG](check-light-1280.png) | [PNG](check-dark-1280.png) |
| Zeitplan | [PNG](schedule-light-390.png) | [PNG](schedule-dark-390.png) | [PNG](schedule-light-1280.png) | [PNG](schedule-dark-1280.png) |
| Pizzaabend | [PNG](evening-light-390.png) | [PNG](evening-dark-390.png) | [PNG](evening-light-1280.png) | [PNG](evening-dark-1280.png) |
| Einstellungen | [PNG](settings-light-390.png) | [PNG](settings-dark-390.png) | [PNG](settings-light-1280.png) | [PNG](settings-dark-1280.png) |

Vollständige Seitenaufnahmen; die feste Navigation bleibt an der Position des ursprünglichen
844-px-Viewports sichtbar. Die Aufnahmen wurden auf Hierarchie, Schriftgrößen, Proportionen,
Konturen, Formularflächen, Timeline und Navigation angesehen. Physische iPhone-/Safari-Abnahme
und reale Teigtests sind nicht durch diese Chromium-Prüfung ersetzt.

## Prüfungen und Reproduktion

- `npm run check`: **190 Tests in 16 Dateien**, Typecheck und Produktionsbuild erfolgreich.
- Vier neue UI-Tests: Phasenwechsel/Reset, Vorbereitung, Terminüberschreitung ohne erfundene
  Backreife und unveränderte Legacy-Pläne. Bestehende Tests bleiben erhalten; Check-Interaktion
  wurde von Selects auf Radio-Auswahl angepasst.
- Alle vorhandenen Ansichten bei **320, 390 und 1280 × 844**, jeweils Hell/Dunkel. Check-Auswahl
  und Abbrechen, kein horizontaler Überlauf, keine Seitenfehler, keinerlei Datenänderung durch
  Besuche/Abbrechen. [Ansichts-/Kontrastbericht](visual-report.json).
- Zentrale Textpaare erreichen mindestens 4,5:1, Formularkontur mindestens 3:1, jeweils anhand
  der finalen berechneten CSS-Tokens geprüft. Das ist keine vollständige WCAG-Zertifizierung.
- Bestehende P4-Browserprüfung: gemeinsame TM5-Temperatur, gespeicherte/übersprungene Checks,
  Korrekturen, Hell/Dunkel/System mit Entwurferhalt, Navigation/Zurück-Schutz und Offline-Neuladen.
  P1/P2/P3 und Archive nach Speichern unverändert. [Bericht](regression-report.json).
- Keine Abhängigkeiten ergänzt. Die neue UI erhöht die komprimierte JavaScript-Datei gegenüber
  dem vorherigen Stand um ungefähr 1,6 kB; CSS liegt komprimiert bei ungefähr 9,3 kB.

Bei bereits vorhandenem Playwright/Chromium (keine Projektabhängigkeit):

```sh
npm run check
npm run preview -- --host 127.0.0.1 --port 4175
node scripts/capture-premium-ui.cjs
FORNO_VISUAL_OUTPUT=/tmp/forno-premium-regression node scripts/check-p4-ui.cjs
```

Die Ausgangs-URL lässt sich über `FORNO_PREVIEW_URL`, die Ausgabe über `FORNO_VISUAL_OUTPUT`
ändern. Tests nutzen ausschließlich frische Browserprofile mit lokalem Beispieldatensatz.
