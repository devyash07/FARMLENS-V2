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
      setError("Farm name is required.");
      return;
    }

    let parsedArea: number | null = null;
    if (area.trim() !== "") {
      parsedArea = Number(area);
      if (Number.isNaN(parsedArea) || parsedArea <= 0) {
        setError("Total area must be a positive number.");
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
            {mode === "create" ? "Add Farm" : "Edit Farm"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Register a new farm to start tracking its health."
              : "Update this farm's details."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="farm-name">Farm name *</Label>
            <Input
              id="farm-name"
              placeholder="e.g. Green Valley Farm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="farm-location">Location</Label>
            <Input
              id="farm-location"
              placeholder="e.g. Nashik, Maharashtra"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="farm-area">Total area (hectares)</Label>
            <Input
              id="farm-area"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 12.5"
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
            {mode === "create" ? "Create Farm" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FarmFormDialog;
