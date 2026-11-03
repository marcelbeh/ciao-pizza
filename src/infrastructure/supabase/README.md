# Supabase-Anbindung

Bestehendes Projekt `ciao-pizza`, Ref `jhweepsclnottxqgppqf`, EU-West.
SDK: exakt gepinntes `@supabase/supabase-js`. Nur `sb_publishable_…` im Frontend.

- `client.ts`: öffentliche Konfiguration, persistierte Auth-Sitzung, begrenzte Netzwerkwartezeit.
- `remoteWorkspace.ts`: kontogebundene Reads und revisionierte RPC-Commits.
- `syncedRepository.ts`: Offline-Cache, serialisierte Änderungen, Konflikte und Import.
- `core/cloud/document.ts`: versioniertes Datenformat und verlustbewahrende Zusammenführung.

`ciao_workspaces` enthält pro Konto einen atomaren Arbeitsstand mit Teigplänen,
Profilen, Rezeptdatensätzen und Einstellungen. Das hält das vorhandene P1-Datenmodell
unverändert. `ciao_sync_receipts` schützt Wiederholungen nach verlorenen Antworten;
`ciao_import_backups` bewahrt vollständige Import-/Konflikt-Originale.
Alle Tabellen sind per RLS auf `auth.uid() = user_id` begrenzt; anonyme Sitzungen
sind ausgeschlossen. Der Commit ist `SECURITY INVOKER` mit expliziter Benutzerprüfung.

Es gibt noch keine eigenständige Rezept-/Einstellungsoberfläche; vorhandene bzw.
künftige Datensätze bleiben bei Teigänderungen erhalten. Keine neuen Fachmodule.

Einrichtung und Freigabe: [LIVEGANG.md](../../../docs/LIVEGANG.md).
Prüfbericht: [CLOUD-VERIFICATION.md](../../../docs/CLOUD-VERIFICATION.md).
