import "./check-release-config.mjs";
import { createClient } from "@supabase/supabase-js";
const url = process.env.VITE_SUPABASE_URL.trim();
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY.trim();
const client = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
const settings = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
});
if (!settings.ok)
  throw Error(`Auth-Verbindung fehlgeschlagen: HTTP ${settings.status}`);
const auth = await settings.json();
if (!auth.external?.email) throw Error("E-Mail-Anmeldung ist nicht aktiviert.");
const { error: readError } = await client
  .from("ciao_workspaces")
  .select("user_id")
  .limit(1);
if (readError?.code !== "42501")
  throw Error(
    "Unangemeldeter Tabellenzugriff ist nicht wie erwartet gesperrt.",
  );
const { error: writeError } = await client.rpc("ciao_commit_workspace", {
  p_user_id: crypto.randomUUID(),
  p_document: {},
  p_expected_revision: 0,
  p_mutation_id: crypto.randomUUID(),
  p_archive_key: null,
  p_archive: null,
});
if (writeError?.code !== "42501")
  throw Error("Unangemeldeter RPC-Zugriff ist nicht wie erwartet gesperrt.");
console.log(
  "Supabase erreichbar; E-Mail-Auth aktiviert; unangemeldetes Lesen und Schreiben gesperrt. Kein Login-Code versendet, keine Benutzerdaten angelegt.",
);
