import { describe, it, expect } from "vitest";
import { LocalRepository, LOCAL_KEY } from "./localRepository";
import { createIndexedDbStore } from "./indexedDbStore";
import { saveEntry, saveSession, saveDiagnosis } from "./bakingRepository";
import { newEntry } from "../../core/baking/journal";
import { newSession } from "../../core/baking/coach";
import { newEvening } from "../../core/planning/calculations";
import { emptyObservations, type Photo } from "../../core/baking/model";
import { diagnose } from "../../core/baking/diagnosis";
import { createPlan } from "../../core/dough/model";
import { preparePhoto } from "./photos";
const photo = (): Photo => ({
  id: crypto.randomUUID(),
  dataUrl: "data:image/jpeg;base64,/9j/2Q==",
  bytes: 4,
  width: 1,
  height: 1,
  caption: "Testfoto",
});
const setup = () => {
  const store = createIndexedDbStore("p4-" + crypto.randomUUID());
  return { store, repo: new LocalRepository(store) };
};
describe("additive local P4 storage", () => {
  it("keeps an existing P3 document unchanged when opening it", async () => {
    const { store, repo } = setup();
    const w = await repo.load();
    w.evenings = [newEvening()];
    w.settings = { test: "unchanged" };
    await store.set(LOCAL_KEY, w);
    const reloaded = await new LocalRepository(store).load();
    expect(reloaded).toEqual(w);
    expect(await store.get(LOCAL_KEY)).toEqual(w);
    expect(reloaded.baking).toBeUndefined();
  });
  it("persists journal photos, actuals and running timers across instances without changing P3 data", async () => {
    const { store, repo } = setup();
    await repo.load();
    const evening = newEvening();
    await repo.change((w) => ({ ...w, evenings: [evening] }));
    const entry = newEntry(undefined, evening);
    entry.photos = [photo()];
    entry.actual.doughC = 23;
    const saved = await saveEntry(repo, entry);
    const session = newSession(undefined, evening);
    session.timer.startedAt = Date.now();
    await saveSession(repo, session);
    const w = await new LocalRepository(store).load();
    expect(w.evenings).toEqual([evening]);
    expect(w.baking!.entries).toEqual([saved]);
    expect(w.baking!.entries[0].photos[0].dataUrl).toBe(
      entry.photos[0].dataUrl,
    );
    expect(w.baking!.sessions[0].timer.startedAt).toBe(session.timer.startedAt);
  });
  it("serializes independent P3/P4 edits and rejects stale journal/session edits", async () => {
    const { store, repo } = setup();
    await repo.load();
    const other = new LocalRepository(store);
    await other.load();
    const saved = await saveEntry(repo, newEntry());
    await Promise.all([
      saveEntry(repo, { ...saved, notes: "new" }),
      other.change((w) => ({ ...w, settings: { device: "iphone" } })),
    ]);
    await expect(saveEntry(other, saved)).rejects.toThrow(
      "inzwischen geändert",
    );
    const w = await new LocalRepository(store).load();
    expect(w.settings.device).toBe("iphone");
    expect(w.baking!.entries[0].notes).toBe("new");
    const session = await saveSession(repo, newSession());
    await saveSession(repo, { ...session, name: "neu" });
    await expect(saveSession(other, session)).rejects.toThrow(
      "inzwischen geändert",
    );
  });
  it("imports photos, diagnoses and source links additively and keeps originals", async () => {
    const { store, repo } = setup();
    await repo.load();
    const evening = newEvening();
    await repo.change((w) => ({ ...w, evenings: [evening] }));
    const session = await saveSession(repo, newSession(undefined, evening));
    const entry = newEntry(undefined, evening, session);
    entry.photos = [photo()];
    await saveEntry(repo, entry);
    const input = {
      problem: "sticky" as const,
      plan: createPlan(),
      actual: emptyObservations(),
      temperature: "unknown" as const,
      rest: "unknown" as const,
      rise: "unknown" as const,
      browning: "both" as const,
    };
    await saveDiagnosis(repo, {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      input,
      result: diagnose(input),
    });
    const backup = structuredClone(repo.getSnapshot()!);
    await repo.importBackup(backup);
    const w = await new LocalRepository(store).load();
    expect(w.baking!.entries).toHaveLength(2);
    expect(w.baking!.diagnoses).toHaveLength(2);
    expect(w.baking!.entries[1].sourceSessionId).toBe(w.baking!.sessions[1].id);
    expect(w.baking!.entries[1].sourceEveningId).toBe(w.evenings[1].id);
    expect(w.baking!.entries[1].photos[0].dataUrl).toBe(
      entry.photos[0].dataUrl,
    );
    expect(w.baking!.entries[1].photos[0].id).not.toBe(entry.photos[0].id);
    expect(w.settings.importArchives).toEqual([backup]);
  });
  it("aborts photo limits or invalid records atomically, retaining the original document", async () => {
    const { store, repo } = setup();
    const original = await repo.load();
    const entry = newEntry();
    entry.photos = [photo(), photo(), photo(), photo()];
    await expect(saveEntry(repo, entry)).rejects.toThrow();
    expect(await store.get(LOCAL_KEY)).toEqual(original);
    await expect(
      repo.change((w) => ({
        ...w,
        baking: {
          version: 1,
          entries: Array.from({ length: 21 }, () => ({
            ...newEntry(),
            photos: [photo()],
          })),
          sessions: [],
          diagnoses: [],
        },
      })),
    ).rejects.toThrow("Fotolimit");
    expect(await store.get(LOCAL_KEY)).toEqual(original);
    entry.photos = [
      { ...photo(), dataUrl: "data:image/svg+xml;base64,PHN2Zz4=" },
    ];
    await expect(saveEntry(repo, entry)).rejects.toThrow("Foto");
    expect(await store.get(LOCAL_KEY)).toEqual(original);
  });
  it("handles storage quota failure without publishing an unsaved journal entry", async () => {
    const { repo } = setup();
    await repo.load();
    const snapshot = structuredClone(repo.getSnapshot());
    const failing = new LocalRepository({
      get: async <T>() => snapshot as T,
      set: async () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
      remove: async () => {},
    });
    await failing.load();
    await expect(saveEntry(failing, newEntry())).rejects.toThrow("quota");
    expect(failing.getSnapshot()).toEqual(snapshot);
  });
  it("rejects HEIC and oversized originals before any browser decoding", async () => {
    await expect(
      preparePhoto({ type: "image/heic", size: 10 } as File),
    ).rejects.toThrow("HEIC");
    await expect(
      preparePhoto({ type: "image/jpeg", size: 10000001 } as File),
    ).rejects.toThrow("10 MB");
  });
});
