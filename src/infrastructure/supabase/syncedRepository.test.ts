import { describe, expect, it, vi } from "vitest";
import { SyncedRepository, cacheKey } from "./syncedRepository";
import {
  InvalidCloudData,
  SyncConflict,
  type RemoteWorkspace,
  type RemoteSnapshot,
  type Commit,
} from "./remoteWorkspace";
import {
  emptyDocument,
  mergeDocuments,
  migrateLegacy,
} from "../../core/cloud/document";
import { createPlan } from "../../core/dough/model";
import { createIndexedDbStore } from "../storage/indexedDbStore";
function server() {
  let value: RemoteSnapshot | null = null;
  const receipts = new Map<string, number>();
  const archives = new Map<string, unknown>();
  const remote: RemoteWorkspace = {
    load: vi.fn(async () => (value ? structuredClone(value) : null)),
    commit: vi.fn(async (change: Commit) => {
      if (receipts.has(change.mutationId))
        return receipts.get(change.mutationId)!;
      if ((value?.revision ?? 0) !== change.revision) throw new SyncConflict();
      value = {
        revision: change.revision + 1,
        document: structuredClone(change.document),
      };
      receipts.set(change.mutationId, value.revision);
      if (change.archiveKey) archives.set(change.archiveKey, change.archive);
      return value.revision;
    }),
  };
  return { remote, archives, get: () => value };
}
const dough = (hydration = 60) => ({
  version: 1 as const,
  active: { ...createPlan(), hydration },
  profiles: [],
});
async function settled(repo: SyncedRepository) {
  await vi.waitFor(() => {
    expect(repo.getSnapshot().dirty).toBe(false);
    expect(repo.getSnapshot().state).toBe("synced");
  });
}
describe("safe cloud synchronization", () => {
  it("saves offline, restores after reload, then sends the latest snapshot", async () => {
    const store = createIndexedDbStore(crypto.randomUUID());
    const cloud = server();
    let online = true;
    const repo = new SyncedRepository(
      "alice",
      store,
      cloud.remote,
      () => online,
    );
    await repo.load();
    online = false;
    await repo.save(dough(66));
    await repo.save(dough(71));
    expect(cloud.remote.commit).not.toHaveBeenCalled();
    const reopened = new SyncedRepository(
      "alice",
      store,
      cloud.remote,
      () => online,
    );
    expect((await reopened.load()).active?.hydration).toBe(71);
    online = true;
    await reopened.flush();
    await settled(reopened);
    expect(cloud.get()?.document.dough.active?.hydration).toBe(71);
    const other = new SyncedRepository("bob", store, cloud.remote, () => false);
    await expect(other.load()).rejects.toThrow();
    expect(await store.get(cacheKey("alice"))).toBeDefined();
  });
  it("does not lose edits made while a cloud write is in flight", async () => {
    const store = createIndexedDbStore(crypto.randomUUID());
    const cloud = server();
    let release: (() => void) | undefined;
    const original = cloud.remote.commit;
    let first = true;
    cloud.remote.commit = vi.fn(async (c) => {
      if (first) {
        first = false;
        await new Promise<void>((r) => {
          release = r;
        });
      }
      return original(c);
    });
    const repo = new SyncedRepository("alice", store, cloud.remote, () => true);
    await repo.load();
    await repo.save(dough(62));
    await vi.waitFor(() => expect(release).toBeDefined());
    await repo.save(dough(73));
    release!();
    await settled(repo);
    expect(cloud.get()?.document.dough.active?.hydration).toBe(73);
    expect(cloud.get()?.revision).toBe(2);
  });
  it("handles a committed write with a lost response idempotently", async () => {
    const cloud = server();
    const original = cloud.remote.commit;
    let lose = true;
    cloud.remote.commit = vi.fn(async (c) => {
      const revision = await original(c);
      if (lose) {
        lose = false;
        throw Error("response lost");
      }
      return revision;
    });
    const repo = new SyncedRepository(
      "alice",
      createIndexedDbStore(crypto.randomUUID()),
      cloud.remote,
      () => true,
    );
    await repo.load();
    await repo.save(dough(65));
    await vi.waitFor(() => expect(repo.getSnapshot().state).toBe("error"));
    await repo.flush();
    await settled(repo);
    expect(cloud.get()?.revision).toBe(1);
  });
  it("stops on a concurrent cloud version and preserves both plans when explicitly merged", async () => {
    const cloud = server();
    const a = new SyncedRepository(
      "alice",
      createIndexedDbStore(crypto.randomUUID()),
      cloud.remote,
      () => true,
    );
    const b = new SyncedRepository(
      "alice",
      createIndexedDbStore(crypto.randomUUID()),
      cloud.remote,
      () => true,
    );
    await a.load();
    await b.load();
    await a.save(dough(62));
    await settled(a);
    await b.save(dough(70));
    await vi.waitFor(() => expect(b.getSnapshot().state).toBe("conflict"));
    expect(cloud.get()?.document.dough.active?.hydration).toBe(62);
    expect((await b.load()).active?.hydration).toBe(70);
    await b.mergeConflict();
    await settled(b);
    const saved = cloud.get()!.document.dough;
    expect(saved.active?.hydration).toBe(70);
    expect(saved.profiles.some((p) => p.plan.hydration === 62)).toBe(true);
    expect(cloud.archives.size).toBe(1);
  });
  it("imports once, keeps original local data, and archives unknown legacy fields", async () => {
    const store = createIndexedDbStore(crypto.randomUUID());
    const cloud = server();
    const raw = { ...dough(64), unknownFutureField: { preserve: true } };
    await store.set("dough-workspace:v1", raw);
    const repo = new SyncedRepository("alice", store, cloud.remote, () => true);
    await repo.load();
    await repo.importLegacy(raw, "legacy-hash");
    await settled(repo);
    await repo.importLegacy(raw, "legacy-hash");
    expect(cloud.get()?.revision).toBe(1);
    expect(cloud.archives.get("legacy-hash")).toMatchObject({
      original: { unknownFutureField: { preserve: true } },
    });
    expect(await store.get("dough-workspace:v1")).toEqual(raw);
  });
  it("preserves recipes and settings while saving a P1 dough edit", async () => {
    const cloud = server();
    const document = {
      ...emptyDocument(),
      recipes: [{ id: "recipe-1", title: "Tradizione" }],
      settings: { unit: "metric", nested: { value: 1 } },
    };
    await cloud.remote.commit({
      document,
      revision: 0,
      mutationId: crypto.randomUUID(),
      archiveKey: null,
      archive: null,
    });
    const repo = new SyncedRepository(
      "alice",
      createIndexedDbStore(crypto.randomUUID()),
      cloud.remote,
      () => true,
    );
    await repo.load();
    await repo.save(dough(68));
    await settled(repo);
    expect(cloud.get()?.document.recipes).toEqual(document.recipes);
    expect(cloud.get()?.document.settings).toEqual(document.settings);
  });
  it("rejects damaged caches without replacing them or uploading defaults", async () => {
    const store = createIndexedDbStore(crypto.randomUUID());
    await store.set(cacheKey("alice"), { version: 999 });
    const cloud = server();
    const repo = new SyncedRepository("alice", store, cloud.remote, () => true);
    await expect(repo.load()).rejects.toThrow();
    expect(await store.get(cacheKey("alice"))).toEqual({ version: 999 });
    expect(cloud.remote.commit).not.toHaveBeenCalled();
  });
  it("blocks uploads when a newer or damaged cloud format cannot be read", async () => {
    const store = createIndexedDbStore(crypto.randomUUID());
    const cloud = server();
    const a = new SyncedRepository("alice", store, cloud.remote, () => true);
    await a.load();
    await a.save(dough(63));
    await settled(a);
    cloud.remote.load = async () => {
      throw new InvalidCloudData("Unknown schema");
    };
    const b = new SyncedRepository("alice", store, cloud.remote, () => true);
    await b.load();
    const calls = (cloud.remote.commit as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await b.save(dough(70));
    await b.flush();
    expect(b.getSnapshot().state).toBe("conflict");
    expect(
      (cloud.remote.commit as ReturnType<typeof vi.fn>).mock.calls,
    ).toHaveLength(calls);
    expect(cloud.get()?.document.dough.active?.hydration).toBe(63);
  });
  it("does not replace edits started during a remote refresh", async () => {
    const cloud = server();
    const repo = new SyncedRepository(
      "alice",
      createIndexedDbStore(crypto.randomUUID()),
      cloud.remote,
      () => true,
    );
    await repo.load();
    let release: (() => void) | undefined;
    cloud.remote.load = async () => {
      await new Promise<void>((r) => {
        release = r;
      });
      return {
        revision: 9,
        document: { ...emptyDocument(), dough: dough(80) },
      };
    };
    const refresh = repo.retry();
    await vi.waitFor(() => expect(release).toBeDefined());
    await repo.save(dough(63));
    release!();
    await refresh;
    await settled(repo);
    expect(cloud.get()?.document.dough.active?.hydration).toBe(63);
  });
});
describe("lossless document migration", () => {
  it("does not let a stale editor overwrite a newly imported workspace", async () => {
    const cloud = server();
    const repo = new SyncedRepository(
      "alice",
      createIndexedDbStore(crypto.randomUUID()),
      cloud.remote,
      () => true,
    );
    await repo.load();
    const stale = repo.view();
    await repo.importLegacy(dough(72), "import");
    await settled(repo);
    await expect(stale.save(dough(60))).rejects.toThrow("Ansicht");
    expect(cloud.get()?.document.dough.active?.hydration).toBe(72);
  });
  it("restores a portable backup including recipe and settings records", async () => {
    const cloud = server();
    const repo = new SyncedRepository(
      "alice",
      createIndexedDbStore(crypto.randomUUID()),
      cloud.remote,
      () => true,
    );
    await repo.load();
    const document = {
      ...emptyDocument(),
      dough: dough(67),
      recipes: [{ id: "old", title: "Familie" }],
      settings: { language: "de" },
    };
    await repo.importBackup(
      { format: "ciao-backup-v1", cache: { document } },
      "file-sha",
    );
    await settled(repo);
    expect(cloud.get()?.document).toMatchObject({
      dough: { active: { hydration: 67 } },
      recipes: document.recipes,
      settings: document.settings,
    });
    expect(cloud.archives.size).toBe(1);
  });
  it("keeps colliding profile and recipe variants instead of silently overwriting", () => {
    const r = emptyDocument();
    r.dough = {
      ...dough(),
      profiles: [
        {
          id: "same",
          name: "A",
          plan: createPlan(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    r.recipes = [{ id: "same", title: "Remote" }];
    const l = structuredClone(r);
    l.dough.profiles[0].plan.hydration = 71;
    l.recipes[0].title = "Local";
    const merged = mergeDocuments(r, l, "merge");
    expect(merged.dough.profiles).toHaveLength(2);
    expect(merged.recipes).toHaveLength(2);
    expect(merged.imports).toContain("merge");
  });
  it("upgrades only the known missing mixMinutes field and rejects unrecognized versions", () => {
    const old = dough();
    delete (old.active as Partial<typeof old.active>).mixMinutes;
    expect(migrateLegacy(old).active?.mixMinutes).toBe(20);
    expect(old.active).not.toHaveProperty("mixMinutes");
    expect(() => migrateLegacy({ ...old, version: 999 })).toThrow();
  });
});
