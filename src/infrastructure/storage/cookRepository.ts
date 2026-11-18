import type { KeyValueStore } from '../../core/storage/KeyValueStore';
import { assertCookSession, type CookSession } from '../../core/dough/cookSession';
export const COOK_KEY = 'forno:tm5-session:v1';
export function createCookRepository(store: KeyValueStore) {
  return {
    async load(): Promise<{ cookSession: CookSession | null; cookError: string }> {
      try { const raw = await store.get(COOK_KEY); if (raw === undefined) return { cookSession: null, cookError: '' };
        assertCookSession(raw); return { cookSession: raw, cookError: '' };
      } catch { return { cookSession: null, cookError: 'Kochfortschritt nicht lesbar oder unbekannte Version. Er bleibt unverändert; bitte eine Sicherung herunterladen.' }; }
    },
    async save(next: CookSession, expected: CookSession | null) {
      assertCookSession(next);
      if (!store.update) throw Error('Atomarer Speicherzugriff nicht verfügbar.');
      return store.update<CookSession>(COOK_KEY, raw => {
        if (raw !== undefined) assertCookSession(raw);
        if (JSON.stringify(raw ?? null) !== JSON.stringify(expected)) throw Error('Kochfortschritt wurde inzwischen geändert. Bitte neu laden.');
        if (raw && raw.id === next.id && (raw.createdAt !== next.createdAt || JSON.stringify(raw.formula) !== JSON.stringify(next.formula) || raw.autolyseMinutes !== next.autolyseMinutes)) throw Error('Eine laufende Kochrezeptur darf nicht verändert werden.');
        return structuredClone(next);
      });
    },
  };
}
export type CookRepository = ReturnType<typeof createCookRepository>;
