# P6 – Screenshots und Prüfung

Echte Aufnahmen des Produktionsbuilds in Chromium, isolierte Profile, feste lokale Beispieldaten.
Keine persönlichen Browserdaten. Monitoraufnahmen zeigen ganze Seiten; bei Kochansichten den
844-px-Viewport nach automatischem Scrollen zum Schritt. Die feste Navigation bleibt an ihrer
ursprünglichen Viewportposition und kann daher in einer Ganzseitenaufnahme mittig erscheinen.

| Ansicht | Hell (390 px) | Dunkel (390 px) |
| --- | --- | --- |
| Reifemonitor / Entwicklung | [PNG](monitor-light-390.png) | [PNG](monitor-dark-390.png) |
| Voraussichtlich backbereit | [PNG](monitor-ready-light-390.png) | [PNG](monitor-ready-dark-390.png) |
| Möglicherweise überreif | [PNG](monitor-caution-light-390.png) | [PNG](monitor-caution-dark-390.png) |
| Leerer Monitor | [PNG](monitor-empty-light-390.png) | [PNG](monitor-empty-dark-390.png) |
| Gerätefunktionen | [PNG](cook-device-light-390.png) | [PNG](cook-device-dark-390.png) |
| Kochschritt mit Mengen | [PNG](cook-light-390.png) | [PNG](cook-dark-390.png) |
| Autolyse-Timer | [PNG](timer-light-390.png) | [PNG](timer-dark-390.png) |
| Termin gelöscht | [PNG](deleted-light-390.png) | [PNG](deleted-dark-390.png) |
| Monitor pausiert | [PNG](paused-light-390.png) | [PNG](paused-dark-390.png) |

Desktop-Monitor: [Hell](monitor-light-1280.png) · [Dunkel](monitor-dark-1280.png).

Die Aufnahmen wurden auf Typografie, Plan-/Beobachtungstrennung, Mengeneinheiten, Statusfarben,
Hauptaktionen und Navigation angesehen. Zwei sichtbare Probleme wurden korrigiert: zu hohe
Monitor-Hauptkarte und umgebrochene Gramm-Einheiten. Beobachtungen sind jetzt aufklappbar;
bei 375/390/430 px liegt die primäre Check-Aktion im ersten Viewport oberhalb des Docks.

## Automatisch geprüft

[`check-p6-ui.cjs`](../../scripts/check-p6-ui.cjs), **320, 375, 390, 430, 1280 × 844**, Hell/Dunkel:

- Hauptkarte, eindeutiger Zeitbogen und unmittelbarer Check-Einstieg; Abbrechen ohne Schreiben.
- Visuelle Zustände backbereit/überreif anhand der bestehenden Modellregeln (390 px).
- Kochmodus vor/zurück, Mengen, Timer Start/Pause/Reset, Charge wechseln.
- Offline-Reload/Fortsetzen ohne Timer- oder Datenrücksetzung.
- Löschbestätigung abbrechen und bestätigen; leerer Dashboard-Termin, pausierter Monitor.
- Weitere Ansichten Rezepte, Pizzaabend, Einstellungen und Journal-Platzhalter.
- Keine horizontalen Überläufe oder Seitenfehler.
- P1/P3/P4/Archive unverändert; nur der im Test explizit gelöschte P2-Plan und Kochfortschritt
  werden verändert. Zustands-Screenshots verwenden vorbereitete lokale Fixtures, die vor
  dieser Bestandsprüfung wiederhergestellt werden.

[Browserbericht](browser-report.json) · [P4-Browserregression](regression-report.json).
P4-Regression: Temperaturübergabe, korrigierte/übersprungene Checks, manuelle/System-Themes,
Entwurfs-/Zurück-Schutz und Offline-Wiederherstellung, jeweils Hell/Dunkel und 390/1280 px.

**216 Tests / 19 Dateien**, Typecheck und Produktionsbuild mit `npm run check` erfolgreich.

```sh
npm run check
npm run preview -- --host 127.0.0.1 --port 4175
node scripts/check-p6-ui.cjs
FORNO_VISUAL_OUTPUT=/tmp/p6-regression node scripts/check-p4-ui.cjs
```

Vorhandenes externes Playwright/Chromium wird genutzt; keine neue Projektabhängigkeit.
`FORNO_PREVIEW_URL`, `FORNO_VISUAL_OUTPUT` und optional `FORNO_P6_WIDTHS` sind konfigurierbar.
Kein physischer iPhone-/Safari-Test, keine reale TM5-/Teigversuchsreihe. Native iOS-Dialoge und
Gerätehintergrundverhalten sind durch diese Chromium-Prüfung nicht vollständig abgedeckt.
