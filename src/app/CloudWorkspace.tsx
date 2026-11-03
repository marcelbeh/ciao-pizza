import { LocalWorkspace } from "./LocalWorkspace";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../infrastructure/supabase/client";
import { createRemoteWorkspace } from "../infrastructure/supabase/remoteWorkspace";
import { SyncedRepository } from "../infrastructure/supabase/syncedRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import { DOUGH_KEY } from "../infrastructure/storage/doughRepository";
import { migrateLegacy } from "../core/cloud/document";
import { DoughProvider } from "./DoughProvider";
import "./cloud.css";
const store = createIndexedDbStore();
const legacyOwner = "legacy-import-owner:v1";
function download(value: unknown, name = "ciao-sicherung.json") {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Local First is unconditional; the optional account implementation stays prepared below. */
export function CloudWorkspace({ children }: { children: ReactNode }) {
  return <LocalWorkspace>{children}</LocalWorkspace>;
}
export function AuthenticatedWorkspace({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    let alive = true;
    let authEvent = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      authEvent = true;
      if (alive) {
        setSession(next);
        setLoaded(true);
        setError("");
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive && !authEvent) {
          setSession(data.session);
          setLoaded(true);
          if (error)
            setError(
              "Anmeldung konnte nicht wiederhergestellt werden. Bitte erneut anmelden.",
            );
        }
      })
      .catch(() => {
        if (alive) {
          setLoaded(true);
          setError("Anmeldung nicht verfügbar. Bitte Verbindung prüfen.");
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  if (!supabase)
    return (
      <AccountFrame>
        <h1>Ciao! wird vorbereitet.</h1>
        <p>
          Die sichere Cloud-Verbindung ist noch nicht konfiguriert. Bestehende
          lokale Daten bleiben unverändert.
        </p>
        <p>
          Für den Betreiber: VITE_SUPABASE_URL und VITE_SUPABASE_PUBLISHABLE_KEY
          gemäß der Einrichtungsanleitung setzen. Keine geheimen Schlüssel
          verwenden.
        </p>
      </AccountFrame>
    );
  if (!loaded)
    return (
      <AccountFrame>
        <p role="status">Dein Konto wird geladen …</p>
      </AccountFrame>
    );
  if (!session || session.user.is_anonymous)
    return (
      <AccountFrame>
        <Login initialError={error} />
      </AccountFrame>
    );
  return (
    <SignedIn key={session.user.id} session={session}>
      {children}
    </SignedIn>
  );
}
function AccountFrame({ children }: { children: ReactNode }) {
  return (
    <main className="account-frame">
      <div className="account-card">
        <span className="brand">Ciao!</span>
        <p className="eyebrow">LA TUA PIZZA. IL TUO SPAZIO.</p>
        {children}
      </div>
    </main>
  );
}
function Login({ initialError }: { initialError: string }) {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialError);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const normalized = email.trim();
      const { error } = await supabase!.auth.signInWithOtp({
        email: normalized,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSentEmail(normalized);
      setMessage(
        "Bitte prüfe dein Postfach und gib den Anmeldecode hier ein. Warte vor einer erneuten Anfrage kurz.",
      );
    } catch {
      setMessage(
        "Der Code konnte nicht angefordert werden. Bitte E-Mail-Adresse, Verbindung und gegebenenfalls den Spamordner prüfen. Bei wiederholten Problemen den Betreiber kontaktieren.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase!.auth.verifyOtp({
        email: sentEmail,
        token: token.trim(),
        type: "email",
      });
      if (error) throw error;
    } catch {
      setMessage(
        "Der Code ist ungültig oder abgelaufen, oder die Verbindung fehlt. Bitte erneut versuchen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Deine Pizza. Dein Konto.</h1>
      <p>
        Melde dich mit einem E-Mail-Code an. Deine Teigpläne und Profile bleiben
        privat und werden zwischen deinen Geräten synchronisiert.
      </p>
      <form onSubmit={send}>
        <label htmlFor="login-email">E-Mail-Adresse</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <button className="button" disabled={busy}>
          {busy
            ? "Bitte warten …"
            : sentEmail
              ? "Neuen Code anfordern"
              : "Anmeldecode senden"}
        </button>
      </form>
      {sentEmail && (
        <form onSubmit={verify}>
          <label htmlFor="login-code">Anmeldecode für {sentEmail}</label>
          <input
            id="login-code"
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6,10}"
            minLength={6}
            maxLength={10}
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={busy}
          />
          <button className="button" disabled={busy}>
            Anmelden
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="account-message">
          {message}
        </p>
      )}
      <p className="account-fine">
        Für die erste Anmeldung benötigst du Internet. Auf eigenen Geräten
        bleibt deine Sitzung gespeichert. Auf gemeinsam genutzten Geräten
        anschließend abmelden.
      </p>
    </>
  );
}
function SignedIn({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const [acquired, setAcquired] = useState(false);
  const [lockError, setLockError] = useState("");
  useEffect(() => {
    if (!navigator.locks) {
      setLockError(
        "Dieser Browser unterstützt die sichere Offline-Bearbeitung nicht. Bitte einen aktuellen Safari, Chrome oder Firefox verwenden.",
      );
      return;
    }
    let cancelled = false;
    let release: (() => void) | undefined;
    void navigator.locks
      .request(`ciao-editor:${session.user.id}`, async () => {
        if (cancelled) return;
        setAcquired(true);
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      })
      .catch(() => {
        if (!cancelled)
          setLockError(
            "Der sichere Bearbeitungsmodus konnte nicht gestartet werden. Bitte den Browser neu laden.",
          );
      });
    return () => {
      cancelled = true;
      release?.();
    };
  }, [session.user.id]);
  if (!acquired)
    return (
      <AccountFrame>
        <h1>Dein Arbeitsbereich</h1>
        <p role="status">
          {lockError ||
            "Arbeitsbereich wird geöffnet. Falls Ciao! schon in einem anderen Tab geöffnet ist, schließe diesen bitte. Pro Browser kann ein Tab offline bearbeiten; andere Geräte werden über die Cloud abgeglichen."}
        </p>
      </AccountFrame>
    );
  return <LockedWorkspace session={session}>{children}</LockedWorkspace>;
}
function LockedWorkspace({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const repository = useMemo(
    () =>
      new SyncedRepository(
        session.user.id,
        store,
        createRemoteWorkspace(supabase!, session.user.id),
      ),
    [session.user.id],
  );
  const status = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
  );
  const [epoch, setEpoch] = useState(0);
  const view = useMemo(() => repository.view(), [repository, epoch]);
  const [localSaving, setLocalSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState<{
    raw: unknown;
    key: string;
    summary: string;
  } | null>(null);
  useEffect(() => {
    repository.start();
    repository.onDocumentChange = () => setEpoch((n) => n + 1);
    const online = repository.connectionChanged;
    const offline = repository.connectionChanged;
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      repository.stop();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [repository]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const owner = await store.get<string>(legacyOwner);
      if (owner && owner !== session.user.id) return;
      const raw = await store.get<unknown>(DOUGH_KEY);
      if (raw === undefined) return;
      const dough = migrateLegacy(raw);
      if (!dough.active && !dough.profiles.length) return;
      const bytes = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(raw)),
      );
      const key = `p1:${Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join("")}`;
      if (alive)
        setLegacy({
          raw,
          key,
          summary: `${dough.active ? "1 aktiver Teigplan und " : ""}${dough.profiles.length} Profile aus der bisherigen lokalen App`,
        });
    })().catch(() => {
      if (alive)
        setMessage(
          "Vorhandene lokale Daten konnten nicht sicher übernommen werden. Sie wurden nicht gelöscht. Bitte vor dem Livegang prüfen.",
        );
    });
    return () => {
      alive = false;
    };
  }, [session.user.id]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Aktion fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    // Pending changes remain isolated under this user ID for the next login.
    const { error } = await supabase!.auth.signOut({ scope: "local" });
    if (error)
      throw Error("Abmelden fehlgeschlagen. Bitte die Verbindung prüfen.");
  }
  return (
    <>
      <aside
        className={`cloud-bar cloud-${status.state}`}
        aria-label="Konto und Synchronisierung"
      >
        <div>
          <strong>{session.user.email ?? "Dein Konto"}</strong>
          <p role="status">{status.message}</p>
        </div>
        <div className="cloud-actions">
          <button
            type="button"
            disabled={
              busy || localSaving || status.busy || status.state === "loading"
            }
            onClick={() => void action(repository.retry)}
          >
            Jetzt synchronisieren
          </button>
          <button
            type="button"
            disabled={localSaving || status.state === "loading"}
            onClick={() => {
              try {
                download(repository.backup());
              } catch {
                setMessage("Sicherung ist noch nicht verfügbar.");
              }
            }}
          >
            Sicherung herunterladen
          </button>
          <button
            type="button"
            disabled={busy || localSaving}
            onClick={() => fileInput.current?.click()}
          >
            Sicherung importieren
          </button>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="application/json,.json"
            aria-label="Eigene Ciao!-Sicherung auswählen"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void action(async () => {
                if (file.size > 6000000)
                  throw Error(
                    "Die Datei ist zu groß. Bitte eine Ciao!-Sicherung bis 6 MB auswählen.",
                  );
                let raw: unknown;
                const text = await file.text();
                try {
                  raw = JSON.parse(text);
                } catch {
                  throw Error("Die Datei ist keine gültige JSON-Sicherung.");
                }
                const hash = await crypto.subtle.digest(
                  "SHA-256",
                  new TextEncoder().encode(text),
                );
                const key =
                  "file:" +
                  Array.from(new Uint8Array(hash), (n) =>
                    n.toString(16).padStart(2, "0"),
                  ).join("");
                await repository.importBackup(raw, key);
              });
            }}
          />
          <button
            type="button"
            disabled={busy || localSaving}
            onClick={() => void action(signOut)}
          >
            Abmelden
          </button>
        </div>
        {status.state === "conflict" && (
          <div className="cloud-detail">
            <p>
              Beide Stände bleiben erhalten: Der lokale aktive Plan bleibt
              aktiv, der Cloud-Plan wird zusätzlich als Profil gesichert.
              Gelöschte Profile können dabei als Sicherheitskopie wieder
              erscheinen. Abweichende Einstellungen werden vollständig im
              privaten Archiv bewahrt.
            </p>
            <button
              className="button"
              disabled={busy || localSaving}
              onClick={() => void action(repository.mergeConflict)}
            >
              Beide Stände sicher zusammenführen
            </button>
          </div>
        )}
        {legacy &&
          status.state !== "loading" &&
          !repository.hasImport(legacy.key) && (
            <div className="cloud-detail">
              <p>
                {legacy.summary} wurden gefunden. Nur übernehmen, wenn diese
                Daten dir gehören. Das lokale Original bleibt erhalten.
              </p>
              <button
                className="button"
                disabled={busy || localSaving}
                onClick={() =>
                  void action(async () => {
                    await store.set(legacyOwner, session.user.id);
                    await repository.importLegacy(legacy.raw, legacy.key);
                  })
                }
              >
                Lokale Daten in dieses Konto übernehmen
              </button>
            </div>
          )}
        {message && <p role="alert">{message}</p>}
        {status.dirty && (
          <p className="account-fine">
            Noch nicht in der Cloud bestätigte Änderungen bleiben auf diesem
            Gerät diesem Konto zugeordnet. Vor dem Löschen von Browserdaten
            synchronisieren oder sichern.
          </p>
        )}
      </aside>
      <DoughProvider
        key={`${session.user.id}:${epoch}`}
        repository={view}
        storageMode="cloud"
        onSavingChange={setLocalSaving}
      >
        {children}
      </DoughProvider>
    </>
  );
}
