import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import FieldPolygon, { parseBoundaryPositions } from "@/components/FieldPolygon";
import { HEALTH_COLORS } from "@/components/HealthLegend";
import type { Farm, Field, HealthStatus } from "@/lib/farm-api";

/**
 * Farm Health Map (lazy-loaded chunk — keep every leaflet/react-leaflet
 * import inside this file so it stays out of the initial bundle).
 *
 * Renders the selected farm's fields on OpenStreetMap tiles:
 * - valid `boundary_geojson` → clickable status-colored polygon
 * - invalid/missing boundary but known lat/lng → status-colored point marker
 * - colors come ONLY from the backend's health_status (never severity)
 */

// Default view (center of India) when neither fields nor the farm have coordinates.
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

interface FarmHealthMapProps {
  farm: Farm;
  fields: Field[];
  /** field_id → backend-computed health_status (from GET /api/health-map). */
  statuses: Record<string, HealthStatus>;
  /** Opens the field's details via the dashboard's existing edit-dialog flow. */
  onFieldClick: (field: Field) => void;
}

const statusOf = (field: Field, statuses: Record<string, HealthStatus>): HealthStatus =>
  statuses[field.id] ?? "unassessed";

/** Fits the map view to every rendered field position whenever they change. */
function FitToFields({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length >= 2) {
      const lats = bounds.map((p) => p[0]);
      const lngs = bounds.map((p) => p[1]);
      map.fitBounds(
        [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ] as [[number, number], [number, number]],
        { padding: [28, 28] }
      );
    }
  }, [map, bounds]);
  return null;
}

const FarmHealthMap = ({ farm, fields, statuses, onFieldClick }: FarmHealthMapProps) => {
  // Resolve renderable geometry once per fields change.
  const { polygons, points, allPositions } = useMemo(() => {
    const polygons: { field: Field; positions: [number, number][] }[] = [];
    const points: { field: Field; center: [number, number] }[] = [];
    const allPositions: [number, number][] = [];

    for (const field of fields) {
      const positions = parseBoundaryPositions(field.boundary_geojson);
      if (positions) {
        polygons.push({ field, positions });
        allPositions.push(...positions);
      } else if (
        field.latitude !== null &&
        field.longitude !== null &&
        Number.isFinite(field.latitude) &&
        Number.isFinite(field.longitude) &&
        !(field.latitude === 0 && field.longitude === 0)
      ) {
        const center: [number, number] = [field.latitude, field.longitude];
        points.push({ field, center });
        allPositions.push(center);
      }
      // Fields with neither geometry nor coordinates are skipped gracefully —
      // they simply don't appear on the map (the list below still shows them).
    }
    return { polygons, points, allPositions };
  }, [fields]);

  const center = useMemo<[number, number]>(() => {
    if (allPositions.length > 0) {
      return allPositions[Math.floor(allPositions.length / 2)];
    }
    if (
      farm.latitude !== null &&
      farm.longitude !== null &&
      Number.isFinite(farm.latitude) &&
      Number.isFinite(farm.longitude)
    ) {
      return [farm.latitude, farm.longitude];
    }
    return DEFAULT_CENTER;
  }, [allPositions, farm]);

  const zoom = polygons.length > 0 ? 14 : points.length > 0 ? 15 : DEFAULT_ZOOM;
  const hasNothingToDraw = polygons.length === 0 && points.length === 0;

  return (
    <div className="space-y-2">
      {hasNothingToDraw && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          No field boundaries or coordinates saved yet — fields will appear on
          the map once they have geometry.
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-[380px] w-full rounded-lg border border-border z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToFields bounds={allPositions} />
        {polygons.map(({ field, positions }) => (
          <FieldPolygon
            key={field.id}
            positions={positions}
            status={statusOf(field, statuses)}
            name={field.name}
            crop={field.crop}
            onClick={() => onFieldClick(field)}
          />
        ))}
        {points.map(({ field, center: c }) => {
          const color = HEALTH_COLORS[statusOf(field, statuses)] ?? HEALTH_COLORS.unassessed;
          return (
            <CircleMarker
              key={field.id}
              center={c}
              radius={9}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 2 }}
              eventHandlers={{ click: () => onFieldClick(field) }}
            >
              <Tooltip direction="top" opacity={1}>
                <span className="font-medium">{field.name}</span>
                {field.crop ? ` · ${field.crop}` : ""}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default FarmHealthMap;
