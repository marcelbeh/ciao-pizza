import { describe, expect, it, vi } from "vitest";
import { createIndexedDbStore } from "./indexedDbStore";
describe("IndexedDB adapter", () => {
  it("commits structured values, reads across adapter instances and deletes", async () => {
    const name = `test-${crypto.randomUUID()}`;
    const store = createIndexedDbStore(name);
    expect(await store.get("missing")).toBeUndefined();
    await store.set("test", { version: 1, items: ["a", "b"] });
    expect(await createIndexedDbStore(name).get("test")).toEqual({
      version: 1,
      items: ["a", "b"],
    });
    await store.set("test", { version: 2 });
    expect(await store.get("test")).toEqual({ version: 2 });
    await store.remove("test");
    expect(await store.get("test")).toBeUndefined();
  });
  it("reports unavailable storage rather than pretending to save", async () => {
    const original = globalThis.indexedDB;
    vi.stubGlobal("indexedDB", undefined);
    const store = createIndexedDbStore(`test-${crypto.randomUUID()}`);
    await expect(store.set("key", "value")).rejects.toThrow("nicht verfügbar");
    vi.stubGlobal("indexedDB", original);
    await store.set("key", "retry");
    expect(await store.get("key")).toBe("retry");
  });
});
