# Ciao! 2.0

Pizza-Pilot, professionelles Teigstudio, Rezeptbibliothek, Pizzaabend-Planer und Einkaufsliste, interaktiver Backcoach, Teig-Doc und Pizza-Tagebuch im Ciao!-Classico-Design. React, TypeScript, Vite, Tailwind CSS, React Router und installierbare PWA. Keine Dateien aus `PizzaDoughCalculator` übernommen.

## Entwickeln und prüfen

Node.js ab 22.12 (empfohlen Node 24 LTS), npm. Für die Kernfunktionen sind **keine Zugangsdaten** nötig.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
npm run check
```

Entwicklung: `http://localhost:5173/ciao-pizza/`, Produktionsvorschau: `http://localhost:4173/ciao-pizza/`. `npm run test:watch` für gezielte Tests. Service Worker nur im Produktionsbuild.

## Aktueller Stand

- **Pizza-Pilot und Teigstudio:** vollständige Teigplanung, Massenbilanz, Profile, Temperaturen und geschätzte Garzeiten. [Fachannahmen](docs/P1-DOUGH.md).
- **Pizzaabend:** Termin, Gäste, Reserve, Sortenverteilung, gespeicherte Rezeptkopien und Teigbedarf; Übergabe an den bestehenden Pizza-Piloten.
- **Rezeptbibliothek:** fünf geschützte Originalrezepte; eigene Rezepte erstellen, bearbeiten, duplizieren, löschen; Stil-/Belagfilter und Mengenskalierung.
- **Einkaufsliste:** Teig und Beläge zusammenrechnen, kompatible Einheiten vereinheitlichen, Vorräte abziehen, eigene Artikel bearbeiten und abhaken. Neuberechnung erhält bewusste manuelle Änderungen.
- **Backcoach:** geführter Backlauf mit Geräte-/Stilrichtwerten, Zeitstempel-Timern, Drehhinweisen, manuell bestätigtem Fortschritt je Pizza und optionalem Vollbild.
- **Teig-Doc:** lokale, nachvollziehbare Diagnoseregeln mit Plan- und Messwerten, Sofortmaßnahmen und gespeichertem Verlauf. Keine KI-API.
- **Pizza-Tagebuch:** Rezeptkopien, echte Messwerte, Bewertungen, Notizen und begrenzte lokale Fotos; Vergleich, wiederkehrende markierte Probleme und Speichern gelungener Rezepturen.
- **Local First:** IndexedDB ist die dauerhafte Datenquelle. Alle Kernfunktionen ohne Anmeldung, auch offline nach erstem vollständigem Laden der PWA. Gemeinsame Sicherung und ergänzender Import ohne Überschreiben.
- **Supabase:** SDK, Migrationen, RLS und bisherige Auth-/Sync-Implementierung bleiben vorbereitet. Kein Account-Gate, keine anonymen Konten, keine laufende Synchronisierung und kein SMTP nötig. Eine spätere Synchronisierung muss das gesamte lokale V2-Dokument unterstützen, bevor sie aktiviert wird.
- **Weitere Module:** Reife-Monitor und Academy bleiben Platzhalter. Ein eigenständiges P2 war im Ausgangsstand nicht vorhanden. Lokaler Datenplatz für spätere Reifeprozesse ist vorbereitet.

[P3-Bedienung, Datenmodell und Grenzen](docs/P3-LOCAL-FIRST.md) · [P4-Bedienung, Richtwerte, Fotos und Prüfungen](docs/P4-BAKING.md). Die älteren Cloud-/Livegang-Dokumente beschreiben die vorbereitete optionale Cloud-Implementierung, nicht den aktiven Produktmodus.

## Architektur

```text
src/app/                  App-Shell, LocalWorkspace, bestehender DoughProvider
src/components/           Classico-UI und geteilte Eingabefelder
src/core/dough/           Bestehende reine Teigberechnung
src/core/planning/        Rezepte, Abendplanung, Einkauf und Validierung
src/core/baking/          Backcoach, Diagnoseregeln, Tagebuch und Auswertung
src/core/cloud/           Vorbereitete Cloud-Verträge
src/core/storage/         Speichervertrag
src/infrastructure/storage/  Native IndexedDB, atomarer LocalRepository
src/infrastructure/supabase/ Vorbereiteter optionaler Cloud-Zugriff
src/infrastructure/pwa/   Installation, bestätigte Updates
src/modules/              Elf eigenständige Route-Einstiege
supabase/                 Versionierte Migrationen und RLS-Tests
```

Der lokale Workspace `ciao-workspace:v2` hält Teigpläne, Profile, eigene Rezepte, Pizzaabende, Einkaufslisten, Einstellungen und spätere Reifeprozesse zusammen. P4 ergänzt rückwärtskompatibel den optionalen Bereich `baking` (Version 1) mit Backläufen, Diagnosen und Tagebuch einschließlich Fotos. Änderungen erfolgen in atomaren IndexedDB-Transaktionen; unabhängige Module überschreiben einander nicht. P1-Altbestände werden einmalig kopiert, Originaldaten bleiben erhalten. Ungültige Daten werden mit sichtbarem Fehler abgewiesen.

## Offline, Sicherung und Veröffentlichung

Browserdaten können vom Benutzer oder Betriebssystem gelöscht werden. Regelmäßig „Sicherung herunterladen“ verwenden. „Sicherung hinzufügen“ importiert Kopien; der aktive Teigplan bleibt unverändert. Daten sind an Browser, Gerät und Origin gebunden. Keine automatische Geräte-Synchronisierung.

GitHub Pages verwendet `/ciao-pizza/`, Hash-Routing und einen Service Worker mit allen gebauten App-Modulen. Offline-Nutzung setzt einen erfolgreichen ersten Online-Besuch und die Aktivierung des Service Workers voraus. Updates werden angekündigt. Private API-Antworten werden nicht gecacht.

Der manuelle Workflow `.github/workflows/pages.yml` veröffentlicht ausschließlich `main` nach Eingabe `FREIGEGEBEN`. Build und Tests laufen erneut vor dem Deployment. Push/Merge allein veröffentlicht nichts. P4 wird ausschließlich als Pull Request vorbereitet; Merge und Veröffentlichung benötigen die ausdrückliche Freigabe.

Für spätere Cloud-Arbeiten ausschließlich öffentliche `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` verwenden. Keine Passwörter, Secret-/Service-Role-Keys oder SMTP-Zugangsdaten ins Frontend oder Repository. `.env.local` ist ignoriert. Cloud-Prüfung optional: `npm run verify:cloud` mit konfigurierten öffentlichen Werten.
