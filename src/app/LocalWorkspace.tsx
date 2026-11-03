import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LocalRepository } from "../infrastructure/storage/localRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import { DoughProvider } from "./DoughProvider";
const repository = new LocalRepository(createIndexedDbStore());
const Context = createContext<LocalRepository | null>(null);
export function useLocal() {
  const repo = useContext(Context);
  if (!repo) throw Error("Lokaler Speicher fehlt.");
  const state = useSyncExternalStore(repo.subscribe, repo.getSnapshot);
  return { state, repository: repo };
}
function download(value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "ciao-lokale-sicherung.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function LocalWorkspace({
  children,
  repo = repository,
}: {
  children: ReactNode;
  repo?: LocalRepository;
}) {
  const state = useSyncExternalStore(repo.subscribe, repo.getSnapshot);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [epoch, setEpoch] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    void repo.load().catch((e) => setError(String(e.message)));
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [repo]);
  return (
    <Context.Provider value={repo}>
      <aside className="cloud-bar" aria-label="Lokaler Modus">
        <div>
          <strong>Ciao! · Ohne Anmeldung</strong>
          <p>
            Deine Pläne und Profile bleiben auf diesem Gerät. Auch Tagebuch,
            Fotos, Backläufe, Rezepte, Pizzaabende und Einkaufslisten werden
            lokal gespeichert.
            {offline
              ? " Du bist offline. Alle Kernfunktionen bleiben verfügbar."
              : ""}
          </p>
          <small>
            Browserdaten nicht löschen. Sichere deine Daten regelmäßig;
            Cloud-Synchronisierung folgt optional.
          </small>
        </div>
        <div className="cloud-actions">
          <button disabled={!state} onClick={() => download(state)}>
            Sicherung herunterladen
          </button>
          <label className="backup-import">
            Sicherung hinzufügen
            <input
              type="file"
              accept="application/json,.json"
              disabled={!state}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 50000000)
                    throw Error("Sicherung ist größer als 50 MB.");
                  await repo.importBackup(JSON.parse(await file.text()));
                  setEpoch((n) => n + 1);
                  setNotice(
                    "Sicherung als Kopien hinzugefügt. Importierte Teigpläne findest du unter den Profilen.",
                  );
                  setError("");
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Import fehlgeschlagen.",
                  );
                }
              }}
            />
          </label>
        </div>
      </aside>
      {error && (
        <div role="alert" className="field-error">
          {error}
          <button
            onClick={() => {
              setError("");
              void repo.load().catch((e) => setError(e.message));
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {state ? (
        <DoughProvider key={epoch} repository={repo.doughRepository}>
          {children}
        </DoughProvider>
      ) : (
        <p role="status">Lokaler Speicher wird geöffnet …</p>
      )}
    </Context.Provider>
  );
}
