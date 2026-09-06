import { MapPin, Ruler, Pencil, Trash2, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import FarmHealthSummary from "@/components/FarmHealthSummary";
import { formatHectares, type Farm, type FarmHealth } from "@/lib/farm-api";

interface FarmCardProps {
  farm: Farm;
  /** Health payload for this farm (from /api/health-map); null while loading/failed. */
  health?: FarmHealth | null;
  /** Number of fields (only rendered when health data is available). */
  fieldCount?: number;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

const FarmCard = ({
  farm,
  health,
  fieldCount,
  selected,
  onSelect,
  onEdit,
  onDelete,
  deleting,
}: FarmCardProps) => {
  const { t } = useI18n();
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
        selected && "border-primary/60 ring-2 ring-primary/20"
      )}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-lg truncate">{farm.name}</h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{farm.location || t("farm.location_not_set")}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                aria-label={t("farm.edit_aria", { name: farm.name })}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={deleting}
                aria-label={t("farm.delete_aria", { name: farm.name })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Ruler className="h-3.5 w-3.5" />
            {formatHectares(farm.total_area_hectares)}
          </span>
          {fieldCount !== undefined && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {fieldCount}{" "}
              {fieldCount === 1 ? t("farm.field_count_one") : t("farm.field_count_many")}
            </span>
          )}
        </div>

        <FarmHealthSummary health={health} />
      </CardContent>
    </Card>
  );
};

export default FarmCard;
