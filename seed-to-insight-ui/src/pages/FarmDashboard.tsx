import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sprout,
  Plus,
  Ruler,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Layers,
  RefreshCcw,
  Wheat,
  Map,
  Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FarmCard from "@/components/FarmCard";
import FarmFormDialog from "@/components/FarmFormDialog";
import FieldFormDialog from "@/components/FieldFormDialog";
import { FieldHealthBadge } from "@/components/FarmHealthSummary";
import HealthLegend from "@/components/HealthLegend";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  farmApi,
  formatHectares,
  type Farm,
  type Field,
  type FarmHealth,
  type FarmFormData,
  type FieldFormData,
  type HealthStatus,
} from "@/lib/farm-api";

interface FarmDialogState {
  open: boolean;
  mode: "create" | "edit";
  farm: Farm | null;
}

interface FieldDialogState {
  open: boolean;
  mode: "create" | "edit";
  field: Field | null;
}

// Lazy-loaded map chunk — keeps leaflet/react-leaflet out of the initial bundle.
const FarmHealthMap = lazy(() => import("@/components/FarmHealthMap"));

// Catches map chunk-load / runtime failures and renders a leaflet-free
// fallback. The field list below the map remains the always-available
// non-map representation of the same data.

const MapErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  return <MapErrorBoundaryImpl children={children} mapUnavailableText={t("farm.map_unavailable")} />;
};
class MapErrorBoundaryImpl extends Component<
  { children: ReactNode; mapUnavailableText: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert>
          <Map className="h-4 w-4" />
          <AlertTitle>{this.props.mapUnavailableText}</AlertTitle>
          <AlertDescription>
            The interactive map could not be loaded. All field details remain
            available in the list below.
          </AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}

const FarmDashboard = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Farms + health map
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [farmsError, setFarmsError] = useState("");
  const [health, setHealth] = useState<Record<string, FarmHealth>>({});

  // Selected farm + its fields
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState("");

  // Dialogs / mutations
  const [farmDialog, setFarmDialog] = useState<FarmDialogState>({ open: false, mode: "create", farm: null });
  const [farmSubmitting, setFarmSubmitting] = useState(false);
  const [farmDeleteTarget, setFarmDeleteTarget] = useState<Farm | null>(null);
  const [farmDeleting, setFarmDeleting] = useState(false);

  const [fieldDialog, setFieldDialog] = useState<FieldDialogState>({ open: false, mode: "create", field: null });
  const [fieldSubmitting, setFieldSubmitting] = useState(false);
  const [fieldDeleteTarget, setFieldDeleteTarget] = useState<Field | null>(null);
  const [fieldDeleting, setFieldDeleting] = useState(false);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) ?? null;

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------
  const loadFarms = useCallback(async () => {
    setFarmsLoading(true);
    setFarmsError("");
    try {
      // Farms are the source of truth; health-map failure degrades gracefully.
      const [farmsRes, healthRes] = await Promise.allSettled([farmApi.listFarms(), farmApi.getHealthMap()]);
      if (farmsRes.status === "rejected") throw farmsRes.reason;

      const nextFarms = farmsRes.value.farms;
      setFarms(nextFarms);

      if (healthRes.status === "fulfilled") {
        const map: Record<string, FarmHealth> = {};
        for (const f of healthRes.value.farms) map[f.id] = f;
        setHealth(map);
      } else {
        setHealth({});
      }

      // Keep the current selection valid; otherwise auto-select the first farm.
      setSelectedFarmId((prev) =>
        prev && nextFarms.some((f) => f.id === prev) ? prev : nextFarms[0]?.id ?? null
      );
    } catch (e) {
      setFarmsError(e instanceof Error ? e.message : "Failed to load farms.");
      setFarms([]);
      setHealth({});
      setSelectedFarmId(null);
    } finally {
      setFarmsLoading(false);
    }
  }, []);

  const loadFields = useCallback(async (farmId: string) => {
    setFieldsLoading(true);
    setFieldsError("");
    try {
      const res = await farmApi.listFields(farmId);
      setFields(res.fields);
    } catch (e) {
      setFieldsError(e instanceof Error ? e.message : "Failed to load fields.");
      setFields([]);
    } finally {
      setFieldsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) loadFarms();
  }, [isAuthenticated, loadFarms]);

  useEffect(() => {
    if (selectedFarmId) loadFields(selectedFarmId);
    else {
      setFields([]);
      setFieldsError("");
    }
  }, [selectedFarmId, loadFields]);

  if (!isAuthenticated) return null;

  // ------------------------------------------------------------------
  // Farm mutations
  // ------------------------------------------------------------------
  const handleFarmSubmit = async (data: FarmFormData) => {
    setFarmSubmitting(true);
    try {
      if (farmDialog.mode === "create") {
        const created = await farmApi.createFarm(data);
        toast({ title: "Farm created", description: `"${created.name}" has been added.` });
        setFarmDialog({ open: false, mode: "create", farm: null });
        await loadFarms();
        setSelectedFarmId(created.id);
      } else if (farmDialog.farm) {
        const updated = await farmApi.updateFarm(farmDialog.farm.id, data);
        toast({ title: "Farm updated", description: `"${updated.name}" has been saved.` });
        setFarmDialog({ open: false, mode: "edit", farm: null });
        await loadFarms();
      }
    } catch (e) {
      toast({
        title: "Could not save farm",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setFarmSubmitting(false);
    }
  };

  const handleFarmDelete = async () => {
    if (!farmDeleteTarget) return;
    setFarmDeleting(true);
    try {
      await farmApi.deleteFarm(farmDeleteTarget.id);
      toast({ title: "Farm deleted", description: `"${farmDeleteTarget.name}" has been removed.` });
      setFarmDeleteTarget(null);
      await loadFarms();
    } catch (e) {
      toast({
        title: "Could not delete farm",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setFarmDeleting(false);
    }
  };

  // ------------------------------------------------------------------
  // Field mutations
  // ------------------------------------------------------------------
  const handleFieldSubmit = async (data: FieldFormData) => {
    if (!selectedFarmId) return;
    setFieldSubmitting(true);
    try {
      if (fieldDialog.mode === "create") {
        const created = await farmApi.createField(selectedFarmId, data);
        toast({ title: "Field added", description: `"${created.name}" has been added to "${selectedFarm?.name}".` });
        setFieldDialog({ open: false, mode: "create", field: null });
        await Promise.all([loadFields(selectedFarmId), loadFarms()]);
      } else if (fieldDialog.field) {
        const updated = await farmApi.updateField(fieldDialog.field.id, data);
        toast({ title: "Field updated", description: `"${updated.name}" has been saved.` });
        setFieldDialog({ open: false, mode: "edit", field: null });
        await Promise.all([loadFields(selectedFarmId), loadFarms()]);
      }
    } catch (e) {
      toast({
        title: "Could not save field",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setFieldSubmitting(false);
    }
  };

  const handleFieldDelete = async () => {
    if (!fieldDeleteTarget || !selectedFarmId) return;
    setFieldDeleting(true);
    try {
      await farmApi.deleteField(fieldDeleteTarget.id);
      toast({ title: "Field deleted", description: `"${fieldDeleteTarget.name}" has been removed.` });
      setFieldDeleteTarget(null);
      await Promise.all([loadFields(selectedFarmId), loadFarms()]);
    } catch (e) {
      toast({
        title: "Could not delete field",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setFieldDeleting(false);
    }
  };

  // ------------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------------
  const totalFieldArea = fields.reduce((sum, f) => sum + (Number(f.area_hectares) || 0), 0);
  const farmHealth = selectedFarmId ? health[selectedFarmId] ?? null : null;
  // field_id → health_status for the map layer (backend-computed, latest
  // observation only — never severity).
  const fieldStatuses: Record<string, HealthStatus> = {};
  for (const fh of farmHealth?.fields ?? []) fieldStatuses[fh.id] = fh.health_status;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 pb-8 md:pb-12">
          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold flex items-center gap-2.5">
                <Sprout className="h-8 w-8 text-primary" />
                My Farm
              </h1>
              <p className="text-muted-foreground mt-1.5">
                {t("farm.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadFarms()} disabled={farmsLoading}>
                <RefreshCcw className={farmsLoading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
                {t("common.refresh")}
              </Button>
              <Button onClick={() => setFarmDialog({ open: true, mode: "create", farm: null })}>
                <Plus className="h-4 w-4 mr-2" />
                {t("farm.form.title_add")}
              </Button>
            </div>
          </motion.div>

          {/* Farms */}
          <section aria-label="Your farms">
            {farmsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-5 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : farmsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("farm.error_load_title")}</AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span>{farmsError}</span>
                  <Button variant="outline" size="sm" onClick={() => loadFarms()}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    {t("common.retry")}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : farms.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                  <Sprout className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <h3 className="font-display font-semibold text-lg">{t("farm.no_farms")}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-sm">
                    {t("farm.add_first_desc")}
                  </p>
                  <Button onClick={() => setFarmDialog({ open: true, mode: "create", farm: null })}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("farm.add_first")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {farms.map((farm) => (
                  <FarmCard
                    key={farm.id}
                    farm={farm}
                    health={health[farm.id] ?? null}
                    fieldCount={health[farm.id]?.fields.length}
                    selected={selectedFarmId === farm.id}
                    onSelect={() => setSelectedFarmId(farm.id)}
                    onEdit={() => setFarmDialog({ open: true, mode: "edit", farm })}
                    onDelete={() => setFarmDeleteTarget(farm)}
                    deleting={farmDeleting && farmDeleteTarget?.id === farm.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Farm create/edit dialog */}
          <FarmFormDialog
            open={farmDialog.open}
            mode={farmDialog.mode}
            farm={farmDialog.farm}
            submitting={farmSubmitting}
            onClose={() => setFarmDialog((s) => ({ ...s, open: false }))}
            onSubmit={handleFarmSubmit}
          />

          {/* Field create/edit dialog */}
          <FieldFormDialog
            open={fieldDialog.open}
            mode={fieldDialog.mode}
            field={fieldDialog.field}
            farmName={selectedFarm?.name ?? null}
            submitting={fieldSubmitting}
            onClose={() => setFieldDialog((s) => ({ ...s, open: false }))}
            onSubmit={handleFieldSubmit}
          />

          {/* Farm delete confirmation */}
          <AlertDialog
            open={farmDeleteTarget !== null}
            onOpenChange={(open) => !open && setFarmDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("farm.delete_title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("farm.delete_desc", {name: farmDeleteTarget?.name || ""})}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={farmDeleting}>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={farmDeleting}
                  onClick={handleFarmDelete}
                >
                  {farmDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("farm.delete_action")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Field delete confirmation */}
          <AlertDialog
            open={fieldDeleteTarget !== null}
            onOpenChange={(open) => !open && setFieldDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("field.delete_title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("field.delete_desc", {name: fieldDeleteTarget?.name || ""})}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={fieldDeleting}>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={fieldDeleting}
                  onClick={handleFieldDelete}
                >
                  {fieldDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("field.delete_action")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Fields of the selected farm */}
          <section aria-label="Fields" className="mt-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  {t("field.fields")}
                  {selectedFarm && (
                    <span className="text-base font-normal text-muted-foreground">
                      in "{selectedFarm.name}"
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedFarm
                    ? `${fields.length} ${fields.length === 1 ? "field" : "fields"} · ${formatHectares(totalFieldArea)} total`
                    : "Select a farm above to manage its fields."}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={!selectedFarm}
                onClick={() => setFieldDialog({ open: true, mode: "create", field: null })}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("field.add")}
              </Button>
            </div>

            {/* Farm Health Map — lazy-loaded leaflet chunk (Phase 3B).
                Clicking a field opens its existing edit dialog. */}
            {selectedFarm && fields.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-semibold">{t("farm.health_map")}</h3>
                  </div>
                  <MapErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex h-[380px] w-full items-center justify-center rounded-lg border border-border bg-muted/30">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      }
                    >
                      <FarmHealthMap
                        farm={selectedFarm}
                        fields={fields}
                        statuses={fieldStatuses}
                        onFieldClick={(field) =>
                          setFieldDialog({ open: true, mode: "edit", field })
                        }
                      />
                    </Suspense>
                  </MapErrorBoundary>
                  <HealthLegend />
                </CardContent>
              </Card>
            )}

            {!selectedFarm ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Select a farm to view and manage its fields.
                  </p>
                </CardContent>
              </Card>
            ) : fieldsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-5 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : fieldsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("field.error_load_title")}</AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span>{fieldsError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedFarmId && loadFields(selectedFarmId)}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    {t("common.retry")}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : fields.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <h3 className="font-display font-semibold">{t("field.no_fields")}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-sm">
                    {t("field.no_fields_desc", {name: selectedFarm?.name || ""})}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setFieldDialog({ open: true, mode: "create", field: null })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("field.add")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fields.map((field) => {
                  const fieldHealth = farmHealth?.fields.find((fh) => fh.id === field.id) ?? null;
                  return (
                    <Card key={field.id}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display font-semibold leading-tight">{field.name}</h3>
                          <FieldHealthBadge status={fieldHealth?.health_status ?? "unassessed"} />
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Wheat className="h-4 w-4 shrink-0 text-primary" />
                            {field.crop || t("field.no_crop")}
                          </p>
                          <p className="flex items-center gap-2">
                            <Ruler className="h-4 w-4 shrink-0 text-primary" />
                            {formatHectares(field.area_hectares)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/field/${field.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            {t("common.view")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFieldDialog({ open: true, mode: "edit", field })}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            {t("common.edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={fieldDeleting}
                            onClick={() => setFieldDeleteTarget(field)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            {t("common.delete")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FarmDashboard;
