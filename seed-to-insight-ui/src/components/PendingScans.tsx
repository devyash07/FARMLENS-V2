/**
 * Phase 10 — Pending Scans UI.
 * =============================
 *
 * Shows the user's offline scan queue. Each item shows field, crop, capture
 * time, and status. Actions: Sync now, Retry, Delete.
 *
 * IMPORTANT (Phase 10 §22/§37): pending scans have NO disease prediction, so
 * this component NEVER displays disease/confidence/severity for them.
 */
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  getPendingScans,
  deletePendingScan,
  type PendingScan,
} from "@/lib/offline-db";
import { useAuth } from "@/contexts/AuthContext";
import {
  syncPendingScans,
  retryFailedScan,
  isSyncRunning,
  type SyncStatus,
} from "@/lib/offline-sync";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trash2, CloudOff, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function PendingScans() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [scans, setScans] = useState<PendingScan[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadScans = useCallback(async () => {
    if (!user?.userId) return;
    const rows = await getPendingScans(user.userId);
    setScans(rows.filter((s) => s.status !== "synced"));
  }, [user?.userId]);

  useEffect(() => { loadScans(); }, [loadScans]);

  // Auto-sync when coming back online (Phase 10 §13)
  useEffect(() => {
    if (isOnline && scans.some((s) => s.status === "pending")) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const handleSync = async () => {
    if (syncing || isSyncRunning()) return;
    setSyncing(true);
    try {
      await syncPendingScans();
      await loadScans();
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = async (localId: string) => {
    await retryFailedScan(localId);
    await loadScans();
  };

  const handleDelete = async (localId: string) => {
    if (!user?.userId) return;
    await deletePendingScan(user.userId, localId);
    await loadScans();
  };

  if (!user?.userId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CloudOff className="h-5 w-5" />
          {t("offline.pending_scans")}
          {scans.length > 0 && (
            <span className="text-sm text-muted-foreground">({scans.length})</span>
          )}
        </h2>
        {isOnline && scans.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            {t("offline.sync_now")}
          </Button>
        )}
      </div>

      {scans.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("offline.no_pending")}</p>
      )}

      <div className="space-y-2">
        {scans.map((scan) => (
          <div key={scan.local_id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center gap-3">
              {scan.preview_dataurl && (
                <img src={scan.preview_dataurl} alt="" className="w-10 h-10 rounded object-cover" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {scan.field_name || t("offline.unknown_field")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(scan.created_at).toLocaleString()}
                  {scan.crop ? ` · ${scan.crop}` : ""}
                </p>
                <StatusBadge status={scan.status} error={scan.last_error} t={t} />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {scan.status === "failed" && isOnline && (
                <Button size="sm" variant="ghost" onClick={() => handleRetry(scan.local_id)}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => handleDelete(scan.local_id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status, error, t }: { status: PendingScan["status"]; error: string | null; t: (k: string) => string }) {
  if (status === "pending") return <span className="flex items-center gap-1 text-xs text-amber-600"><Clock className="h-3 w-3" />{t("offline.status_pending")}</span>;
  if (status === "syncing") return <span className="flex items-center gap-1 text-xs text-blue-600"><Loader2 className="h-3 w-3 animate-spin" />{t("offline.status_syncing")}</span>;
  if (status === "failed") return <span className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{t("offline.status_failed")}{error ? ` — ${error}` : ""}</span>;
  if (status === "synced") return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" />{t("offline.status_synced")}</span>;
  return null;
}
