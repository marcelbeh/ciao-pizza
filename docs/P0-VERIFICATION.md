# P0 · Technischer Prüfbericht

Stand: 3. November 2026. Branch: `feat/ciao-2-p0-foundation`.

## Bewertung

**Das Grundgerüst ist technisch funktionsfähig.** Navigation, Modulgrenzen,
Produktionsbuild und lokale Speicherinfrastruktur stehen. Das ist eine belastbare
Basis für die nächste Entwicklungsphase, noch keine fachlich fertige oder zur
kommerziellen Veröffentlichung abgenommene App.

## Ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| TypeScript `tsc --noEmit` | Erfolgreich, strikter Modus |
| Vitest | 15 Tests bestanden |
| Vite-Produktionsbuild | Erfolgreich |
| PWA-Generierung | Manifest, Service Worker, 27 Precache-Einträge erzeugt |
| Basispfad | HTML, Assets und Manifest unter `/ciao-pizza/` |
| Browser Desktop | 1440 × 1000, Sidebar, Dashboard und Modulansicht kontrolliert |
| Browser mobil | 390 × 844, Bottom-Navigation und vollständiges Modulmenü kontrolliert |
| Direkter Modul-Link | Teigstudio über Hash-URL geladen und neu geladen |
| Offline | Preview-Server gestoppt, Teigstudio neu geladen und Backcoach geöffnet: erfolgreich |
| Produktionsabhängigkeiten | `npm audit --omit=dev`: keine Befunde |

Die 15 Tests prüfen alle zehn Modul-Direktrouten, Navigation, 404-Rückweg,
mobiles Menü sowie IndexedDB: fehlender Schlüssel, strukturierte Werte,
Persistenz über Adapterinstanzen, Überschreiben, Löschen, Fehler bei fehlender
IndexedDB und Wiederholbarkeit nach Behebung des Fehlers.

Lokale Prüfung mit Node 24.22.1. Das Arbeitsverzeichnis war zunächst leer und
System-Git mangels Xcode-Werkzeugen nicht verfügbar. Deshalb wurden Branch,
Commit und PR über den GitHub-Connector erstellt; keine alten Projektdateien
wurden gelesen oder kopiert. Für npm wurde eine vorhandene Node-Laufzeit mit
einem isolierten Cache im Arbeitsbereich verwendet.

## Verbleibende Probleme und Grenzen

- **Abhängigkeitsaudit:** `npm audit` meldet 10 Befunde (2 niedrig, 8 moderat,
  keine hohen/kritischen). Sie betreffen transitive Build-Abhängigkeiten von
  `vite-plugin-pwa`/`workbox-build`, insbesondere `deepmerge`, `glob` und
  `minimatch` einschließlich abhängiger Pakete. npm schlägt einen Major-Downgrade
  des PWA-Plugins vor; dieser wurde nicht ungeprüft angewendet. Vor einer
  Veröffentlichung die Toolchain aktualisieren und erneut prüfen. Kein
  `--force` und keine inkompatiblen Major-Overrides zur kosmetischen Bereinigung.
- **iPhone:** Responsive Darstellung in Browserbreite geprüft; Installation und
  Offline-Verhalten auf einem echten iPhone/Safari sowie das Zusammenspiel mit
  VoiceOver sind noch manuell zu prüfen.
- **PWA-Update:** Update-Hinweis implementiert. Ein kompletter Versionswechsel
  zwischen zwei veröffentlichten Builds wurde nicht durchgeführt.
- **Speicher:** Verhalten in Vitest mit `fake-indexeddb` geprüft. Browserquoten,
  privates Surfen, Datenlöschung und blockierte Schema-Upgrades müssen später
  mit echten Geräten und fachlichen Daten weiter geprüft werden. P0 speichert
  noch keine Benutzerdaten und verspricht kein Backup.
- **Supabase:** Ausschließlich Architekturvorbereitung; keine Authentifizierung,
  Cloud-Synchronisierung, Datenbank oder RLS-Policies. Keine Verbindung nötig.
- **Hosting:** Keine Veröffentlichung, kein Pages-Deployment und kein Merge.
  GitHub-Pages-End-to-End-Prüfung folgt erst nach Freigabe. CI ist vorbereitet;
  der lokale Prüfbericht ist unabhängig vom späteren GitHub-Actions-Ergebnis.

## Manuelle Abnahme nach Freigabe

1. Build unter dem finalen HTTPS-Pages-Pfad öffnen und jede Modulroute neu laden.
2. Auf iPhone/Safari über „Teilen → Zum Home-Bildschirm“ installieren.
3. App einmal online öffnen, danach offline starten und Module wechseln.
4. Zweiten Build bereitstellen und „Jetzt aktualisieren“ sowie „Später“ prüfen.
5. Touch-Ziele, Safe Areas, Landscape, Textvergrößerung und VoiceOver prüfen.
