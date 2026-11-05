/** Infrastructure boundary. Future domain repositories depend on this port, never on React. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  update?<T>(key: string, change: (previous: T | undefined) => T): Promise<T>;
  remove(key: string): Promise<void>;
  /** Optional read-only snapshot, including legacy keys unknown to the current UI. */
  entries?(): Promise<Record<string, unknown>>;
}
