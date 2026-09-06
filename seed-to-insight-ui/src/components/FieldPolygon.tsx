import { Polygon, Tooltip } from "react-leaflet";
import { HEALTH_COLORS } from "@/components/HealthLegend";
import { useI18n } from "@/contexts/I18nContext";
import type { HealthStatus } from "@/lib/farm-api";

/**
 * Defensively parse a stored `boundary_geojson` value into an array of
 * [lat, lng] positions. Accepts a raw Polygon geometry as well as
 * Feature / FeatureCollection wrappers (same tolerance as the backend's
 * GeoJSON validation). Returns null for anything missing, malformed, or
 * out of range so callers can fall back to a point marker instead of
 * rendering a broken shape.
 */
export function parseBoundaryPositions(boundary: unknown): [number, number][] | null {
  try {
    let geom: unknown = boundary;

    // Unwrap GeoJSON Feature / FeatureCollection if present.
    if (geom && typeof geom === "object") {
      const obj = geom as Record<string, unknown>;
      if (obj.type === "Feature" && obj.geometry) {
        geom = obj.geometry;
      } else if (
        obj.type === "FeatureCollection" &&
        Array.isArray(obj.features) &&
        obj.features.length > 0
      ) {
        geom = (obj.features[0] as Record<string, unknown>)?.geometry;
      }
    }

    if (!geom || typeof geom !== "object") return null;
    const g = geom as Record<string, unknown>;
    if (g.type !== "Polygon") return null;
    if (!Array.isArray(g.coordinates) || g.coordinates.length === 0) return null;

    const ring = g.coordinates[0]; // exterior ring only
    if (!Array.isArray(ring) || ring.length < 4) return null;

    const positions: [number, number][] = [];
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) return null;
      const lon = Number(pt[0]);
      const lat = Number(pt[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
      positions.push([lat, lon]);
    }
    return positions.length >= 3 ? positions : null;
  } catch {
    return null;
  }
}

interface FieldPolygonProps {
  positions: [number, number][];
  status: HealthStatus;
  name: string;
  crop?: string | null;
  onClick: () => void;
}

/** Clickable, status-colored field boundary with an identifying tooltip. */
const FieldPolygon = ({ positions, status, name, crop, onClick }: FieldPolygonProps) => {
  const { t } = useI18n();
  const color = HEALTH_COLORS[status] ?? HEALTH_COLORS.unassessed;
  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.3,
        weight: 2,
      }}
      eventHandlers={{ click: onClick }}
    >
      <Tooltip direction="top" opacity={1}>
        <span className="font-medium">{name}</span>
        {crop ? ` · ${crop}` : ""} · {t(`health.${status}`)}
      </Tooltip>
    </Polygon>
  );
};

export default FieldPolygon;
