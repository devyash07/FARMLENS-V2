/**
 * Phase 10 — Network status indicator.
 * =====================================
 *
 * Small, non-intrusive indicator in the navbar. Shows online/offline state
 * with text + icon (not color alone — Phase 10 §43).
 */
import { useI18n } from "@/contexts/I18nContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Wifi, WifiOff } from "lucide-react";

export default function NetworkStatusIndicator() {
  const { t } = useI18n();
  const { isOnline } = useNetworkStatus();

  return (
    <div
      className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-secondary/60"
      aria-label={isOnline ? t("offline.online") : t("offline.offline")}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3 text-green-600" />
          <span className="hidden sm:inline">{t("offline.online")}</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-amber-600" />
          <span className="hidden sm:inline">{t("offline.offline")}</span>
        </>
      )}
    </div>
  );
}
