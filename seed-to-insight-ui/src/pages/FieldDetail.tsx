import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { farmApi } from "@/lib/farm-api";
import type { FieldHealth, Observation } from "@/lib/farm-api";
import { FieldHealthBadge } from "@/components/FarmHealthSummary";
import { FieldObservationTimeline } from "@/components/FieldObservationTimeline";
import { DiseaseTrendCard } from "@/components/DiseaseTrendCard";
import { EarlyWarningCard } from "@/components/EarlyWarningCard";
import { WeatherCard } from "@/components/WeatherCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useI18n } from "@/contexts/I18nContext";
import {
  ArrowLeft,
  Camera,
  AlertCircle,
  Wheat,
} from "lucide-react";
import { formatDate } from "@/lib/farm-api";

/**
 * Field Detail — disease progression & early warning for a single field.
 */
const FieldDetail = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useI18n();

  const [field, setField] = useState<FieldHealth | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fieldId) {
      setError(t("field.not_found"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [obsRes, healthRes] = await Promise.allSettled([
        farmApi.getFieldObservations(fieldId),
        farmApi.getHealthMap(),
      ]);

      let obs: Observation[] = [];
      if (obsRes.status === "fulfilled") {
        obs = obsRes.value?.observations ?? [];
      }

      if (healthRes.status === "fulfilled") {
        let found: FieldHealth | undefined;
        for (const farm of healthRes.value.farms) {
          const f = (farm.fields ?? []).find((x) => x.id === fieldId);
          if (f) { found = f; break; }
        }
        setField(found ?? null);
      }

      if (obsRes.status === "rejected" && healthRes.status === "rejected") {
        setError(t("field.error_load_msg"));
      }
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("field.error_load_field"));
      setLoading(false);
    }
  }, [fieldId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-4 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !field) {
    return (
      <>
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-4">
            <Button variant="ghost" onClick={() => navigate("/my-farm")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> {t("field.back_to_farm")}
            </Button>
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("field.error_load_title")}</AlertTitle>
              <AlertDescription>{error ?? t("field.not_found")}</AlertDescription>
            </Alert>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const latestObs = observations[0] ?? null; // backend returns newest-first
  const confPct = (conf: number | null | undefined): string => {
    if (conf == null || Number.isNaN(Number(conf))) return "—";
    const n = Number(conf);
    return `${Math.round((n > 1 ? n / 100 : n) * 100)}%`;
  };
return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => navigate("/my-farm")}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> {t("nav.farm")}
              </Button>
              <h1 className="font-display text-2xl font-bold">{field.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {field.crop && (
                  <span className="flex items-center gap-1.5">
                    <Wheat className="h-4 w-4" /> {field.crop}
                  </span>
                )}
                <FieldHealthBadge status={field.health_status} />
              </div>
            </div>
            <Button onClick={() => navigate("/")}>
              <Camera className="mr-1.5 h-4 w-4" /> {t("field.scan_new")}
            </Button>
          </div>

          {/* Status / warning / latest observation */}
          <div className="grid gap-4 md:grid-cols-3">
            <DiseaseTrendCard observations={observations} />
            <EarlyWarningCard observations={observations} />
            <WeatherCard
              lat={field.latitude ?? null}
              lon={field.longitude ?? null}
              disease={latestObs?.disease ?? null}
            />
          </div>

          {/* Observation timeline */}
          <FieldObservationTimeline observations={observations} />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default FieldDetail;
