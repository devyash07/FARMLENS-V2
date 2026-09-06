/**
 * Phase 10 — Offline-first local persistence (IndexedDB).
 * ========================================================
 *
 * Stores, per authenticated user (records are ALWAYS partitioned by user_id):
 *   - pendingScans : offline scan queue (image Blob + metadata + sync state)
 *   - cachedApi    : last successful GET responses for farm/field/weather data
 *   - meta         : small key/value data (e.g. last-synced timestamps)
 *
 * Privacy & safety rules enforced here:
 *   - NO tokens, NO API keys, NO credentials are ever stored in this database.
 *     (Supabase Auth keeps its own session in its own storage.)
 *   - Image binaries live ONLY here (never in localStorage, never base64 in
 *     localStorage). The original Blob is dropped after successful sync.
 *   - A pending scan record never contains a disease prediction: fields like
 *     disease/confidence/severity are only introduced inside `analyze_result`
 *     AFTER the server has actually analyzed the image.
 *   - Every mutation notifies the UI via a window event so components can
 *     refresh pending counts without polling.
 */
import { API_CONFIG } from "@/lib/api-config";

const DB_NAME = "farmlens-offline";
const DB_VERSION = 1;
const STORE_SCANS = "pendingScans";
const STORE_CACHE = "cachedApi";
const STORE_META = "meta";

export const PENDING_CHANGED_EVENT = "farmlens-pending-changed";

/** Bounded offline storage (Phase 10 §28): no silent destruction — when the
 * limit is reached the caller must surface "Offline storage is full." */
export const MAX_PENDING_SCANS = 20;
export const MAX_OFFLINE_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export type PendingScanStatus = "pending" | "syncing" | "failed" | "synced";

export interface PendingScan {
  local_id: string;
  client_scan_id: string; // idempotency key sent to POST /history
  user_id: string;
  field_id: string | null;
  farm_id: string | null;
  field_name: string | null;
  crop: string | null;
  filename: string;
  image_blob: Blob | null; // original image; cleared after successful sync
  preview_dataurl: string; // small compressed preview for the pending list
  created_at: string;
  status: PendingScanStatus;
  retry_count: number;
  last_error: string | null;
  /** True when the server rejected the scan permanently (e.g. validation):
   * automatic retries stop; manual "Try again" is still possible. */
  permanent_failure: boolean;
  last_attempt_at: string | null;
  /** Server analysis payload — ONLY present after a successful /analyze call.
   * Its absence is the proof that no prediction exists yet. */
  analyze_result: Record<string, unknown> | null;
  history_id: string | null;
  synced_at: string | null;
}

function notifyPendingChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PENDING_CHANGED_EVENT));
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SCANS)) {
        const store = db.createObjectStore(STORE_SCANS, { keyPath: "local_id" });
        store.createIndex("by_user", "user_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        const store = db.createObjectStore(STORE_CACHE, { keyPath: "key" });
        store.createIndex("by_user", "user_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "k" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

// ---------------------------------------------------------------------------
// Local image validation (no backend, no classification — Phase 10 §29)
// ---------------------------------------------------------------------------
export function validateOfflineImage(file: { type?: string; size?: number }): string | null {
  if (file.type && !API_CONFIG.ACCEPTED_FORMATS.includes(file.type as never)) {
    return "Unsupported image format. Please use JPEG, PNG or WebP.";
  }
  if (typeof file.size === "number" && file.size > MAX_OFFLINE_IMAGE_BYTES) {
    return "Image is too large for offline storage (max 8 MB).";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pending scans (user-partitioned)
// ---------------------------------------------------------------------------
export async function savePendingScan(scan: PendingScan): Promise<void> {
  // Validate image before saving (Phase 10 §29)
  const validationError = validateOfflineImage({ type: scan.file_type, size: scan.file_size });
  if (validationError) {
    throw new Error(validationError);
  }

  const db = await openDb();
  const tx = db.transaction(STORE_SCANS, "readonly");
  const allReq = tx.objectStore(STORE_SCANS).index("by_user").getAll(scan.user_id);
  const existing: PendingScan[] = await new Promise((resolve, reject) => {
    allReq.onsuccess = () => resolve(allReq.result as PendingScan[]);
    allReq.onerror = () => reject(allReq.error);
  });
  // Bounded storage: refuse (never silently destroy) when full.
  const activeCount = existing.filter((s) => s.status !== "synced").length;
  if (activeCount >= MAX_PENDING_SCANS) {
    db.close();
    throw new Error("Offline storage is full. Sync or delete pending scans before adding another.");
  }

  const tx2 = db.transaction(STORE_SCANS, "readwrite");
  tx2.objectStore(STORE_SCANS).put(scan);
  await txDone(tx2);
  db.close();
  notifyPendingChanged();
}

export async function getPendingScans(userId: string): Promise<PendingScan[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_SCANS, "readonly");
  const req = tx.objectStore(STORE_SCANS).index("by_user").getAll(userId);
  const rows: PendingScan[] = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as PendingScan[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  // Oldest first (Phase 10 §39): sync processes in creation order.
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function countPendingScans(userId: string): Promise<number> {
  const scans = await getPendingScans(userId);
  return scans.filter((s) => s.status !== "synced").length;
}

export async function getPendingScan(userId: string, localId: string): Promise<PendingScan | null> {
  const scans = await getPendingScans(userId);
  return scans.find((s) => s.local_id === localId) ?? null;
}

export async function updatePendingScan(scan: PendingScan): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_SCANS, "readwrite");
  tx.objectStore(STORE_SCANS).put(scan);
  await txDone(tx);
  db.close();
  notifyPendingChanged();
}

/** Deletion is always an explicit user action (Phase 10 §17/§27). */
export async function deletePendingScan(userId: string, localId: string): Promise<void> {
  const existing = await getPendingScan(userId, localId);
  if (!existing) return; // never touch another user's record
  const db = await openDb();
  const tx = db.transaction(STORE_SCANS, "readwrite");
  tx.objectStore(STORE_SCANS).delete(localId);
  await txDone(tx);
  db.close();
  notifyPendingChanged();
}

/** Remove synced records (blob already dropped); keeps the queue tidy. */
export async function clearSyncedScans(userId: string): Promise<void> {
  const scans = await getPendingScans(userId);
  const synced = scans.filter((s) => s.status === "synced");
  if (synced.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(STORE_SCANS, "readwrite");
  synced.forEach((s) => tx.objectStore(STORE_SCANS).delete(s.local_id));
  await txDone(tx);
  db.close();
  notifyPendingChanged();
}
