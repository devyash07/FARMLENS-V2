import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ShieldAlert, HelpCircle } from "lucide-react";
import type { FarmHealth, HealthStatus } from "@/lib/farm-api";

interface FarmHealthSummaryProps {
  /** Health payload for one farm from GET /api/health-map (may be missing). */
  health?: FarmHealth | null;
}

const STATUS_STYLES: Record<HealthStatus, { label: string; className: string }> = {
  healthy: {
    label: "Healthy",
    className: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
  },
  at_risk: {
    label: "At Risk",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  diseased: {
    label: "Diseased",
    className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  },
  unassessed: {
    label: "Unassessed",
    className: "border-border bg-secondary/50 text-muted-foreground",
  },
};

const STATUS_ORDER: HealthStatus[] = ["healthy", "at_risk", "diseased", "unassessed"];

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === "healthy") return <CheckCircle2 className="h-3 w-3 mr-1" />;
  if (status === "at_risk") return <AlertTriangle className="h-3 w-3 mr-1" />;
  if (status === "diseased") return <ShieldAlert className="h-3 w-3 mr-1" />;
  return <HelpCircle className="h-3 w-3 mr-1" />;
}

/**
 * Compact aggregate of a farm's field health statuses (from /api/health-map).
 * Statuses are derived by the backend from the latest observation per field only.
 */
const FarmHealthSummary = ({ health }: FarmHealthSummaryProps) => {
  const fields = health?.fields ?? [];

  if (fields.length === 0) {
    return (
      <Badge variant="outline" className={STATUS_STYLES.unassessed.className}>
        <HelpCircle className="h-3 w-3 mr-1" />
        No fields yet
      </Badge>
    );
  }

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: fields.filter((f) => f.health_status === status).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {counts.map(({ status, count }) => (
        <Badge key={status} variant="outline" className={STATUS_STYLES[status].className}>
          <StatusIcon status={status} />
          {count} {STATUS_STYLES[status].label.toLowerCase()}
        </Badge>
      ))}
    </div>
  );
};

/** Per-field health status badge (used inside field lists). */
export const FieldHealthBadge = ({ status }: { status: HealthStatus }) => {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.unassessed;
  return (
    <Badge variant="outline" className={style.className}>
      <StatusIcon status={status} />
      {style.label}
    </Badge>
  );
};

export default FarmHealthSummary;
