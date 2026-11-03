# Erste öffentliche Version ohne Mail-Anmeldung

Der Auftraggeber hat am 3. November 2026 den Livegang freigegeben und die Mail-
Anmeldung zurückgestellt. Der Pages-Build setzt deshalb `VITE_AUTH_MODE=local`.

- Dashboard, Pizza-Pilot, Teigstudio, Profilaktionen und Modulnavigation bleiben nutzbar.
- Teigpläne und Profile werden weiterhin im vorhandenen IndexedDB-Speicher abgelegt.
- Eine lokale JSON-Sicherung ist über den Hinweis oberhalb der App herunterladbar.
- Ohne Konto werden keine Daten in Supabase geschrieben oder daraus gelesen.
- RLS, private Cloud-Daten und die vorbereitete Anmeldung werden nicht verändert.
- Geräteübergreifende Synchronisierung folgt mit der späteren Kontoaktivierung.

Für diesen Build sind weder SMTP noch Supabase-Variables in GitHub erforderlich.
Der Pages-Workflow bleibt manuell: auf `main` mit `FREIGEGEBEN` starten. Die
Veröffentlichungsfreigabe liegt für diese lokale Version vor.

Vor späterer Aktivierung von `VITE_AUTH_MODE=cloud` gelten wieder die Schritte in
LIVEGANG.md: SMTP/Code-Vorlagen, öffentliche Supabase-Konfiguration und echter
Konto-Test. Lokale Daten können dann wie vorbereitet bewusst importiert werden.
