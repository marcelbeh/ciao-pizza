# Reifemonitor – visuelle Überarbeitung

Reine UI-Änderung auf Basis des vorhandenen FORNO.-Designs. Prognosemodell, Rezeptberechnung,
Zeitplanung und Datenspeicherung bleiben unverändert.

- Klare Reifekarte mit aktueller geplanter Phase, Sicherheit, Backtermin und Handlungshinweisen.
- Gründe bleiben über „Warum diese Einschätzung?“ zugänglich; keine technische Modellnummer im Haupttext.
- Kompakter Gärverlauf statt langer Phasenlisten. Markierung bedeutet „läuft laut Plan“, keine gemessene Reife.
- Drei Temperaturwerte mit klarer Unterscheidung zwischen Basis, Plan und späterem Messverlauf.
- Nummerierte freiwillige Checks; Bearbeitung direkt beim jeweiligen Check statt am Seitenende.
- Temperaturänderungen direkt in der Temperaturkarte bearbeiten, Verlauf aufklappbar.
- Desktop: Checks und Temperaturen nebeneinander; mobil: einspaltig, Touchflächen mindestens 44 px.

## Echte Aufnahmen

Gleiche isolierte Testdaten und Browserzeit (12.11.2026, 18 Uhr UTC), keine persönlichen Browserdaten.
Vorher-Aufnahmen stammen vom zuvor veröffentlichten P4-Stand; Nachher vom lokalen Produktionsbuild.
390 × 844 und 1280 × 844, Chromium. Die Dateien zeigen vollständige Seiten; die Bottom-Navigation
bleibt dabei an ihrer Position im ursprünglichen Viewport. Betriebssystem/Safari nicht simuliert.

| Ansicht | Hell | Dunkel |
| --- | --- | --- |
| Vorher, iPhone-Größe | [PNG](before-light-390.png) | [PNG](before-dark-390.png) |
| Nachher, iPhone-Größe | [PNG](after-light-390.png) | [PNG](after-dark-390.png) |
| Nachher, Desktop | [PNG](after-light-1280.png) | [PNG](after-dark-1280.png) |

Screenshots wurden auf Typografie, Kartenhierarchie, Messwerte, Abstände und Navigation angesehen.
Keine horizontalen Überläufe in allen vier Nachher-Aufnahmen.

## Prüfung

- `npm run check`: **186 Tests / 15 Dateien**, Typecheck und Produktionsbuild erfolgreich.
- Bestehende P4-Browserprüfung: vier Kombinationen (390/1280 px, Hell/Dunkel) erfolgreich.
- Gemeinsame TM5-Temperatur, gespeicherte/übersprungene Checks, Korrekturen, Theme-Wechsel,
  Entwurfs- und Zurück-Schutz, Offline-Neuladen sowie unveränderte P1/P2/P3/Archivdaten geprüft.
- Keine JavaScript-Seitenfehler oder horizontalen Überläufe.
- [Maschinenlesbarer Browserbericht](browser-report.json).

Reproduktion bei vorhandenem Playwright/Chromium (keine neue Projektabhängigkeit):

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4175
node scripts/capture-maturity-ui.cjs
FORNO_VISUAL_OUTPUT=/tmp/forno-monitor-regression node scripts/check-p4-ui.cjs
```

Die Aufnahme verwendet eine feste Testzeit und lokale Beispieldaten in frischen Browserprofilen.
Das optionale `CAPTURE_BEFORE=1` besucht den Live-Stand und ist nur vor Veröffentlichung dieser
Überarbeitung für einen Vorher-Vergleich sinnvoll. Ausgabe über `FORNO_VISUAL_OUTPUT` umleitbar.

Umgebung: Der erste Serverstart innerhalb der Sandbox scheiterte mit EPERM. Der genehmigte
Start außerhalb der Sandbox funktionierte; Browserprüfungen konnten vollständig durchgeführt werden.
Kein physischer iPhone-/Safari-Test. Kein Merge und kein Deployment im Rahmen dieses UI-PRs.
