# Ciao! 2.0

Dein persönlicher Pizza-Assistent. **P0: technisches Fundament**, vollständig neu erstellt.
Es wurden keine Dateien oder Komponenten aus `PizzaDoughCalculator` übernommen.

## Lokal entwickeln

Voraussetzung: Node.js ab 22.12 (empfohlen: Node 24 LTS) und npm.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
# Tests, TypeScript und Produktionsbuild zusammen:
npm run check
```

Entwicklungsserver: `http://localhost:5173/ciao-pizza/`.
Produktionsvorschau: `http://localhost:4173/ciao-pizza/`.
`npm run test:watch` startet den Test-Watch-Modus.
Der Service Worker wird nur im Produktionsbuild aktiviert.

## Stack und Struktur

React, striktes TypeScript, Vite, Tailwind CSS, React Router, native IndexedDB,
Vite PWA/Workbox und Vitest. Keine UI-Bibliothek, kein globaler State-Container und
noch kein Backend-SDK. Versionen sind exakt festgelegt; `package-lock.json` ist verbindlich.

```text
src/
  app/                 App-Shell, Navigation, Routing, Fehlergrenze
  components/          Fachunabhängige UI-Bausteine
  modules/             Eigenständige, lazy geladene Modul-Einstiege
    registry.ts        Modulmetadaten und Navigationsziele
    dashboard/         Startansicht
    <modul>/Page.tsx   Je ein klar gekennzeichneter Platzhalter
  core/storage/        UI-unabhängiger Speichervertrag
  infrastructure/
    storage/           IndexedDB-Adapter, Schema Version 1
    pwa/               Installation, Updates, Fehlerhinweise
    supabase/          Dokumentierter Erweiterungspunkt
  test/                Gemeinsame Testumgebung
  styles.css           Design-Tokens und responsives Designsystem
public/                Eigene Icons, Apple-Touch- und Maskable-Icons
docs/                  Architektur und technischer Prüfbericht
```

Alle elf Bereiche sind erreichbar: Dashboard, Pizza-Pilot, Teigstudio,
Reife-Monitor, Rezeptbibliothek, Pizzaabend-Planer, Einkaufsliste, Backcoach,
Pizza-Tagebuch, Teig-Doc und Pizza-Academy. Fachliche Funktionen, Demodaten,
Berechnungen oder simulierte KI-Antworten sind bewusst nicht enthalten.

## Designsystem · Modern Italian Premium – Classico

| Token | Farbe | Rolle |
| --- | --- | --- |
| Basilikum | `#1B5E20` | Marke, Navigation, primäre Aktionen |
| Pomodoro | `#D32F2F` | Warme Akzente |
| Creme | `#F9F5EA` | Seitenhintergrund |
| Gold | `#D4A038` | Details und Fokusakzente |
| Dunkelgrau | `#1F1F1F` | Haupttext |

Lokale Systemschrift-Kombination aus eleganter Serifenschrift und ruhiger Sans-Serif:
keine externen Font-Requests oder Lizenzabhängigkeiten. SVG-Illustration und Icons
sind eigens erstellt. Karten, Buttons, Badges und Abstände werden gemeinsam verwendet.
Mobile First mit Bottom-Navigation, vollständigem Modulmenü, Safe-Area-Abständen,
sichtbarem Tastaturfokus und Unterstützung für reduzierte Bewegung.

## GitHub Pages und PWA

Der Vite-Basispfad ist fest `/ciao-pizza/`. Hash-Routing erzeugt zum Beispiel
`/ciao-pizza/#/teigstudio`; ein Reload braucht so keine serverseitige SPA-Umleitung.
Manifest, Icons, Service-Worker-Scope und Start-URL passen zum Basispfad.
Der Produktionsbuild liegt in `dist/` und kann später auf GitHub Pages bereitgestellt werden.
Es gibt **keinen automatischen Deployment-Workflow** und keine Veröffentlichung in P0.

Nach einem erfolgreichen Online-Erstbesuch wird die App-Shell inklusive aller
Modul-Chunks offline zwischengespeichert. Updates werden zur Bestätigung angeboten.
Installation benötigt HTTPS (oder localhost) und Browser-Unterstützung.
Auf dem iPhone in Safari: **Teilen → Zum Home-Bildschirm**.
Der Installationshinweis erklärt diesen Weg, wenn kein Install-Prompt verfügbar ist.

## Lokale Daten und spätere Cloud

`createIndexedDbStore()` liefert einen asynchronen, testbaren Speicheradapter.
Er öffnet die Datenbank erst bei Benutzung, bestätigt Schreibvorgänge erst nach
Transaktionsabschluss und meldet Fehler. P0 speichert keine fachlichen Datensätze.
Browser können lokale Daten löschen; IndexedDB ist kein Backup. Ein Export- und
Migrationskonzept gehört in die spätere fachliche Umsetzung.

Supabase ist nur vorbereitet: siehe [Integrationsgrenze](src/infrastructure/supabase/README.md).
`.env.example` enthält ausschließlich leere optionale Variablen. Lokale `.env`-Dateien
sind ignoriert. `VITE_*` ist immer öffentlich; niemals geheime Schlüssel eintragen.

## Qualität und Status

Siehe [technischen Prüfbericht](docs/P0-VERIFICATION.md) für ausgeführte Prüfungen,
verbleibende Einschränkungen und den Abhängigkeitsaudit.
CI führt ausschließlich Installation, Tests und Build aus; Merge und Deployment
bleiben manuelle Entscheidungen nach Freigabe.
