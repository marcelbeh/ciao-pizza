import type { KeyValueStore } from "../../core/storage/KeyValueStore";
const STORE = "key-value";
/** Version 1 contains infrastructure only. Future schema changes need a versioned migration. */
export function createIndexedDbStore(name = "ciao-pizza"): KeyValueStore {
  let connection: Promise<IDBDatabase> | undefined;
  function open(): Promise<IDBDatabase> {
    if (!connection)
      connection = new Promise<IDBDatabase>((resolve, reject) => {
        if (!globalThis.indexedDB) {
          reject(new Error("IndexedDB ist nicht verfügbar."));
          return;
        }
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(STORE);
        };
        request.onerror = () =>
          reject(
            request.error ??
              new Error("Lokaler Speicher konnte nicht geöffnet werden."),
          );
        request.onblocked = () =>
          reject(
            new Error(
              "Speicheraktualisierung blockiert. Bitte weitere Ciao!-Tabs schließen.",
            ),
          );
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            connection = undefined;
          };
          resolve(db);
        };
      }).catch((error) => {
        connection = undefined;
        throw error;
      });
    return connection;
  }
  async function run<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result as T);
      transaction.onabort = () =>
        reject(
          transaction.error ??
            request.error ??
            new Error("Speichervorgang abgebrochen."),
        );
      transaction.onerror = () =>
        reject(
          transaction.error ??
            request.error ??
            new Error("Speichervorgang fehlgeschlagen."),
        );
    });
  }
  return {
    async update<T>(
      key: string,
      change: (previous: T | undefined) => T,
    ): Promise<T> {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        let next: T;
        let failure: unknown;
        const request = store.get(key);
        request.onsuccess = () => {
          try {
            next = change(request.result);
            store.put(next, key);
          } catch (error) {
            failure = error;
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve(next);
        tx.onabort = tx.onerror = () =>
          reject(failure ?? tx.error ?? new Error("Speichern fehlgeschlagen."));
      });
    },
    get: <T>(key: string) =>
      run<T | undefined>("readonly", (store) => store.get(key)),
    set: <T>(key: string, value: T) =>
      run<void>("readwrite", (store) => store.put(value, key)),
    remove: (key: string) =>
      run<void>("readwrite", (store) => store.delete(key)),
  };
}
