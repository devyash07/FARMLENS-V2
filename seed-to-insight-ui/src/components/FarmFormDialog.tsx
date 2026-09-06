import { useEffect, useState } from "react";
import { Loader2, Sprout } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import type { Farm, FarmFormData } from "@/lib/farm-api";

interface FarmFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  farm?: Farm | null;
  submitting?: boolean;
  onClose: () => void;
  /** Called with validated form data; the parent owns the async submission. */
  onSubmit: (data: FarmFormData) => void;
}

const FarmFormDialog = ({
  open,
  mode,
  farm,
  submitting,
  onClose,
  onSubmit,
}: FarmFormDialogProps) => {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState("");

  // Reset the form each time the dialog opens (create vs edit)
  useEffect(() => {
    if (open) {
      setName(farm?.name ?? "");
      setLocation(farm?.location ?? "");
      setArea(farm?.total_area_hectares != null ? String(farm.total_area_hectares) : "");
      setError("");
    }
  }, [open, farm]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("farm.form.name_required"));
      return;
    }

    let parsedArea: number | null = null;
    if (area.trim() !== "") {
      parsedArea = Number(area);
      if (Number.isNaN(parsedArea) || parsedArea <= 0) {
        setError(t("farm.form.area_positive"));
        return;
      }
    }

    onSubmit({
      name: trimmedName,
      location: location.trim() || null,
      total_area_hectares: parsedArea,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            {mode === "create" ? t("farm.form.title_add") : t("farm.form.title_edit")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? t("farm.form.desc_add")
              : t("farm.form.desc_edit")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="farm-name">{t("farm.form.name_label")} *</Label>
            <Input
              id="farm-name"
              placeholder={t("farm.form.name_placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="farm-location">{t("farm.form.location_label")}</Label>
            <Input
              id="farm-location"
              placeholder={t("farm.form.location_placeholder")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="farm-area">{t("farm.form.area_label")}</Label>
            <Input
              id="farm-area"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("farm.form.area_placeholder")}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? t("farm.form.submit_create") : t("common.save_changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FarmFormDialog;
