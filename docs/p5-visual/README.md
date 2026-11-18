# P5 – echte Browserprüfung und Screenshots

Produktionsbuild mit Basis `/ciao-pizza/`, Chromium, frische Browserprofile mit lokalen
Beispieldaten. Keine persönlichen Browserdaten. Viewports **320, 375, 390, 430 und 1280 × 844**,
jeweils Hell und Dunkel. Die Browserzeit ist für vergleichbare Aufnahmen auf den 19.11.2026 gelegt.

| Ansicht | Hell (390 px) | Dunkel (390 px) |
| --- | --- | --- |
| Reifemonitor | [PNG](monitor-light-390.png) | [PNG](monitor-dark-390.png) |
| Kochmodus: Mehl und Wasser | [PNG](cook-light-390.png) | [PNG](cook-dark-390.png) |
| Optionaler Autolyse-Timer | [PNG](timer-light-390.png) | [PNG](timer-dark-390.png) |
| Backtermin gelöscht | [PNG](deleted-light-390.png) | [PNG](deleted-dark-390.png) |
| Monitor danach pausiert | [PNG](paused-light-390.png) | [PNG](paused-dark-390.png) |

Desktop-Monitor: [Hell](monitor-light-1280.png) · [Dunkel](monitor-dark-1280.png).
Monitor-Aufnahmen zeigen ganze Seiten; die feste Navigation bleibt an ihrer Position des
ursprünglichen 844-px-Viewports. Kochmodus und Lösch-/Pause-Zustände zeigen den realen Viewport.
Beim Schrittwechsel wird der Kochbereich in den sichtbaren Bereich gescrollt, ohne manuelles
Scrollen durch den darüber liegenden Rechner. Alle Aufnahmen stammen von der laufenden App.

Visuell geprüft: lesbare Ring-/Statusbeschriftung, große Mengen, erreichbare Navigation,
Timeraktionen, klare Lösch- und Pausezustände, beide Farbschemata. Die doppelte Erklärung im
pausierten Monitor wurde vor Abschluss reduziert. Keine horizontale Überbreite in den Tests.

## Automatische Browserprüfungen

[`check-p5-ui.cjs`](../../scripts/check-p5-ui.cjs) prüft in allen zehn Kombinationen:

- aktiven Monitor mit sichtbarer Einschätzung und kompaktem Phasenbereich,
- Kochmodus ausdrücklich starten, einen Schritt vor/zurück, dynamische Mengen,
- Autolyse-Timer starten, unterbrochenen Kochmodus nach Offline-Reload fortsetzen,
- keine Schreibvorgänge oder Timer-Rücksetzung durch Neuladen,
- Timer pausieren/zurücksetzen, Charge ausdrücklich wechseln,
- Löschbestätigung abbrechen (Termin bleibt), danach bestätigen (Termin entfernt),
- verständlichen Dashboard-Leerzustand und pausierten Monitor ohne Reife-Zeitbogen,
- identische P1-/P3-/P4-/Archivdatensätze nach P5-Aktionen; nur P2 entfernt und neuer Kochkey,
- keine JavaScript-Seitenfehler und keine horizontalen Überläufe.

[Maschinenlesbarer P5-Bericht](browser-report.json).

Die vorhandene P4-Browserprüfung wurde ebenfalls ausgeführt (390/1280 px, Hell/Dunkel):
gemeinsame Teigtemperatur, korrigierte/übersprungene Checks, Theme-System mit Entwurferhalt,
Zurück-/Verwerfen-Schutz, Offline-Wiederherstellung und unveränderte Bestandsdaten.
[Regressionsergebnis](regression-report.json).

`npm run check`: **211 Tests in 18 Dateien**, Typecheck und Produktionsbuild erfolgreich.
Fehler-/Konflikt-/unbekannte Datenversionen und Legacy-Pläne sind zusätzlich durch gezielte
UI-/Repositorytests abgesichert, siehe [P5-Dokumentation](../P5.md).

## Reproduktion und Grenzen

Vorhandenes externes Playwright und Chromium verwenden, keine neue Projektabhängigkeit:

```sh
npm run check
npm run preview -- --host 127.0.0.1 --port 4175
node scripts/check-p5-ui.cjs
FORNO_VISUAL_OUTPUT=/tmp/p5-regression node scripts/check-p4-ui.cjs
```

`FORNO_PREVIEW_URL` und `FORNO_VISUAL_OUTPUT` sind optional konfigurierbar.

Kein physischer iPhone-/Safari-Test. Das Playwright-WebKit-Binary ist in dieser Umgebung nicht
vorhanden; es wurde kein zusätzlicher Browser installiert. Der lokale Server/Chromium konnte
mit den vorhandenen Umgebungsberechtigungen genutzt werden; keine verbleibende Browserblockade.
Kein physischer TM5-Test, keine reale Teigversuchsreihe. Der Timer ist kein Hintergrundwecker.
Kein Merge und kein Deployment.
