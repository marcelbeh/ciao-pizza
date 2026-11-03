# Supabase und Pages · technischer Prüfbericht

Stand: 3. November 2026. Branch `feat/supabase-pages-release` auf P1.

## Ausgangslage

Alle elf Module geprüft: Dashboard, Pizza-Pilot und Teigstudio mit Profilen sind
entwickelt; die weiteren Bereiche sind weiterhin Platzhalter. Keine eigenständigen
Rezept-/Einstellungsdaten wurden im bisherigen Code gespeichert. Die neue zentrale
Datenstruktur enthält diese Bereiche bereits und bewahrt sie bei Teigänderungen.
Die P1-Rechenlogik, Stilwerte und Classico-Gestaltung wurden nicht neu entwickelt.

PR #1 (P0) und PR #2 (P1) sind offen. `main` enthält noch die ursprüngliche README.
Der neue Folge-PR richtet sich auf den P1-Branch, sodass die bestehenden PRs
unverändert bleiben. GitHub meldet aktuell `has_pages: false`.

## Umgesetzt

- Exakt gepinntes `@supabase/supabase-js`, nur öffentliche Publishable-Konfiguration.
- E-Mail-Code-Anmeldung; App-Daten erst nach Anmeldung sichtbar, Konto-Cache getrennt
  nach Benutzer-ID. Ein bearbeitender Tab pro Konto/Browser per Web Locks.
- Zentrale atomare Workspaces mit Teigplänen, Profilen, Rezepten und Einstellungen.
  Kein paralleles lokales Hauptsystem: IndexedDB ist Cache, Importquelle und Outbox.
- Versionsprüfung, Wiederholung mit Mutations-ID, Erhalt lokaler Änderungen während
  laufender Requests, explizite Konfliktzusammenführung mit vollständigem Archiv.
- Wiederholbarer P1-Import mit Eigentümerzuordnung, unverändertem lokalen Original,
  privatem Cloud-Archiv, portablem Backup und JSON-Wiederimport.
- Versionierte Migration, RLS und manuell freizugebender Pages-Workflow.
- PWA-Registrierung auch vor dem Login; kein Service-Worker-Cache für private API-
  oder Auth-Antworten. Basispfad `/ciao-pizza/`, Hash-Routing unverändert.

## Ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Vitest | 55 Tests bestanden: 40 bisherige + 15 gezielte Cloud-/Auth-Prüfungen |
| TypeScript | Erfolgreich |
| Produktionsbuild | Erfolgreich; PWA generiert |
| Mobile Anmeldeansicht | Bei 390 × 844 geprüft, kein horizontaler Überlauf |
| Produktive Abhängigkeiten | npm audit --omit=dev: keine Befunde |
| Reale SDK-Verbindung mit Publishable Key | Erfolgreich |
| Öffentliche Auth-Einstellungen | Projekt erreichbar, E-Mail-Auth aktiviert |
| Unangemeldeter SDK-Tabellenzugriff | Mit `42501` abgewiesen |
| Unangemeldeter SDK-Commit | Mit `42501` abgewiesen |
| Datenbank-RLS: eigenes/fremdes Konto | Eigener Commit erfolgreich; fremdes Lesen/Ändern gesperrt |
| Versuch einer Benutzer-ID-Übertragung | Durch RLS blockiert |
| Anonyme Auth-Sitzung | Lesen und Commit blockiert |
| Veraltete Revision | Commit blockiert, bestehender Stand erhalten |
| Doppelte Mutation nach verlorener Antwort | Idempotent, kein doppelter Commit |
| Import-Archiv und Commit | In derselben Transaktion gespeichert |
| Absichtlich fehlerhaftes Archiv | Gesamte Änderung zurückgerollt, keine Teilverluste |
| Fremde Receipts/Import-Backups | Nicht sichtbar |
| Supabase Security Advisor | Keine Befunde nach Migration |

Die Datenbankprüfung verwendet zwei temporäre Testidentitäten und prüft reale
Postgres-Rollen/JWT-Claims. Sie wird vollständig zurückgerollt; keine echten
Anmelde-E-Mails wurden versendet und keine Testbenutzer zurückgelassen.
Reproduzierbar über `supabase/tests/rls.sql` im Supabase SQL Editor mit Betreiberrechten.
`scripts/check-supabase.mjs` prüft den realen SDK-/HTTP-Weg ohne Anmeldung.

Die gezielten neuen Tests decken Offline-Änderungen und Reload, getrennte Konten,
Schreibreihenfolge während laufender Requests, verlorene Bestätigungen, konkurrierende
Cloud-Versionen, beschädigte/neue Datenformate, vollständigen Import, Profil-/Rezept-
Kollisionen, Erhalt von Einstellungen, Backup-Wiederherstellung und den E-Mail-Code-
UI-Ablauf ab. Bestehende Mengenberechnungen, Profilaktionen und Navigation bestehen weiter.

## Datenbankzustand

Projekt `ciao-pizza`, Ref `jhweepsclnottxqgppqf`, Region EU-West, Postgres 17.
Migration `20261103112111_private_workspaces` ist bereits angewendet:

- `ciao_workspaces`: ein vollständiger versionierter Arbeitsstand je Nutzer.
- `ciao_sync_receipts`: kleine Bestätigungen zur sicheren Wiederholung.
- `ciao_import_backups`: vollständige Originale von Importen/Zusammenführungen.

Alle Tabellen haben RLS und Benutzer-ID als führenden Primärschlüsselbestandteil.
Der Commit ist `SECURITY INVOKER` mit leerem `search_path`, expliziter Benutzerprüfung
und Transaktionssperre. Kein Secret-/Service-Role-Key im Client. Unnötige API-
Ausführungsrechte des vorhandenen Event-Trigger-Helfers `rls_auto_enable()` wurden
entzogen; der automatische RLS-Trigger selbst bleibt erhalten.

## Offene Freigabepunkte und Grenzen

**Noch nicht vollständig zur öffentlichen Veröffentlichung abgenommen.**

1. SMTP, Code-Vorlagen, erlaubte Registrierungen und URL-Konfiguration müssen im
   Supabase-Dashboard geprüft/gesetzt werden. Diese Auth-Verwaltung ist im verfügbaren
   Connector nicht enthalten. Insbesondere ist der Standard-Mailversand kein Ersatz
   für produktives SMTP. Ein echter E-Mail-Code-Login wurde noch nicht durchgeführt.
2. GitHub Actions Variables/Secrets und Pages-Source müssen vom Betreiber gesetzt
   werden. Der Connector bietet diese Einstellungen nicht an. Noch kein Pages-Deploy.
3. Echter Zweigeräte-Login, reale lokale Altbestände, Logout, iPhone-Installation
   und PWA-Offlineneustart mit Anmeldung bleiben Abnahmetests. Die automatisierten
   Migrationstests verwenden repräsentative Daten; auf private Browserdaten anderer
   Origins wurde nicht zugegriffen.
4. Browserdaten sind originabhängig und unverschlüsselt auf dem Gerät gespeichert.
   Der Zugriff in der App ist kontogetrennt; lokale Geräte-/Browserzugriffe werden
   nicht durch Datenbank-RLS verschlüsselt. Ausgeloggte oder abgelaufene Sitzungen
   können ohne Internet keine neue Anmeldung erhalten.
5. Bei Konflikten werden beide Varianten bewahrt. Profil-Löschungen können dadurch
   als Sicherheitskopie wieder erscheinen; unterschiedliche Einstellungen bleiben
   zusätzlich im Archiv. Maximal 100 Profile: bei Überlauf Abbruch statt Trunkierung.
6. Receipts und private Originalarchive werden bewusst nicht automatisch gelöscht.
   Bei größerer kommerzieller Nutzung müssen Aufbewahrung und Quoten später geregelt werden.
7. Die P0-Build-Werkzeugkette hat weiterhin 10 niedrige/moderate Auditbefunde,
   keine hohen/kritischen. Der Build meldet zudem einen Hauptchunk über 500 kB;
   funktional kein Blocker, vor weiterem Wachstum eine gezielte Aufteilung prüfen.
8. Hefe-/Gärwerte bleiben die dokumentierten P1-Schätzungen, keine neue physikalische Prognose.

## Freigabeurteil

Die Integration ist implementiert und technisch gezielt geprüft. **Der Livegang
bleibt gesperrt**, bis die in [LIVEGANG.md](LIVEGANG.md) beschriebenen Einstellungen
und der echte Konto-Test abgeschlossen sind und der Auftraggeber ausdrücklich
freigibt. Kein PR wurde gemergt und kein Deployment gestartet. Die Datenbank wurde
im Rahmen der beauftragten Integration vorbereitet, ohne die App öffentlich zu schalten.
