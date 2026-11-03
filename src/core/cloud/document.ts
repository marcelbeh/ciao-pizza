import type { DoughPlan, DoughState } from "../dough/model";
import { assertState } from "../dough/stateValidation";
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json | undefined };
/** Atomic aggregate keeps the existing P1 data model intact. Future modules use the same transaction. */
export interface CloudDocument {
  version: 1;
  dough: DoughState;
  recipes: ({ id: string } & Record<string, Json>)[];
  settings: Record<string, Json>;
  imports: string[];
}
export const emptyDocument = (): CloudDocument => ({
  version: 1,
  dough: { version: 1, active: null, profiles: [] },
  recipes: [],
  settings: {},
  imports: [],
});
export function assertDocument(value: unknown): asserts value is CloudDocument {
  if (!value || typeof value !== "object")
    throw Error("Ungültige Cloud-Daten.");
  const d = value as CloudDocument;
  if (
    d.version !== 1 ||
    !Array.isArray(d.recipes) ||
    !d.settings ||
    typeof d.settings !== "object" ||
    Array.isArray(d.settings) ||
    !Array.isArray(d.imports) ||
    !d.imports.every((s) => typeof s === "string")
  )
    throw Error("Unbekannte oder beschädigte Cloud-Daten.");
  assertState(d.dough);
  if (
    d.recipes.length > 1000 ||
    d.recipes.some((r) => !r || typeof r.id !== "string" || !r.id) ||
    new Set(d.recipes.map((r) => r.id)).size !== d.recipes.length
  )
    throw Error("Ungültige Rezeptdaten.");
  if (JSON.stringify(d).length > 1500000)
    throw Error(
      "Die Datenmenge überschreitet die sichere Synchronisierungsgröße. Bitte eine Sicherung herunterladen.",
    );
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
/** Preserve both variants on collision. The full originals additionally go into a server archive. */
export function mergeDocuments(
  remote: CloudDocument,
  local: CloudDocument,
  archiveKey: string,
): CloudDocument {
  assertDocument(remote);
  assertDocument(local);
  const merged = structuredClone(remote);
  for (const p of local.dough.profiles) {
    const existing = merged.dough.profiles.find((r) => r.id === p.id);
    if (!existing) merged.dough.profiles.push(structuredClone(p));
    else if (!equal(existing, p))
      merged.dough.profiles.push({
        ...structuredClone(p),
        id: crypto.randomUUID(),
        name: `${p.name.slice(0, 60)} · lokale Kopie`,
      });
  }
  const localActive = local.dough.active;
  const remoteActive = remote.dough.active;
  if (localActive) {
    if (
      remoteActive &&
      !equal(remoteActive, localActive) &&
      !merged.dough.profiles.some((p) => equal(p.plan, remoteActive))
    )
      merged.dough.profiles.push({
        id: crypto.randomUUID(),
        name: `${remoteActive.name.slice(0, 55)} · Cloud-Sicherung`,
        plan: structuredClone(remoteActive),
        updatedAt: new Date().toISOString(),
      });
    merged.dough.active = structuredClone(localActive);
  }
  for (const recipe of local.recipes) {
    const existing = merged.recipes.find((r) => r.id === recipe.id);
    if (!existing) merged.recipes.push(structuredClone(recipe));
    else if (!equal(existing, recipe))
      merged.recipes.push({
        ...structuredClone(recipe),
        id: crypto.randomUUID(),
      });
  }
  merged.settings = { ...remote.settings, ...local.settings };
  merged.imports = [
    ...new Set([...remote.imports, ...local.imports, archiveKey]),
  ];
  // Explicit failure instead of silently truncating the existing P1 profile limit.
  assertDocument(merged);
  return merged;
}
/** Earlier P1 drafts lacked mixMinutes. Preserve every other field verbatim. */
export function migrateLegacy(value: unknown): DoughState {
  const copy = structuredClone(value) as DoughState;
  function upgrade(plan: DoughPlan | null) {
    if (plan && plan.version === 1 && !Object.hasOwn(plan, "mixMinutes"))
      plan.mixMinutes = 20;
  }
  if (copy && typeof copy === "object") {
    upgrade(copy.active);
    if (Array.isArray(copy.profiles))
      copy.profiles.forEach((profile) => upgrade(profile?.plan));
  }
  assertState(copy);
  return copy;
}
