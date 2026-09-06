import { useEffect, useState } from "react";
import { Loader2, Layers } from "lucide-react";
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
import type { Field, FieldFormData } from "@/lib/farm-api";

interface FieldFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  field?: Field | null;
  /** Name of the farm the field belongs to (used for helper copy). */
  farmName?: string | null;
  submitting?: boolean;
  onClose: () => void;
  /** Called with validated form data; the parent owns the async submission. */
  onSubmit: (data: FieldFormData) => void;
}

const FieldFormDialog = ({
  open,
  mode,
  field,
  farmName,
  submitting,
  onClose,
  onSubmit,
}: FieldFormDialogProps) => {
  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState("");

  // Reset the form each time the dialog opens (create vs edit)
  useEffect(() => {
    if (open) {
      setName(field?.name ?? "");
      setCrop(field?.crop ?? "");
      setArea(field?.area_hectares != null ? String(field.area_hectares) : "");
      setError("");
    }
  }, [open, field]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Field name is required.");
      return;
    }

    let parsedArea: number | null = null;
    if (area.trim() !== "") {
      parsedArea = Number(area);
      if (Number.isNaN(parsedArea) || parsedArea <= 0) {
        setError("Area must be a positive number.");
        return;
      }
    }

    onSubmit({
      name: trimmedName,
      crop: crop.trim() || null,
      area_hectares: parsedArea,
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
            <Layers className="h-5 w-5 text-primary" />
            {mode === "create" ? "Add Field" : "Edit Field"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? farmName
                ? `Add a field under “${farmName}”.`
                : "Add a field to this farm."
              : "Update this field's details."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="field-name">Field name *</Label>
            <Input
              id="field-name"
              placeholder="e.g. North Plot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="field-crop">Crop</Label>
            <Input
              id="field-crop"
              placeholder="e.g. Tomato"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="field-area">Area (hectares)</Label>
            <Input
              id="field-area"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 2.4"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Add Field" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FieldFormDialog;
