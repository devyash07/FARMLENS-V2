/**
 * Phase 10 — Network status hook.
 * =================================
 *
 * Combines navigator.onLine with actual request-failure awareness.
 * navigator.onLine alone is not proof the backend is reachable, so the hook
 * also tracks the last-confirmed-online timestamp.
 */
import { useState, useEffect, useCallback } from "react";

export interface NetworkStatus {
  /** navigator.onLine — best-effort, may be wrong */
  isOnline: boolean;
  /** last time a server interaction succeeded (null = never confirmed) */
  lastOnlineAt: Date | null;
  /** true when we suspect the network is unreachable despite navigator.onLine */
  connectionFailed: boolean;
}

const NETWORK_CHANGED = "farmlens-network-changed";

let globalStatus: NetworkStatus = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  lastOnlineAt: null,
  connectionFailed: false,
};

const listeners = new Set<(s: NetworkStatus) => void>();

function emit(status: NetworkStatus) {
  globalStatus = status;
  listeners.forEach((l) => l(status));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NETWORK_CHANGED, { detail: status }));
  }
}

/** Called by the sync manager after a confirmed server round-trip. */
export function markServerReachable() {
  emit({
    ...globalStatus,
    isOnline: true,
    lastOnlineAt: new Date(),
    connectionFailed: false,
  });
}

/** Called by the sync manager when a request fails for network reasons. */
export function markServerUnreachable() {
  emit({
    ...globalStatus,
    isOnline: false,
    connectionFailed: true,
  });
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(globalStatus);

  useEffect(() => {
    listeners.add(setStatus);
    // Re-check on mount in case navigator.onLine changed during SSR/hydration
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    if (online !== globalStatus.isOnline) {
      emit({ ...globalStatus, isOnline: online });
    }
    return () => { listeners.delete(setStatus); };
  }, []);

  // Listen for native online/offline events
  useEffect(() => {
    const goOnline = () => emit({ ...globalStatus, isOnline: true, connectionFailed: false });
    const goOffline = () => emit({ ...globalStatus, isOnline: false, connectionFailed: false });

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return status;
}

/** One-shot check for non-React code. */
export function getNetworkStatus(): NetworkStatus {
  return globalStatus;
}
