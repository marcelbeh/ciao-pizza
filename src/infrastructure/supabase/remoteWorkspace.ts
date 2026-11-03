import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertDocument,
  type CloudDocument,
  type Json,
} from "../../core/cloud/document";
export interface RemoteSnapshot {
  revision: number;
  document: CloudDocument;
}
export interface Commit {
  document: CloudDocument;
  revision: number;
  mutationId: string;
  archiveKey: string | null;
  archive: Json | null;
}
export interface RemoteWorkspace {
  load(): Promise<RemoteSnapshot | null>;
  commit(change: Commit): Promise<number>;
}
export class SyncConflict extends Error {}
export class InvalidCloudData extends Error {}
export function createRemoteWorkspace(
  client: SupabaseClient,
  userId: string,
): RemoteWorkspace {
  return {
    async load() {
      const { data, error } = await client
        .from("ciao_workspaces")
        .select("revision,document")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      try {
        assertDocument(data.document);
      } catch {
        throw new InvalidCloudData(
          "Cloud-Datenformat unbekannt oder beschädigt. Bitte die App aktualisieren; keine Daten überschreiben.",
        );
      }
      if (!Number.isSafeInteger(data.revision) || data.revision < 0)
        throw Error("Ungültige Cloud-Revision.");
      return { revision: data.revision, document: data.document };
    },
    async commit(change) {
      assertDocument(change.document);
      const { data, error } = await client.rpc("ciao_commit_workspace", {
        p_user_id: userId,
        p_document: change.document,
        p_expected_revision: change.revision,
        p_mutation_id: change.mutationId,
        p_archive_key: change.archiveKey,
        p_archive: change.archive,
      });
      if (error) {
        if (error.code === "40001")
          throw new SyncConflict("Ein anderer Stand liegt in der Cloud.");
        throw error;
      }
      if (!data || !Number.isSafeInteger(data.revision) || data.revision < 1)
        throw Error("Cloud hat die Speicherung nicht bestätigt.");
      return data.revision;
    },
  };
}
