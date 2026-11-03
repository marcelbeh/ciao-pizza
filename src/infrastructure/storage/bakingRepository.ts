import {
  emptyBaking,
  type CoachSession,
  type JournalEntry,
  type DiagnosisRecord,
} from "../../core/baking/model";
import type { LocalRepository } from "./localRepository";
export async function saveSession(
  repo: LocalRepository,
  session: CoachSession,
) {
  return save(repo, "sessions", session);
}
export async function saveEntry(repo: LocalRepository, entry: JournalEntry) {
  return save(repo, "entries", entry);
}
async function save<T extends CoachSession | JournalEntry>(
  repo: LocalRepository,
  kind: "entries" | "sessions",
  record: T,
): Promise<T> {
  const next = {
    ...structuredClone(record),
    revision: record.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  await repo.change((w) => {
    const b = w.baking ?? emptyBaking();
    const items = b[kind] as (CoachSession | JournalEntry)[];
    const previous = items.find((i) => i.id === record.id);
    if (
      (previous && previous.revision !== record.revision) ||
      (!previous && record.revision !== 0)
    )
      throw Error(
        "Dieser Datensatz wurde inzwischen geändert oder entfernt. Bitte neu öffnen; dein Entwurf bleibt sichtbar.",
      );
    w.baking = {
      ...b,
      [kind]: [...items.filter((i) => i.id !== record.id), next],
    };
    return w;
  });
  return next;
}
export async function removeBakingRecord(
  repo: LocalRepository,
  kind: "entries" | "sessions" | "diagnoses",
  id: string,
  revision?: number,
) {
  await repo.change((w) => {
    const b = w.baking ?? emptyBaking();
    if (kind === "diagnoses")
      w.baking = { ...b, diagnoses: b.diagnoses.filter((d) => d.id !== id) };
    else {
      const record = b[kind].find((d) => d.id === id);
      if (record && record.revision !== revision)
        throw Error("Datensatz inzwischen geändert. Bitte neu öffnen.");
      w.baking = { ...b, [kind]: b[kind].filter((d) => d.id !== id) };
    }
    return w;
  });
}
export async function saveDiagnosis(
  repo: LocalRepository,
  record: DiagnosisRecord,
) {
  await repo.change((w) => {
    const b = w.baking ?? emptyBaking();
    w.baking = { ...b, diagnoses: [...b.diagnoses, structuredClone(record)] };
    return w;
  });
}
