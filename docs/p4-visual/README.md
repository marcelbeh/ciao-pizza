# P4 – echte Browserprüfung

Geprüft mit Chromium, Produktionsbuild unter `/ciao-pizza/`, getrennten Testprofilen und
Viewports **390 × 844** sowie **1280 × 844**, jeweils Hell/Dunkel. Keine persönlichen Browserdaten.

Das Skript [`check-p4-ui.cjs`](../../scripts/check-p4-ui.cjs) nutzt vorhandenes externes Playwright;
es entsteht keine neue Projektabhängigkeit. Beispiel bei vorhandenem Playwright/Chromium:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4175
NODE_PATH=/pfad/zu/playwright/node_modules node scripts/check-p4-ui.cjs
```

`FORNO_PREVIEW_URL`, `FORNO_BROWSER_PATH` und `FORNO_VISUAL_OUTPUT` sind optional konfigurierbar.
Die acht PNG-Dateien zeigen die laufende App, keine Entwürfe. Die Monitor-Aufnahmen zeigen bewusst
eine gemessene Temperaturabweichung, einen korrigierten Check und die geöffnete Erklärung.

| Ansicht | iPhone-Größe hell | iPhone-Größe dunkel | Desktop hell | Desktop dunkel |
| --- | --- | --- | --- | --- |
| Reifemonitor | [PNG](monitor-light-390.png) | [PNG](monitor-dark-390.png) | [PNG](monitor-light-1280.png) | [PNG](monitor-dark-1280.png) |
| TM5 im Rechner | [PNG](tm5-light-390.png) | [PNG](tm5-dark-390.png) | [PNG](tm5-light-1280.png) | [PNG](tm5-dark-1280.png) |

Automatisch geprüft (Details/Browser-Version: [`browser-report.json`](browser-report.json)):

- Acht optionale TM5-Phasen, dynamische Mengen und unveränderter Rechner.
- Monitor ausdrücklich starten; gemeinsame Teigtemperatur ohne zweite Eingabe.
- Zurück-Navigation bei ungespeicherten Änderungen mit Verwerfen-Bestätigung.
- System-/manueller Theme-Wechsel behält den Entwurf; Rechner ist während Temperatureingabe geschützt.
- Temperaturänderung speichern; Check überspringen und korrigieren.
- Offline neu laden: Monitor, Messungen und Checks bleiben erhalten.
- Bestehende P1-/P2-/P3- und unbekannte Archivdatensätze bleiben exakt unverändert.
- Keine horizontalen Überläufe und keine JavaScript-Seitenfehler in allen vier Kombinationen.

Die aufgenommenen Ansichten wurden zusätzlich auf lesbare Zahlen/Texte, Kartenbreiten,
Formularanordnung und Bottom-Navigation angesehen. Eine dabei entdeckte leere Karte wurde durch
den Backtermin der aktiven Monitor-Planung ersetzt. Die Darstellung verwendet weiterhin das
bestehende Design und Theme-System.

Grenzen: Chromium mit iPhone-ähnlichem Viewport ersetzt keinen physischen iPhone-/Safari-Test.
Keine reale Teigversuchsreihe und kein physischer TM5-Gerätetest. Die qualitative Reifeanzeige
ist eine Orientierung; gerätespezifische Rezeptintervalle bleiben ausdrücklich unbestätigt.

Abschlussprüfung: `npm run check` erfolgreich – **186 Tests in 15 Dateien**, Typecheck und
Produktionsbuild einschließlich PWA-Precache. Kein Merge und kein Deployment.
