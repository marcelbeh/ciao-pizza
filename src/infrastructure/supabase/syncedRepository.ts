import type { DoughState } from "../../core/dough/model";
import type { KeyValueStore } from "../../core/storage/KeyValueStore";
import {
  assertDocument,
  emptyDocument,
  mergeDocuments,
  migrateLegacy,
  type CloudDocument,
  type Json,
} from "../../core/cloud/document";
import {
  InvalidCloudData,
  SyncConflict,
  type RemoteWorkspace,
} from "./remoteWorkspace";
interface Cache {
  version: 1;
  userId: string;
  document: CloudDocument;
  revision: number;
  dirty: boolean;
  generation: number;
  mutationId: string;
  archiveKey: string | null;
  archive: Json | null;
  conflict: boolean;
}
export interface SyncStatus {
  state: "loading" | "synced" | "pending" | "offline" | "error" | "conflict";
  message: string;
  dirty: boolean;
  busy: boolean;
}
export const cacheKey = (userId: string) =>
  `cloud-cache:jhweepsclnottxqgppqf:v1:${userId}`;
export class SyncedRepository {
  private cache: Cache | null = null;
  private queue = Promise.resolve();
  private hydration: Promise<DoughState> | null = null;
  private syncing = false;
  private stopped = false;
  private viewVersion = 0;
  private listeners = new Set<() => void>();
  private status: SyncStatus = {
    state: "loading",
    message: "Cloud-Daten werden geladen …",
    dirty: false,
    busy: false,
  };
  onDocumentChange = () => {};
  constructor(
    readonly userId: string,
    private store: KeyValueStore,
    private remote: RemoteWorkspace,
    private online = () => navigator.onLine,
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.status;
  private report(state: SyncStatus["state"], message: string) {
    if (this.stopped) return;
    this.status = {
      state,
      message,
      dirty: this.cache?.dirty ?? false,
      busy: this.syncing,
    };
    this.listeners.forEach((fn) => fn());
  }
  private async serial<T>(fn: () => Promise<T>): Promise<T> {
    const operation = this.queue
      .catch(() => {})
      .then(() => {
        if (this.stopped) throw Error("Konto wurde gewechselt.");
        return fn();
      });
    this.queue = operation.then(
      () => {},
      () => {},
    );
    return operation;
  }
  private async write() {
    if (this.cache)
      await this.store.set(cacheKey(this.userId), structuredClone(this.cache));
  }
  private validateCache(value: unknown): asserts value is Cache {
    const c = value as Cache;
    if (
      !c ||
      c.version !== 1 ||
      c.userId !== this.userId ||
      !Number.isSafeInteger(c.revision) ||
      c.revision < 0 ||
      !Number.isSafeInteger(c.generation) ||
      typeof c.dirty !== "boolean" ||
      typeof c.conflict !== "boolean" ||
      typeof c.mutationId !== "string" ||
      !(c.archiveKey === null || typeof c.archiveKey === "string")
    )
      throw Error(
        "Lokaler Cloud-Cache ist beschädigt. Er wurde nicht überschrieben.",
      );
    assertDocument(c.document);
  }
  load = (): Promise<DoughState> => {
    if (this.cache)
      return Promise.resolve(structuredClone(this.cache.document.dough));
    if (!this.hydration)
      this.hydration = this.hydrate().catch((error) => {
        this.hydration = null;
        throw error;
      });
    return this.hydration;
  };
  private async hydrate(): Promise<DoughState> {
    const saved = await this.store.get<unknown>(cacheKey(this.userId));
    if (saved !== undefined) {
      this.validateCache(saved);
      this.cache = saved;
    }
    if (!this.online()) {
      if (!this.cache)
        throw Error("Erster Cloud-Abruf benötigt eine Internetverbindung.");
      this.report(
        "offline",
        "Offline · nur der Cache dieses Kontos ist verfügbar.",
      );
      return structuredClone(this.cache.document.dough);
    }
    try {
      const remote = await this.remote.load();
      if (this.stopped) throw Error("Konto gewechselt.");
      if (this.cache?.dirty) {
        if ((remote?.revision ?? 0) !== this.cache.revision) {
          this.cache.conflict = true;
          await this.write();
          this.report(
            "conflict",
            "Die Cloud wurde andernorts geändert. Deine lokale Kopie bleibt erhalten.",
          );
        } else {
          this.report(
            "pending",
            "Lokale Änderungen warten auf Synchronisierung.",
          );
          queueMicrotask(() => void this.flush());
        }
      } else if (this.cache && this.cache.revision > 0 && !remote) {
        this.cache.conflict = true;
        this.cache.dirty = true;
        await this.write();
        this.report(
          "conflict",
          "Der bisherige Cloud-Stand fehlt. Die lokale Kopie bleibt erhalten.",
        );
      } else {
        this.cache = {
          version: 1,
          userId: this.userId,
          document: remote?.document ?? emptyDocument(),
          revision: remote?.revision ?? 0,
          dirty: false,
          generation: 0,
          mutationId: crypto.randomUUID(),
          archiveKey: null,
          archive: null,
          conflict: false,
        };
        await this.write();
        this.report("synced", "Mit Supabase synchronisiert.");
      }
    } catch (error) {
      if (!this.cache) {
        this.report(
          "error",
          "Erster Cloud-Abruf fehlgeschlagen. Internetverbindung und Anmeldung prüfen.",
        );
        throw error;
      }
      if (error instanceof InvalidCloudData) {
        this.cache.conflict = true;
        this.cache.dirty = true;
        await this.write();
        this.report("conflict", error.message);
      } else
        this.report(
          "error",
          "Cloud nicht erreichbar. Vorhandener Konto-Cache bleibt nutzbar; Änderungen werden noch nicht hochgeladen.",
        );
    }
    return structuredClone(this.cache!.document.dough);
  }
  save = async (
    dough: DoughState,
    viewVersion = this.viewVersion,
  ): Promise<void> => {
    await this.serial(async () => {
      if (viewVersion !== this.viewVersion)
        throw Error(
          "Die Ansicht wurde neu geladen. Veraltete Eingaben wurden nicht über den neuen Stand geschrieben.",
        );
      if (!this.cache) throw Error("Cloud-Cache noch nicht geladen.");
      const document = {
        ...this.cache.document,
        dough: structuredClone(dough),
      };
      assertDocument(document);
      this.cache = {
        ...this.cache,
        document,
        dirty: true,
        generation: this.cache.generation + 1,
        mutationId: crypto.randomUUID(),
      };
      await this.write();
      this.report(
        this.cache.conflict ? "conflict" : "pending",
        this.cache.conflict
          ? "Konflikt offen · neue Änderungen sind nur lokal gesichert."
          : "Auf diesem Gerät gesichert · Cloud-Speicherung läuft.",
      );
    });
    void this.flush();
  };
  flush = async (): Promise<void> => {
    if (
      this.syncing ||
      this.stopped ||
      !this.cache?.dirty ||
      this.cache.conflict
    )
      return;
    if (!this.online()) {
      this.report(
        "offline",
        "Offline · Änderungen sind im Konto-Cache gesichert und warten auf Verbindung.",
      );
      return;
    }
    this.syncing = true;
    try {
      while (
        !this.stopped &&
        this.cache?.dirty &&
        !this.cache.conflict &&
        this.online()
      ) {
        const snapshot = await this.serial(async () =>
          structuredClone(this.cache!),
        );
        this.report("pending", "Wird mit Supabase synchronisiert …");
        const revision = await this.remote.commit({
          document: snapshot.document,
          revision: snapshot.revision,
          mutationId: snapshot.mutationId,
          archiveKey: snapshot.archiveKey,
          archive: snapshot.archive,
        });
        await this.serial(async () => {
          if (!this.cache) throw Error("Cache fehlt.");
          const changed = this.cache.generation !== snapshot.generation;
          this.cache.revision = revision;
          this.cache.dirty = changed;
          // An archive created while this request was in flight must survive its acknowledgement.
          if (this.cache.archiveKey === snapshot.archiveKey) {
            this.cache.archiveKey = null;
            this.cache.archive = null;
          }
          await this.write();
        });
      }
    } catch (error) {
      if (this.stopped) return;
      if (error instanceof SyncConflict) {
        await this.serial(async () => {
          this.cache!.conflict = true;
          await this.write();
        });
        this.report(
          "conflict",
          "Cloud-Konflikt: keine Daten überschrieben. Beide Stände lassen sich zusammenführen.",
        );
      } else
        this.report(
          this.online() ? "error" : "offline",
          "Cloud-Speicherung fehlgeschlagen. Änderungen bleiben auf diesem Gerät. Bitte erneut versuchen oder eine Sicherung herunterladen.",
        );
    } finally {
      this.syncing = false;
      if (!this.stopped) {
        if (!this.cache?.dirty)
          this.report("synced", "Mit Supabase synchronisiert.");
        else this.report(this.status.state, this.status.message);
      }
    }
  };
  retry = async () => {
    if (!this.cache) {
      await this.load();
      this.documentChanged();
      return;
    }
    if (this.cache?.dirty) {
      await this.flush();
      return;
    }
    if (this.syncing || this.stopped) return;
    if (!this.online()) {
      this.report("offline", "Offline · Konto-Cache wird verwendet.");
      return;
    }
    this.syncing = true;
    try {
      const remote = await this.remote.load();
      await this.serial(async () => {
        if (this.cache?.dirty) return; // Editing during a fetch must never be replaced.
        if (!remote && this.cache && this.cache.revision > 0)
          throw new SyncConflict();
        if (remote && remote.revision !== this.cache?.revision) {
          this.cache = {
            ...this.cache!,
            document: remote.document,
            revision: remote.revision,
          };
          await this.write();
          this.documentChanged();
        }
      });
      this.report("synced", "Mit Supabase synchronisiert.");
    } catch {
      this.report(
        "error",
        "Cloud-Abruf fehlgeschlagen. Konto-Cache bleibt erhalten.",
      );
    } finally {
      this.syncing = false;
      this.report(this.status.state, this.status.message);
      if (this.cache?.dirty) void this.flush();
    }
  };
  mergeConflict = async () => {
    if (!this.cache?.conflict || !this.online())
      throw Error(
        "Für die Zusammenführung wird eine Internetverbindung benötigt.",
      );
    const remote = await this.remote.load();
    await this.serial(async () => {
      const local = this.cache!;
      const key = `conflict:${crypto.randomUUID()}`;
      const remoteDoc = remote?.document ?? emptyDocument();
      const document = mergeDocuments(remoteDoc, local.document, key);
      this.cache = {
        ...local,
        document,
        revision: remote?.revision ?? 0,
        dirty: true,
        conflict: false,
        generation: local.generation + 1,
        mutationId: crypto.randomUUID(),
        archiveKey: key,
        archive: JSON.parse(
          JSON.stringify({
            remote: remoteDoc,
            local: local.document,
            pendingArchive: local.archive,
          }),
        ),
      };
      await this.write();
      this.documentChanged();
      this.report(
        "pending",
        "Beide Stände zusammengeführt; Originale werden zusätzlich privat archiviert.",
      );
    });
    await this.flush();
  };
  importLegacy = async (raw: unknown, sourceKey: string) => {
    const dough = migrateLegacy(raw);
    return this.stageImport({ ...emptyDocument(), dough }, raw, sourceKey);
  };
  importBackup = async (raw: unknown, sourceKey: string) => {
    const value = raw as { format?: string; cache?: { document?: unknown } };
    if (value?.format === "ciao-backup-v1") {
      assertDocument(value.cache?.document);
      return this.stageImport(value.cache.document, raw, sourceKey);
    }
    return this.importLegacy(raw, sourceKey);
  };
  private stageImport = async (
    imported: CloudDocument,
    raw: unknown,
    sourceKey: string,
  ) => {
    await this.serial(async () => {
      if (!this.cache) throw Error("Konto-Cache fehlt.");
      if (this.cache.document.imports.includes(sourceKey)) return;
      const document = mergeDocuments(this.cache.document, imported, sourceKey);
      this.cache = {
        ...this.cache,
        document,
        dirty: true,
        generation: this.cache.generation + 1,
        mutationId: crypto.randomUUID(),
        archiveKey: sourceKey,
        archive: JSON.parse(
          JSON.stringify({
            source: "P1 IndexedDB",
            original: raw,
            pendingArchive: this.cache.archive,
          }),
        ),
      };
      await this.write();
      this.documentChanged();
      this.report(
        "pending",
        "Lokale Daten übernommen. Original bleibt erhalten; Cloud-Archiv wird angelegt.",
      );
    });
    await this.flush();
  };
  hasImport(key: string) {
    return this.cache?.document.imports.includes(key) ?? false;
  }
  start() {
    this.stopped = false;
  }
  view() {
    const version = this.viewVersion;
    return {
      load: this.load,
      save: (dough: DoughState) => this.save(dough, version),
    };
  }
  private documentChanged() {
    this.viewVersion += 1;
    this.onDocumentChange();
  }
  connectionChanged = () => {
    if (!this.online())
      this.report(
        "offline",
        "Offline · nur der Konto-Cache auf diesem Gerät ist verfügbar.",
      );
    else void this.retry().catch(() => {});
  };
  backup() {
    if (!this.cache) throw Error("Noch keine Daten geladen.");
    return {
      format: "ciao-backup-v1",
      userId: this.userId,
      exportedAt: new Date().toISOString(),
      cache: structuredClone(this.cache),
    };
  }
  stop() {
    this.stopped = true;
    this.listeners.clear();
  }
}
