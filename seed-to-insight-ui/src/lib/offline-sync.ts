/**
 * Phase 10 — Offline sync manager.
 * =================================
 *
 * Responsibilities:
 *   - getPendingScans()          : list a user's pending scans (oldest first)
 *   - syncPendingScans()         : process the whole queue sequentially
 *   - syncOneScan()              : upload + analyze + mark-synced for one scan
 *   - retryFailedScan()          : manual retry of a failed scan
 *   - removeSyncedScan()         : explicit user deletion
 *   - getSyncStatus()            : summary counts
 *
 * The sync manager REUSES the existing /analyze endpoint — it does NOT create
 * a second analysis implementation. It processes scans oldest-first (Phase 10
 * §39) and never deletes a local scan until upload + analysis have both
 * succeeded (Phase 10 §40).
 */
import { supabase } from "@/contexts/AuthContext";
import { API_CONFIG } from "@/lib/api-config";
import {
  getPendingScans,
  updatePendingScan,
  deletePendingScan,
  type PendingScan,
} from "@/lib/offline-db";
import { markServerReachable, markServerUnreachable } from "@/hooks/useNetworkStatus";

export interface SyncStatus {
  pending: number;
  syncing: number;
  failed: number;
  synced: number;
}

export type SyncEvent =
  | { type: "sync-start" }
  | { type: "scan-start"; localId: string }
  | { type: "scan-success"; localId: string; historyId: string | null }
  | { type: "scan-failed"; localId: string; error: string }
  | { type: "sync-complete"; attempted: number; succeeded: number };

const SYNC_EVENT = "farmlens-sync-event";
const SYNC_RUNNING = "farmlens-sync-running";

let syncListeners: Array<(e: SyncEvent) => void> = [];
let isSyncing = false;

export function subscribeSync(listener: (e: SyncEvent) => void): () => void {
  syncListeners.push(listener);
  return () => { syncListeners = syncListeners.filter((l) => l !== listener); };
}

function emitSync(event: SyncEvent) {
  syncListeners.forEach((l) => l(event));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: event }));
  }
}

export function isSyncRunning(): boolean {
  if (typeof window !== "undefined") {
    return window.sessionStorage.getItem(SYNC_RUNNING) === "1";
  }
  return isSyncing;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Upload + analyze a single pending scan via the existing /analyze endpoint.
 * Returns the history_id on success. Phase 10 §40: if upload succeeds but
 * /analyze fails, the local scan is kept (not deleted) so retry doesn't duplicate.
 */
export async function uploadAndAnalyze(scan: PendingScan): Promise<string | null> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const form = new FormData();
  if (scan.image_blob) {
    form.append("file", scan.image_blob, scan.filename);
  } else {
    throw new Error("No image data available");
  }
  form.append("language", "en");
  if (scan.field_id) form.append("field_id", scan.field_id);
  form.append("client_scan_id", scan.client_scan_id);

  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ANALYZE}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    let detail = `Server returned ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch { /* non-JSON */ }
    throw new Error(detail);
  }

  const result = await res.json();
  return result?.history_id ?? result?.id ?? null;
}

/**
 * Sync all pending scans for the authenticated user, oldest first.
 * Sequential to avoid overloading the backend (Phase 10 §39).
 */
export async function syncPendingScans(): Promise<{ attempted: number; succeeded: number }> {
  if (isSyncing) return { attempted: 0, succeeded: 0 };
  isSyncing = true;
  if (typeof window !== "undefined") window.sessionStorage.setItem(SYNC_RUNNING, "1");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    isSyncing = false;
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SYNC_RUNNING);
    return { attempted: 0, succeeded: 0 };
  }

  try {
    emitSync({ type: "sync-start" });
    const scans = await getPendingScans(userId);
    const pending = scans.filter((s) => s.status === "pending" || s.status === "failed");

    let succeeded = 0;
    for (const scan of pending) {
      emitSync({ type: "scan-start", localId: scan.local_id });
      try {
        await updatePendingScan({ ...scan, status: "syncing" });
        const historyId = await uploadAndAnalyze(scan);

        // SUCCESS: drop the blob after sync (Phase 10 §16)
        await updatePendingScan({
          ...scan,
          status: "synced",
          history_id: historyId,
          synced_at: new Date().toISOString(),
          last_error: null,
          permanent_failure: false,
          image_blob: null,
        });

        emitSync({ type: "scan-success", localId: scan.local_id, historyId });
        markServerReachable();
        succeeded++;
      } catch (err: any) {
        const msg = err?.message || "Sync failed";
        const permanent =
          msg.toLowerCase().includes("auth") ||
          msg.toLowerCase().includes("not authenticated") ||
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("too large");

        await updatePendingScan({
          ...scan,
          status: "failed",
          retry_count: scan.retry_count + 1,
          last_error: msg,
          permanent_failure: permanent,
          last_attempt_at: new Date().toISOString(),
        });

        emitSync({ type: "scan-failed", localId: scan.local_id, error: msg });
        markServerUnreachable();
      }
    }

    emitSync({ type: "sync-complete", attempted: pending.length, succeeded });
    return { attempted: pending.length, succeeded };
  } finally {
    isSyncing = false;
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SYNC_RUNNING);
  }
}

/** Retry a single failed scan (manual "Try again" action). */
export async function retryFailedScan(localId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error("Not authenticated");

  const scans = await getPendingScans(userId);
  const scan = scans.find((s) => s.local_id === localId);
  if (!scan) throw new Error("Scan not found");
  if (scan.status !== "failed") throw new Error("Only failed scans can be retried");

  await updatePendingScan({ ...scan, status: "pending", permanent_failure: false });
  await syncPendingScans();
}

/** Delete a pending scan (explicit user action — Phase 10 §17/§27). */
export async function removeSyncedScan(localId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error("Not authenticated");
  await deletePendingScan(userId, localId);
}

/** Get sync status summary for the authenticated user. */
export async function getSyncStatus(): Promise<SyncStatus> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { pending: 0, syncing: 0, failed: 0, synced: 0 };

  const scans = await getPendingScans(userId);
  return {
    pending: scans.filter((s) => s.status === "pending").length,
    syncing: scans.filter((s) => s.status === "syncing").length,
    failed: scans.filter((s) => s.status === "failed").length,
    synced: scans.filter((s) => s.status === "synced").length,
  };
}
