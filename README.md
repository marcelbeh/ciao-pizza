> **Aktueller Livegang:** Ohne Mail-Anmeldung im lokalen Modus. Pizza-Pilot, Teigstudio und Profile funktionieren auf dem jeweiligen Gerät. Konten und Cloud-Synchronisierung sind vorbereitet und vorerst deaktiviert. [Details](docs/LOCAL-LAUNCH.md).

# Ciao! 2.0

Ein intelligenter Pizza-Assistent im Classico-Design. React, TypeScript, Vite,
Tailwind CSS, React Router und PWA. Pizza-Pilot und Teigstudio sind funktionsfähig;
die übrigen neun Bereiche behalten ihre Navigation und Platzhalter.
Keine Dateien aus `PizzaDoughCalculator` übernommen.

## Entwickeln und prüfen

Node.js ab 22.12 (empfohlen: Node 24 LTS), npm.

```sh
npm ci
# .env.example nach .env.local kopieren und die zwei öffentlichen Werte setzen
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
npm run check
# Mit gesetzten öffentlichen Umgebungsvariablen: reale Verbindung/Anonymzugriff prüfen
npm run verify:cloud
# Alternativ lokal mit der ignorierten Konfigurationsdatei:
node --env-file=.env.local scripts/check-supabase.mjs
```

Entwicklung: `http://localhost:5173/ciao-pizza/`, Produktionsvorschau:
`http://localhost:4173/ciao-pizza/`. `npm run test:watch` startet gezielte Tests im
Watch-Modus. Service Worker nur im Produktionsbuild.

## Aktueller Stand

- **Pizza-Pilot:** sechs Schritte von Stil und Gerät über Mengen und Termin bis
  zur Teigführung und vollständigen Rezeptübersicht; Übergabe an das Teigstudio.
- **Teigstudio:** Zutaten aus vollständiger Massenbilanz, Teiglings-/Mehlmodus,
  editierbare Bäckerprozente, Frisch-/Instanthefe, Temperaturen und Gar-/Ofenzeiten.
- **Eigene Profile:** speichern, laden, bearbeiten/umbenennen und löschen.
- **Supabase:** private Anmeldung per E-Mail-Code, zentrale dauerhafte Speicherung,
  kontogetrennter IndexedDB-Cache, sicherer Erstimport, Versionskonflikte,
  Originalarchive und portable JSON-Sicherungen.
- **Rezeptbibliothek und Einstellungen:** noch keine eigenen Fachoberflächen.
  Die Cloud-Datenstruktur bewahrt Rezeptdatensätze und Einstellungen bereits bei
  Teigänderungen mit. Keine zusätzliche Neuentwicklung dieser Module.
- **GitHub Pages:** `/ciao-pizza/` und Hash-Routing bleiben erhalten. Ein manueller,
  explizit freizugebender Actions-Workflow ist vorbereitet, noch nicht ausgeführt.

[Fachannahmen und P1-Bedienung](docs/P1-DOUGH.md) ·
[Einrichtung und Livegang für den Betreiber](docs/LIVEGANG.md) ·
[aktueller Prüfbericht](docs/CLOUD-VERIFICATION.md)

## Architektur

```text
src/
  app/                  App-Shell, Auth-Gate, gemeinsamer Teigplan
  components/           Geteilte Classico-UI und Rezepteditor
  core/dough/           Reine Berechnung und Validierung
  core/cloud/           Versioniertes Datenformat, sichere Zusammenführung
  core/storage/         Bestehender Speichervertrag
  infrastructure/
    storage/            IndexedDB-Adapter und bisheriges P1-Importformat
    supabase/           SDK, Remote-Zugriff, Synchronisierung und Offline-Cache
    pwa/                Installation und bestätigte Updates
  modules/              Elf eigenständige Route-Einstiege
supabase/
  migrations/           Versionierte, bereits angewendete Datenbankmigration
  tests/                Reproduzierbarer RLS-Test mit Rollback
scripts/                Release-Konfiguration und reale Verbindungsprüfung
```

Der Teigrechner bleibt unabhängig von React und Supabase. Bestehende P1-Daten
werden als atomarer, versionierter Workspace gespeichert. So können aktiver Plan,
Profile, Rezepte und Einstellungen nicht durch einen Teilfehler auseinanderlaufen.
RLS isoliert jede Zeile nach Benutzer-ID. Der transaktionale Commit verwendet
`SECURITY INVOKER`, Versionsprüfung und idempotente Mutations-IDs.

## Daten, Offline und Sicherheit

Für Anmeldung und ersten Datenabruf ist Internet erforderlich. Bei bestehender
Sitzung bleibt ein geladener Konto-Cache offline bearbeitbar; neue Änderungen
werden nach Verbindungsrückkehr synchronisiert. Pro Konto ist in einem Browser
nur ein bearbeitender Tab erlaubt. Andere Geräte werden durch die Cloud-Version
abgesichert. Bei Konflikten bleiben beide Stände erhalten, bis sie ausdrücklich
zusammengeführt werden. Alle Originale werden dabei privat archiviert.

Lokale P1-Daten werden nach Anmeldung über „Lokale Daten in dieses Konto
übernehmen“ importiert. Das lokale Original wird nicht gelöscht. Daten auf einer
anderen Browser-Origin müssen zunächst dort importiert/synchronisiert oder als
JSON-Sicherung übertragen werden. Siehe die konkrete Anleitung in LIVEGANG.md.

`VITE_*`-Werte sind immer öffentlich. Nur die Projekt-URL und einen
`sb_publishable_…`-Key verwenden. Keine Datenbankpasswörter, Secret-/Service-Role-Keys
oder SMTP-Zugangsdaten ins Frontend/Repository eintragen. `.env.local` ist ignoriert.
Auth- und Daten-API-Antworten werden nicht durch den Service Worker gecacht.
Browserdaten sind kein Backup; wichtige Stände über „Sicherung herunterladen“ sichern.

## Designsystem

Classico bleibt unverändert: Basilikumgrün `#1B5E20`, Pomodororot `#D32F2F`,
Creme `#F9F5EA`, Gold `#D4A038` und Dunkelgrau `#1F1F1F`. Systemschriften,
mobile Navigation mit Safe Areas, eigene SVGs, native Formularfelder und reduzierte
Bewegung. Anmeldung und Sync-Hinweise ergänzen diese Gestaltung.

**Kein automatischer Livegang durch Push oder Merge.** Deployment ausschließlich
nach ausdrücklicher Freigabe über den manuellen Workflow auf `main`.
