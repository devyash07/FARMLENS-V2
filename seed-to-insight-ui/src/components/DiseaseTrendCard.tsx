import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Info,
} from "lucide-react";
import type { Observation } from "@/lib/farm-api";

interface DiseaseTrendCardProps {
  observations: Observation[];
  isLoading?: boolean;
}

/**
 * Categorical disease trend — shows the latest status, confidence,
 * and any consecutive prediction changes. NEVER visualizes a percentage
 * or physical-coverage trend.
 */
export const DiseaseTrendCard = ({
    observations,
  isLoading,
}: DiseaseTrendCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disease Trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!observations || observations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disease Trend</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <Info className="mx-auto mb-2 h-5 w-5" />
          No trend data yet — scan a crop image to start observations.
        </CardContent>
      </Card>
    );
  }

  // Observations arrive newest-first; reverse to chronological for change detection.
  const chronological = [...observations].reverse();
  const latest = observations[0];
  const isHealthy =
    /healthy/i.test(latest.disease) ||
    latest.disease.toLowerCase().includes("healthy");

  // Detect consecutive prediction changes (chronological order).
  const changes: { from: string; to: string }[] = [];
  let prev = "";
  for (const obs of chronological) {
    const cur = obs.disease || "Unknown";
    if (prev && prev !== cur) {
      changes.push({ from: prev, to: cur });
    }
    prev = cur;
  }

  const conf =
    latest.confidence != null ? Number(latest.confidence) : null;
  const confPct =
    conf != null && !Number.isNaN(conf)
      ? `${Math.round(conf * (conf > 1 ? 0.01 : 1))}%`
      : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Disease Trend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">
              {isHealthy ? "Healthy" : latest.disease || "Unknown"}
            </span>
          </div>
          <Badge variant={isHealthy ? "default" : "destructive"}>
            confidence: {confPct}
          </Badge>
        </div>

        {/* Latest scan time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Latest: {latest.created_at ? new Date(latest.created_at).toLocaleString() : "—"}</span>
        </div>

        {/* Prediction changes (categorical, not a coverage trend) */}
        {changes.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Prediction changes
            </p>
            {changes.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm"
              >
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  Prediction changed from "{c.from}" to "{c.to}"
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>
              Consistent prediction across {observations.length} observation
              {observations.length > 1 ? "s" : ""}.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiseaseTrendCard;
