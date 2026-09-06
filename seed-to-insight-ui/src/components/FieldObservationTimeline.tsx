import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, Calendar, ImageIcon } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { Observation } from "@/lib/farm-api";
import { formatDate } from "@/lib/farm-api";

interface FieldObservationTimelineProps {
  observations: Observation[];
  /** newest-first already sorted on the backend */
  isLoading?: boolean;
}

/**
 * Categorical observation timeline (newest first).
 * Each row is a disease/healthy class — never a physical-coverage estimate.
 */
export const FieldObservationTimeline = ({
  observations,
  isLoading,
}: FieldObservationTimelineProps) => {
  const { t } = useI18n();
  const isHealthy = (disease: string) =>
    /healthy/i.test(disease) || disease.toLowerCase().includes("healthy");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("field.timeline.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!observations || observations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("field.timeline.title")}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("field.timeline.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("field.timeline.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {observations.map((obs) => {
          const healthy = isHealthy(obs.disease);
          const conf =
            obs.confidence != null ? Number(obs.confidence) : null;
          const confPct =
            conf != null && !Number.isNaN(conf)
              ? `${Math.round(conf * (conf > 1 ? 0.01 : 1))}%`
              : "—";

          return (
            <div
              key={obs.id}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              {obs.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={obs.image_url}
                  alt={obs.disease}
                  className="h-12 w-12 shrink-0 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge
                      variant={healthy ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {healthy ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {obs.disease || t("common.unknown")}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("field.timeline.confidence")}: {confPct}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(obs.created_at)}
                  </span>
                  {obs.severity != null && (
                    <span>
                      {t("field.timeline.severity")}: {obs.severity}
                    </span>
                  )}
                  {obs.crop && <span>{t("field.form.crop_label")}: {obs.crop}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default FieldObservationTimeline;
