import { assertBaking } from "../../core/baking/validation";
import { emptyBaking } from "../../core/baking/model";
import type { KeyValueStore } from "../../core/storage/KeyValueStore";
import {
  emptyWorkspace,
  type LocalWorkspace,
  type ShoppingList,
} from "../../core/planning/model";
import { assertState } from "../../core/dough/stateValidation";
import { assertRecipe, isOriginal } from "../../core/planning/recipes";
import { assertEvening } from "../../core/planning/calculations";
import { categories } from "../../core/planning/model";
import { migrateLegacy } from "../../core/cloud/document";
import { DOUGH_KEY } from "./doughRepository";
export const LOCAL_KEY = "ciao-workspace:v2";
export function assertShopping(list: ShoppingList) {
  if (
    !list ||
    typeof list.id !== "string" ||
    !list.id ||
    typeof list.name !== "string" ||
    !list.name.trim() ||
    !Array.isArray(list.items) ||
    list.items.length > 2000 ||
    !Number.isFinite(Date.parse(list.updatedAt)) ||
    !(list.eveningId === null || typeof list.eveningId === "string") ||
    !(
      list.sourceUpdatedAt === null ||
      Number.isFinite(Date.parse(list.sourceUpdatedAt))
    )
  )
    throw Error("Ungültige Einkaufsliste.");
  const ids = new Set<string>();
  for (const item of list.items) {
    if (
      !item ||
      typeof item.id !== "string" ||
      ids.has(item.id) ||
      !item.id ||
      typeof item.key !== "string" ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 100 ||
      !["g", "ml", "Stück"].includes(item.unit) ||
      !categories.includes(item.category) ||
      ![item.quantity, item.onHand].every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 1e9,
      ) ||
      !(
        item.generatedQuantity === null ||
        (Number.isFinite(item.generatedQuantity) && item.generatedQuantity >= 0)
      ) ||
      !["checked", "manual", "edited", "excluded", "sourceRemoved"].every(
        (k) => typeof item[k as keyof typeof item] === "boolean",
      )
    )
      throw Error("Ungültiger Einkaufsartikel.");
    ids.add(item.id);
  }
}
export function assertWorkspace(
  value: unknown,
): asserts value is LocalWorkspace {
  const w = value as LocalWorkspace;
  if (
    !w ||
    w.version !== 2 ||
    ![w.recipes, w.evenings, w.shopping, w.fermentations].every(
      Array.isArray,
    ) ||
    !w.settings ||
    typeof w.settings !== "object" ||
    Array.isArray(w.settings) ||
    !w.fermentations.every(
      (x) => x && typeof x === "object" && !Array.isArray(x),
    )
  )
    throw Error(
      "Unbekannte lokale Datenversion. Deine Daten werden nicht überschrieben.",
    );
  assertState(w.dough);
  if (w.baking !== undefined) assertBaking(w.baking);
  if (new TextEncoder().encode(JSON.stringify(w)).length > 50000000)
    throw Error(
      "Die Sicherung überschreitet 50 MB. Bitte Importarchive extern sichern und kleinere Sicherungen verwenden.",
    );
  for (const r of w.recipes) {
    assertRecipe(r);
    if (isOriginal(r.id) || r.id.startsWith("builtin:"))
      throw Error("Originalrezepte dürfen nicht überschrieben werden.");
  }
  w.evenings.forEach(assertEvening);
  w.shopping.forEach(assertShopping);
  for (const items of [w.recipes, w.evenings, w.shopping])
    if (new Set(items.map((i) => i.id)).size !== items.length)
      throw Error("Doppelte Datensatz-ID.");
}
/** A single atomic record prevents writes by one feature from erasing another feature. */
export class LocalRepository {
  private snapshot: LocalWorkspace | null = null;
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private doughBaseline = "";
  constructor(private store: KeyValueStore) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(w: LocalWorkspace) {
    this.snapshot = structuredClone(w);
    this.listeners.forEach((f) => f());
  }
  async load() {
    const saved = await this.store.get<unknown>(LOCAL_KEY);
    if (saved !== undefined) {
      assertWorkspace(saved);
      this.publish(saved);
      return saved;
    }
    const legacy = await this.store.get<unknown>(DOUGH_KEY);
    const initial = emptyWorkspace();
    if (legacy !== undefined) {
      initial.dough = migrateLegacy(legacy);
      initial.legacyOriginal = legacy;
    }
    return this.change((current) => current ?? initial, initial);
  }
  change(
    change: (w: LocalWorkspace) => LocalWorkspace,
    initial = emptyWorkspace(),
  ): Promise<LocalWorkspace> {
    const task = this.queue
      .catch(() => {})
      .then(async () => {
        const apply = (raw: LocalWorkspace | undefined) => {
          if (raw !== undefined) assertWorkspace(raw);
          const next = change(structuredClone(raw ?? initial));
          assertWorkspace(next);
          return next;
        };
        const next = this.store.update
          ? await this.store.update(LOCAL_KEY, apply)
          : apply(await this.store.get(LOCAL_KEY));
        if (!this.store.update) await this.store.set(LOCAL_KEY, next);
        this.publish(next);
        return next;
      });
    this.queue = task;
    return task;
  }
  doughRepository = {
    load: async () => {
      const w = this.snapshot ?? (await this.load());
      this.doughBaseline = JSON.stringify(w.dough);
      return structuredClone(w.dough);
    },
    save: async (dough: LocalWorkspace["dough"]) => {
      const baseline = this.doughBaseline;
      await this.change((w) => {
        if (JSON.stringify(w.dough) !== baseline)
          throw Error(
            "Der Teigplan wurde in einem anderen Tab geändert. Bitte vor weiteren Änderungen neu laden.",
          );
        w.dough = structuredClone(dough);
        return w;
      });
      this.doughBaseline = JSON.stringify(dough);
    },
  };
  /** Import adds independent copies; the current plan and existing records remain intact. */
  async importBackup(raw: unknown) {
    let incoming: LocalWorkspace;
    if ((raw as LocalWorkspace)?.version === 2) {
      assertWorkspace(raw);
      incoming = structuredClone(raw);
    } else {
      incoming = emptyWorkspace();
      incoming.dough = migrateLegacy(raw);
      incoming.legacyOriginal = raw;
    }
    await this.change((w) => {
      const idMap = new Map<string, string>();
      for (const e of incoming.evenings) {
        const id = crypto.randomUUID();
        idMap.set(e.id, id);
        w.evenings.push({ ...e, id });
      }
      for (const list of incoming.shopping)
        w.shopping.push({
          ...list,
          id: crypto.randomUUID(),
          eveningId: list.eveningId
            ? (idMap.get(list.eveningId) ?? null)
            : null,
        });
      for (const recipe of incoming.recipes)
        w.recipes.push({ ...recipe, id: crypto.randomUUID() });
      for (const profile of incoming.dough.profiles)
        w.dough.profiles.push({ ...profile, id: crypto.randomUUID() });
      if (incoming.dough.active)
        w.dough.profiles.push({
          id: crypto.randomUUID(),
          name: "Import · " + incoming.dough.active.name,
          plan: incoming.dough.active,
          updatedAt: new Date().toISOString(),
        });
      if (incoming.baking) {
        const current = w.baking ?? emptyBaking();
        const sessions = new Map<string, string>();
        for (const session of incoming.baking.sessions) {
          const id = crypto.randomUUID();
          sessions.set(session.id, id);
          current.sessions.push({
            ...session,
            id,
            revision: 1,
            sourceEveningId: session.sourceEveningId
              ? (idMap.get(session.sourceEveningId) ?? null)
              : null,
          });
        }
        for (const entry of incoming.baking.entries)
          current.entries.push({
            ...entry,
            id: crypto.randomUUID(),
            revision: 1,
            sourceEveningId: entry.sourceEveningId
              ? (idMap.get(entry.sourceEveningId) ?? null)
              : null,
            sourceSessionId: entry.sourceSessionId
              ? (sessions.get(entry.sourceSessionId) ?? null)
              : null,
            photos: entry.photos.map((photo) => ({
              ...photo,
              id: crypto.randomUUID(),
            })),
          });
        for (const diagnosis of incoming.baking.diagnoses)
          current.diagnoses.push({ ...diagnosis, id: crypto.randomUUID() });
        w.baking = current;
      }
      w.fermentations.push(...incoming.fermentations);
      w.settings = { ...incoming.settings, ...w.settings };
      // Full source preserves conflicting settings, unknown legacy fields and future sync payloads.
      const archives = Array.isArray(w.settings.importArchives)
        ? w.settings.importArchives
        : [];
      w.settings.importArchives = [...archives, raw];
      return w;
    });
  }
}
