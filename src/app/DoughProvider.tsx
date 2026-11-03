import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DoughPlan, DoughState } from "../core/dough/model";
import { assertPlan } from "../core/dough/calculations";
import { createDoughRepository } from "../infrastructure/storage/doughRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
export const doughRepository = createDoughRepository(createIndexedDbStore());
type Repository = ReturnType<typeof createDoughRepository>;
interface Workspace {
  state: DoughState;
  ready: boolean;
  error: string;
  saving: boolean;
  storageMode: "local" | "cloud";
  retry(): void;
  setActive(plan: DoughPlan): void;
  saveProfile(name: string, id?: string): void;
  loadProfile(id: string): void;
  deleteProfile(id: string): void;
}
const Context = createContext<Workspace | null>(null);
export function DoughProvider({
  children,
  repository = doughRepository,
  storageMode = "local",
  onSavingChange,
}: {
  children: ReactNode;
  repository?: Repository;
  storageMode?: "local" | "cloud";
  onSavingChange?: (saving: boolean) => void;
}) {
  const [state, setState] = useState<DoughState>({
    version: 1,
    active: null,
    profiles: [],
  });
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    repository
      .load()
      .then((saved) => {
        if (!cancelled) {
          current.current = saved;
          setState(saved);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Teigdaten konnten nicht geladen werden. Vorhandene Daten werden nicht überschrieben. Bitte Speicherzugriff prüfen und erneut versuchen.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [repository, attempt]);
  function persist(next: DoughState) {
    if (!ready) throw Error("Lokaler Speicher ist noch nicht bereit.");
    current.current = structuredClone(next);
    setState(current.current);
    setSaving(true);
    setError("");
    const serial = ++revision.current;
    const snapshot = structuredClone(next);
    queue.current = queue.current
      .catch(() => {})
      .then(() => repository.save(snapshot))
      .then(() => {
        if (serial === revision.current) {
          setSaving(false);
          setError("");
        }
      })
      .catch(() => {
        if (serial === revision.current) {
          setSaving(false);
          setError(
            "Änderungen sind noch nicht dauerhaft gespeichert. Bitte erneut speichern; beim Schließen können sie verloren gehen.",
          );
        }
      });
  }
  const value: Workspace = {
    state,
    ready,
    error,
    saving,
    storageMode,
    retry() {
      if (ready) persist(current.current);
      else setAttempt((n) => n + 1);
    },
    setActive(plan) {
      assertPlan(plan);
      persist({ ...current.current, active: plan });
    },
    saveProfile(name, id) {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 80)
        throw Error("Profilname: 1 bis 80 Zeichen.");
      if (!current.current.active)
        throw Error("Zuerst einen aktiven Plan erstellen.");
      if (!id && current.current.profiles.length >= 100)
        throw Error("Maximal 100 Profile. Bitte ein Profil löschen.");
      if (id && !current.current.profiles.some((p) => p.id === id))
        throw Error("Profil nicht gefunden.");
      const profile = {
        id: id ?? crypto.randomUUID(),
        name: trimmed,
        plan: { ...structuredClone(current.current.active), name: trimmed },
        updatedAt: new Date().toISOString(),
      };
      persist({
        ...current.current,
        profiles: id
          ? current.current.profiles.map((p) => (p.id === id ? profile : p))
          : [...current.current.profiles, profile],
      });
    },
    loadProfile(id) {
      const profile = current.current.profiles.find((p) => p.id === id);
      if (!profile) throw Error("Profil nicht gefunden.");
      persist({
        ...current.current,
        active: { ...structuredClone(profile.plan), id: crypto.randomUUID() },
      });
    },
    deleteProfile(id) {
      persist({
        ...current.current,
        profiles: current.current.profiles.filter((p) => p.id !== id),
      });
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDough() {
  const context = useContext(Context);
  if (!context) throw Error("DoughProvider fehlt.");
  return context;
}
export function StorageStatus() {
  const workspace = useDough();
  return (
    <div className="storage-status" role="status">
      {workspace.error ? (
        <>
          <p>{workspace.error}</p>
          <button
            type="button"
            className="text-button"
            onClick={workspace.retry}
          >
            Erneut versuchen
          </button>
        </>
      ) : workspace.ready ? (
        <span>
          {workspace.saving
            ? "Wird lokal gespeichert …"
            : workspace.state.active
              ? workspace.storageMode === "cloud"
                ? "Im Konto-Cache gesichert · Cloudstatus oben beachten"
                : "Lokal gespeichert · auf diesem Gerät"
              : "Noch kein aktiver Plan · Entwurf wird erst beim Übernehmen gespeichert"}
        </span>
      ) : (
        <span>Lokale Teigdaten werden geladen …</span>
      )}
    </div>
  );
}
