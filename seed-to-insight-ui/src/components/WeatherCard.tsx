import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { farmApi, WeatherRiskResult } from "@/lib/farm-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CloudRain, Sun, CloudSun, AlertTriangle, Info } from "lucide-react";

interface WeatherCardProps {
  lat: number | null;
  lon: number | null;
  disease: string | null;
}

/**
 * Weather-Aware Disease Risk card.
 * Shows environmental favorability for the latest observed disease.
 * Weather risk is an independent advisory signal. NOT a probability of disease.
 */
export function WeatherCard({ lat, lon, disease }: WeatherCardProps) {
  const { t } = useI18n();
  const [risk, setRisk] = useState<WeatherRiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lon || !disease) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    farmApi
      .getWeatherRisk(disease, lat, lon)
      .then((r) => { if (!cancelled) setRisk(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lon, disease]);

  if (!lat || !lon) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("weather.title")}
          </h3>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t("weather.no_coords")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("weather.title")}
          </h3>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("weather.title")}
          </h3>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t("weather.error")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!risk) return null;

  const levelIcon =
    risk.level === "high" ? (
      <CloudRain className="h-5 w-5 text-red-500" />
    ) : risk.level === "moderate" ? (
      <CloudSun className="h-5 w-5 text-amber-500" />
    ) : (
      <Sun className="h-5 w-5 text-green-500" />
    );

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("weather.title")}
          </h3>
          {levelIcon}
        </div>

        {!risk.available ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {risk.reason === "no_rule"
                ? t("weather.no_rule")
                : t("weather.unavailable")}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {t("weather.level_" + risk.level)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("weather.favorability")}
              </span>
            </div>

            {risk.advisory && (
              <div className="rounded-md border bg-muted/30 p-2 text-sm">
                {risk.advisory}
              </div>
            )}

            {risk.current && (
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>{t("weather.temp")}: {risk.current.temperature_c != null ? risk.current.temperature_c + "°C" : "—"}</div>
                <div>{t("weather.humidity")}: {risk.current.relative_humidity != null ? risk.current.relative_humidity + "%" : "—"}</div>
                <div>{t("weather.precip")}: {risk.current.precipitation_mm != null ? risk.current.precipitation_mm + " mm" : "—"}</div>
                <div>{t("weather.wind")}: {risk.current.wind_speed_kmh != null ? risk.current.wind_speed_kmh + " km/h" : "—"}</div>
              </div>
            )}

            {risk.forecast_summary && (
              <p className="text-xs text-muted-foreground">
                {t("weather.forecast")}: {risk.forecast_summary}
              </p>
            )}

            <p className="text-xs text-muted-foreground italic">
              {t("weather.disclaimer")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
