import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  BellRing,
} from "lucide-react";
import type { Observation } from "@/lib/farm-api";

export type WarningCode =
  | "none"
  | "monitor_closely"
  | "disease_detected"
  | "persistent_disease_detected"
  | "new_disease_detected"
  | "no_recent_disease";

interface EarlyWarningCardProps {
  observations: Observation[];
  isLoading?: boolean;
}

/**
 * Early-warning card. Mirrors backend/services/disease_progression.py.
 * Driven ONLY by prediction class + confidence (uncertainty) + timestamps/history.
 * Severity is never used as a threshold.
 */
const WARNING_META: Record<
  Exclude<WarningCode, "none">,
  {
    title: string;
    message: string;
    icon: typeof AlertTriangle;
    variant: "default" | "destructive" | "outline" | "secondary";
    tone: "success" | "warning" | "error";
  }
> = {
  no_recent_disease: {
    title: "No recent disease detected",
    message: "The latest scan returned a healthy prediction.",
    icon: CheckCircle2,
    variant: "default",
    tone: "success",
  },
  monitor_closely: {
    title: "Model uncertainty is high",
    message:
      "The latest scan is infected but with low confidence. Consider another scan.",
    icon: Clock,
    variant: "secondary",
    tone: "warning",
  },
  disease_detected: {
    title: "Disease detected",
    message: "The latest scan detected a disease with high confidence.",
    icon: AlertTriangle,
    variant: "destructive",
    tone: "error",
  },
  persistent_disease_detected: {
    title: "Persistent disease detected",
    message:
      "The same disease has been detected repeatedlyin recent observations.",
    icon: RefreshCw,
    variant: "destructive",
    tone: "error",
  },
  new_disease_detected: {
    title: "New disease detected",
    message:
      "The latest scan changed from healthy to an infected prediction.",
    icon: Zap,
    variant: "destructive",
    tone: "error",
  },
};

const isHealthy = (disease: string | null | undefined) =>
  !disease || /healthy/i.test(disease) || disease.toLowerCase().includes("healthy");

export function computeFieldWarning(observations: Observation[]): {
  code: WarningCode;
  meta?: (typeof WARNING_META)[keyof typeof WARNING_META];
} {
  if (!observations || observations.length === 0) return { code: "none" };

  // chronological oldest -> newest
  const chronological = [...observations].reverse();
  const latest = chronological[chronological.length - 1];
  if (!latest) return { code: "none" };

  if (isHealthy(latest.disease)) {
    return { code: "no_recent_disease", meta: WARNING_META.no_recent_disease };
  }

  const confRaw = latest.confidence;
  const conf = typeof confRaw === "number" ? confRaw : NaN;
  const normalized = Number.isFinite(conf) ? (conf > 1 ? conf / 100 : conf) : 1;

  // Consecutive streak of the same (infected) disease ending at the latest obs.
  let streak = 0;
  for (let i = chronological.length - 1; i >= 0; i--) {
    const o = chronological[i];
    if (!o.disease || isHealthy(o.disease)) break;
    if (o.disease === latest.disease) streak++;
    else break;
  }

  const previous = chronological[chronological.length - 2];
  const prevHealthy = !previous || isHealthy(previous.disease);

  if (streak >= 2) {
    return {
      code: "persistent_disease_detected",
      meta: WARNING_META.persistent_disease_detected,
    };
  }
  if (normalized < 0.7) {
    return { code: "monitor_closely", meta: WARNING_META.monitor_closely };
  }
  if (prevHealthy) {
    return { code: "new_disease_detected", meta: WARNING_META.new_disease_detected };
  }
  return { code: "disease_detected", meta: WARNING_META.disease_detected };
}

/**
 * Early-warning card for a field, derived from its observation history.
 */
export const EarlyWarningCard = ({
  observations,
  isLoading,
}: EarlyWarningCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Early Warning</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { code, meta } = computeFieldWarning(observations);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          Early Warning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {code === "none" || !meta ? (
          <Alert>
            <BellRing className="h-4 w-4" />
            <AlertTitle>No scans yet</AlertTitle>
            <AlertDescription>
              No observations have been recorded for this field.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert
              variant={meta.tone === "error" ? "destructive" : "default"}
              className={
                meta.tone === "warning"
                  ? "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  : meta.tone === "success"
                  ? "border-green-300 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200"
                  : undefined
              }
            >
              <meta.icon className="h-4 w-4" />
              <AlertTitle>{meta.title}</AlertTitle>
              <AlertDescription>{meta.message}</AlertDescription>
            </Alert>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Based on the latest AI observation and history
              </span>
              <Badge variant={meta.variant}>{code.replace(/_/g, " ")}</Badge>
            </div>
          </>
        )}
        <p className="pt-1 text-xs text-muted-foreground">
          Status is based on the latest AI observation. It does not represent
          physical disease coverage.
        </p>
      </CardContent>
    </Card>
  );
};

export default EarlyWarningCard;