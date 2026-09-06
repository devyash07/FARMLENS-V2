import { HelpCircle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { HealthStatus } from "@/lib/farm-api";

/**
 * Exact fill/stroke colors used for field polygons on the Farm Health Map.
 * Shared with the map layer so the legend always matches what is drawn.
 * Statuses come exclusively from the backend's health_status (latest AI
 * observation) — never from severity.
 */
export const HEALTH_COLORS: Record<HealthStatus, string> = {
  unassessed: "#9ca3af", // gray
  healthy: "#22c55e", // green
  at_risk: "#eab308", // yellow
  diseased: "#ef4444", // red
};

const LEGEND_STATUSES: HealthStatus[] = ["healthy", "at_risk", "diseased", "unassessed"];

/**
 * Color key for the Farm Health Map (leaflet-free so it can render both next
 * to the lazy-loaded map and in the non-map fallback states).
 */
const HealthLegend = ({ className = "" }: { className?: string }) => {
  const { t } = useI18n();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {LEGEND_STATUSES.map((status) => (
          <span
            key={status}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full border border-white/60 shadow-sm"
              style={{ backgroundColor: HEALTH_COLORS[status] }}
            />
            {t(`health.${status}`)}
          </span>
        ))}
      </div>
      <p className="flex items-start gap-1 text-[11px] leading-snug text-muted-foreground/80 max-w-md">
        <HelpCircle className="h-3 w-3 mt-0.5 shrink-0" />
        {t("health.disclaimer")}
      </p>
    </div>
  );
};

export default HealthLegend;
