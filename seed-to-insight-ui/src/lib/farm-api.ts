/**
 * Farm Digital Twin — typed API client for farm / field / health-map endpoints.
 *
 * Uses the existing Supabase session (AuthContext) for the Bearer token and the
 * centralized API_CONFIG base URL. Shapes mirror backend/routes/farm.py,
 * backend/routes/field.py and backend/routes/health_map.py.
 */

import { supabase } from "@/contexts/AuthContext";
import { API_CONFIG } from "@/lib/api-config";

// ---------------------------------------------------------------------------
// Types (mirror backend Pydantic models / Supabase rows)
// ---------------------------------------------------------------------------
export interface Farm {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  total_area_hectares: number | null;
  user_id: string;
  created_at: string;
}

export interface Field {
  id: string;
  farm_id: string;
  name: string;
  crop: string | null;
  area_hectares: number | null;
  boundary_geojson: unknown;
  latitude: number | null;
  longitude: number | null;
  user_id: string;
  created_at: string;
}

/** V1 health status computed by the backend from the latest observation only. */
export type HealthStatus = "healthy" | "at_risk" | "diseased" | "unassessed";

export interface FieldHealth {
  id: string;
  name: string;
  crop: string | null;
  latitude: number | null;
  longitude: number | null;
  boundary_geojson: unknown;
  health_status: HealthStatus;
  latest_observation: Record<string, unknown> | null;
}

export interface FarmHealth {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  fields: FieldHealth[];
}

export interface FarmFormData {
  name: string;
  location: string | null;
  total_area_hectares: number | null;
}

export interface FieldFormData {
  name: string;
  crop: string | null;
  area_hectares: number | null;
  latitude: number | null;
  longitude: number | null;
}

/** A single crop-scan observation (a row from the `history` table). */
export interface Observation {
  id: string;
  crop?: string | null;
  disease: string;
  severity?: number | null;
  confidence: number | null;
  image_url?: string | null;
  heatmap_url?: string | null;
  created_at: string;
  field_id?: string | null;
}

// ---------------------------------------------------------------------------
// Weather-Aware Disease Risk types (Phase 7)
// ---------------------------------------------------------------------------
export interface WeatherRiskResult {
  available: boolean;
  reason: string | null;
  disease_key: string | null;
  score: number | null;
  level: "low" | "moderate" | "high" | null;
  advisory: string | null;
  current: {
    temperature_c: number | null;
    relative_humidity: number | null;
    precipitation_mm: number | null;
    wind_speed_kmh: number | null;
  } | null;
  forecast_favorable: boolean | null;
  forecast_summary: string | null;
  provider?: string;
  retrieved_at?: string;
}

export interface CurrentWeather {
  provider: string;
  retrieved_at: string;
  current: {
    temperature_c: number | null;
    relative_humidity: number | null;
    precipitation_mm: number | null;
    wind_speed_kmh: number | null;
  };
  forecast: Array<{
    temperature_c: number | null;
    relative_humidity: number | null;
    precipitation_mm: number | null;
  }>;
}

// ---------------------------------------------------------------------------
// FARMLENS AI Agent (Phase 8)
// ---------------------------------------------------------------------------
export interface AgentChatRequest {
  message: string;
  field_id?: string | null;
  history?: Array<{ role: string; content: string }>;
}

export interface AgentChatResponse {
  response: string;
  intent: string;
  context_used: string[];
  field_id?: string | null;
  sources: string[];
  weather_available?: boolean | null;
}

export const AGENT_QUICK_ACTIONS: Array<{ key: string; message: string }> = [
  { key: "agent.quick.farm", message: "How is my farm doing?" },
  { key: "agent.quick.field", message: "What is happening with this field?" },
  { key: "agent.quick.progression", message: "Is the disease getting worse?" },
  { key: "agent.quick.weather", message: "What is the weather risk?" },
  { key: "agent.quick.action", message: "What should I do?" },
];

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------
async function getAccessToken(): Promise<string | null> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session.access_token;
  }
  // Fallback path used by AuthContext when Supabase env vars are absent
  return localStorage.getItem("farmlens_token");
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("You are signed out. Please log in again.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true",
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_CONFIG.BASE_URL.replace(/\/$/, "")}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // Non-JSON error body — keep the generic message
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// API surface (matches Phase 2 backend routes)
// ---------------------------------------------------------------------------
export const farmApi = {
  listFarms: () => apiRequest<{ farms: Farm[] }>("/api/farms"),

  createFarm: (data: FarmFormData) =>
    apiRequest<Farm>("/api/farms", { method: "POST", body: JSON.stringify(data) }),

  updateFarm: (farmId: string, data: Partial<FarmFormData>) =>
    apiRequest<Farm>(`/api/farms/${farmId}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteFarm: (farmId: string) =>
    apiRequest<void>(`/api/farms/${farmId}`, { method: "DELETE" }),

  listFields: (farmId: string) =>
    apiRequest<{ fields: Field[] }>(`/api/farms/${farmId}/fields`),

  createField: (farmId: string, data: FieldFormData) =>
    apiRequest<Field>(`/api/farms/${farmId}/fields`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateField: (fieldId: string, data: Partial<FieldFormData>) =>
    apiRequest<Field>(`/api/fields/${fieldId}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteField: (fieldId: string) =>
    apiRequest<void>(`/api/fields/${fieldId}`, { method: "DELETE" }),

    getHealthMap: () => apiRequest<{ farms: FarmHealth[] }>("/api/health-map"),

  // Field observations (history rows tied to a field), newest-first from backend.
  getFieldObservations: (fieldId: string) =>
    apiRequest<{ observations: Observation[] }>(`/api/fields/${fieldId}/observations`),

  // ---------------------------------------------------------------------------
  // Weather-Aware Disease Risk (Phase 7)
  // ---------------------------------------------------------------------------
  getWeatherRisk: (disease: string, lat: number, lon: number) =>
    apiRequest<WeatherRiskResult>(
      `/api/weather/risk?disease=${encodeURIComponent(disease)}&lat=${lat}&lon=${lon}`
    ),

  getCurrentWeather: (lat: number, lon: number) =>
    apiRequest<CurrentWeather>(`/api/weather/current?lat=${lat}&lon=${lon}`),

  getSupportedDiseases: () =>
    apiRequest<{ diseases: string[] }>("/api/weather/supported-diseases"),

  // ---------------------------------------------------------------------------
  // FARMLENS AI Agent (Phase 8)
  // ---------------------------------------------------------------------------
  agentChat: (data: AgentChatRequest) =>
    apiRequest<AgentChatResponse>("/api/agent/chat", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---------------------------------------------------------------------------
// Formatting helpers shared by farm components
// ---------------------------------------------------------------------------
export function formatHectares(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${n % 1 === 0 ? n : n.toFixed(2)} ha`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}
