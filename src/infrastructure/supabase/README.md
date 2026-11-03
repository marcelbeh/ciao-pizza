# Spätere Supabase-Anbindung

P0 enthält bewusst keinen Client, keine Requests und keine Supabase-Abhängigkeit.
Die App funktioniert ohne Umgebungsvariablen und ohne Account.

Für eine spätere Integration hier den Client und explizite Remote-Repository-Adapter ergänzen.
Die fachlichen Repository-Ports gehören nach `core/`; UI-Module bekommen ihre Implementierung
über eine zentrale Composition Root in `app/`. Den lokalen Store nicht stillschweigend durch
einen Remote-Store ersetzen: Offline-Verhalten, Konflikte, Migration und Sync müssen separat
definiert werden.

`.env.example` reserviert URL und **öffentlichen Publishable Key**. Alle `VITE_*`-Werte
sind öffentlich im Browser sichtbar. Secret-/Service-Role-Keys dürfen dort niemals stehen.
Vor Aktivierung: Auth-Konzept, Eigentümermodell, RLS-Policies und Datenmigration prüfen.
Keine Infrastruktur, Tabellen oder Benutzerkonten wurden in P0 angelegt.

Referenz: https://supabase.com/docs/guides/getting-started/api-keys
