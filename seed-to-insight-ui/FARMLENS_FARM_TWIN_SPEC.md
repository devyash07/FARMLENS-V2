# FARMLENS V2 — FARM DIGITAL TWIN / FARM HEALTH MAP

## 1. Objective
Transform FARMLENS from a single-image disease detection system into a field-aware farm monitoring system.

Current: Image → Disease prediction

Target: Farm → Field → Observations → Health Map

Extend the existing FARMLENS application without unnecessarily rewriting the existing ML, authentication, history, or UI systems.

## 2. Current System Foundation
- Frontend: React 18 + Vite + TypeScript
- UI: Tailwind CSS, shadcn/ui, Framer Motion
- Data fetching: TanStack Query
- Routing: React Router v6
- Backend: FastAPI + Python 3.12+
- Database/Auth: Supabase PostgreSQL + Supabase Auth
- Storage: Supabase Storage
- ML: EfficientNet-B0, 66 classes
- Explainability: GradCAM+
- Existing analysis endpoint: POST /analyze
- Existing history endpoints: GET/POST /history

Existing flow:
Upload → /analyze → EfficientNet prediction → disease information → confidence/severity → GradCAM+ → result → history.

The existing ML analysis must remain functional.

## 3. User Flow
Login → My Farm → Create Farm → Create Field → Define Field Boundary → Select Field → Scan Crop → Existing AI Analysis → Save Observation to Field → Farm Health Map → Field Details.

## 4. Farm Management
Farmer can create, view, edit, and delete farms.
Farm fields:
- id
- user_id
- name
- location
- latitude
- longitude
- total_area_hectares
- created_at

One user can have multiple farms.

## 5. Field Management
A farm can contain multiple fields.
A field contains:
- id
- farm_id
- user_id
- name
- crop
- area_hectares
- boundary_geojson
- latitude
- longitude
- created_at

Field boundaries should use GeoJSON Polygon where available.

## 6. Observations
Every FARMLENS analysis can optionally be associated with a field.
Observation information:
- image_url
- heatmap_url
- crop
- disease
- confidence
- severity
- latitude
- longitude
- timestamp
- field association
- user ownership

Keep the existing history system working.

## 7. Farm Health Map
Show farm fields and their current health status on an interactive map.

Initial version:
- field boundaries
- health status
- clickable fields
- field details
- legend

Suggested statuses:
- Green — Healthy
- Yellow — At Risk
- Orange — Moderate
- Red — High Risk

IMPORTANT: V1 health status represents health inferred from FARMLENS observations collected for that field. It must NOT be presented as literal disease coverage of every square meter. Actual affected-area measurement belongs to the later Proper Damage/Severity feature.

## 8. Field Details
Show:
- field name
- crop
- current health
- latest disease
- latest analysis
- confidence
- severity
- recent observations
- treatment
- precautions
- relevant images/heatmaps
- Scan New Image

## 9. Result Integration
Keep the existing Result page.
Add:
Save to My Farm → Select Farm → Select Field → Save Observation.

Field association should be optional so existing FARMLENS usage continues to work.

## 10. Database Design
Preferred domain model:

User
  ↓
Farm
  ↓
Field
  ↓
Observation

Proposed tables:

### farms
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id) NOT NULL
name TEXT NOT NULL
location TEXT
latitude DOUBLE PRECISION
longitude DOUBLE PRECISION
total_area_hectares NUMERIC
created_at TIMESTAMPTZ DEFAULT now()

### fields
id UUID PRIMARY KEY
farm_id UUID REFERENCES farms(id) ON DELETE CASCADE NOT NULL
user_id UUID REFERENCES auth.users(id) NOT NULL
name TEXT NOT NULL
crop TEXT
area_hectares NUMERIC
boundary_geojson JSONB
latitude DOUBLE PRECISION
longitude DOUBLE PRECISION
created_at TIMESTAMPTZ DEFAULT now()

### observations
id UUID PRIMARY KEY
field_id UUID REFERENCES fields(id) ON DELETE CASCADE NOT NULL
user_id UUID REFERENCES auth.users(id) NOT NULL
image_url TEXT
heatmap_url TEXT
crop TEXT
disease TEXT
confidence INT
severity INT
latitude DOUBLE PRECISION
longitude DOUBLE PRECISION
created_at TIMESTAMPTZ DEFAULT now()

IMPORTANT: Before implementation, inspect the real Supabase schema and existing history implementation. Decide whether observations should reference history rows, extend history with field_id, or remain separate. Avoid unnecessary duplicate prediction data.

## 11. Security / RLS
Farm, field, and observation data must be scoped to the authenticated user.

auth.uid() → farms.user_id → fields.user_id → observations.user_id

Create appropriate Supabase RLS policies so users cannot access another user's farm data.

Use the existing Supabase authentication pattern consistently.

## 12. API Design
Farm:
- POST /api/farms
- GET /api/farms
- GET /api/farms/{farm_id}
- PUT /api/farms/{farm_id}
- DELETE /api/farms/{farm_id}

Fields:
- POST /api/farms/{farm_id}/fields
- GET /api/farms/{farm_id}/fields
- GET /api/fields/{field_id}
- PUT /api/fields/{field_id}
- DELETE /api/fields/{field_id}

Observations:
- POST /api/fields/{field_id}/observations
- GET /api/fields/{field_id}/observations

Health Map:
- GET /api/health-map

Exact request/response models should follow existing API conventions after code/schema inspection.

## 13. Analyze Integration
Existing POST /analyze may accept optional field_id.

Concept:
image + language + optional field_id
→ existing ML analysis
→ result
→ optional field observation

Do not rewrite the ML pipeline or change the disease model solely for this feature.

## 14. Frontend
New pages:
- FarmDashboard.tsx
- FarmHealthMap.tsx
- FieldDetail.tsx

Suggested routes:
- /farm
- /farm/:farmId
- /farm/:farmId/field/:fieldId

New/reusable components:
- FarmCard
- FieldMarker or FieldPolygon
- HealthLegend
- FarmFormDialog
- FieldFormDialog
- FieldObservationList
- FarmHealthSummary

Extend existing Navbar, App routing, Result, Upload flow, AuthContext, API config, and translations where appropriate.

Do not redesign the entire application.

## 15. Map Technology
Preferred: Leaflet + React-Leaflet.

Reasons:
- lightweight
- React compatible
- GeoJSON support
- no Google Maps API key required
- mobile friendly

Use a suitable free tile provider consistent with its licensing/usage requirements.

Provide a non-map/list fallback if map tiles cannot load.

## 16. Health Calculation — V1
Do not invent a scientifically precise field-health score.

V1 health should use available FARMLENS observation information. Potential inputs:
- latest observation
- severity
- confidence
- disease presence
- number of recent observations

The exact aggregation formula and thresholds must be explicitly decided before implementation.

Do NOT equate model confidence with disease severity.

## 17. Future Compatibility
This foundation must support:
1. Disease Progression / Early Warning
2. Proper Damage / Severity Detection
3. FARMLENS AI Agent
4. Offline-first mode
5. Human-in-the-loop AI
6. Confidence + Uncertainty
7. Weather-aware Disease Risk

## 18. Implementation Order
Phase 1 — Database:
- inspect existing schema
- finalize schema
- migrations
- RLS
- indexes
- CRUD tests

Phase 2 — Backend:
- farm APIs
- field APIs
- observation integration
- health map API
- authorization checks

Phase 3 — Frontend:
- farm dashboard
- farm creation
- field creation
- boundary UI
- field details

Phase 4 — Map:
- Leaflet
- field polygons
- health indicators
- field selection

Phase 5 — Existing AI integration:
- optional field selection
- save analysis to field
- observation persistence
- health update

Phase 6 — Testing:
- authentication
- CRUD
- RLS
- map
- AI integration
- end-to-end flow

## 19. Test Plan
Verify:
- create/view/edit/delete farm
- create/edit/delete field
- define boundary
- user isolation
- existing analysis still works
- optional field association works
- observation saved correctly
- map loads
- field polygon renders
- health state renders
- field click opens correct details
- map failure does not break core farm data

End-to-end:
Login → Create Farm → Create Field → Define Boundary → Scan Crop → Analyze → Save to Field → Open Health Map → Select Field → View Observation.

## 20. Safety Rules for Cline
Before modifying code:
1. Inspect existing codebase.
2. Inspect actual Supabase schema/migrations.
3. Compare this specification with existing architecture.
4. Identify conflicts or missing information.
5. Produce an implementation plan.
6. Do NOT modify files until the plan is reviewed and approved.

During implementation:
- make small, reversible changes
- do not rewrite working ML
- do not replace authentication
- do not remove existing history
- do not redesign unnecessarily
- run tests/type checks after meaningful changes
- report errors instead of silently working around them
- ask for approval when a design decision conflicts with this specification

## 21. Acceptance Criteria
Farm Digital Twin V1 is complete when a logged-in farmer can:
1. Create a farm.
2. Create one or more fields.
3. Define a field boundary.
4. See the field on a map.
5. Run existing FARMLENS analysis.
6. Save analysis to a selected field.
7. View field health.
8. View field observations.
9. View the farm health map.
10. Access only their own farm data.

Existing FARMLENS image-disease-analysis workflow must continue to work.

## 22. Product Principle
Farm Digital Twin V1 is an observation-based farm monitoring layer.

It is NOT yet:
- satellite disease mapping
- exact field-wide disease segmentation
- insurance claim assessment
- scientifically validated yield prediction
- exact physical disease coverage

Those are future capabilities.

## 23. Cline Instruction
Read this specification as the source of truth.

Do NOT immediately implement it.

First:
- inspect the existing FARMLENS codebase
- inspect the actual database schema/migrations
- identify mismatches
- produce a concise implementation plan
- list files to create/modify
- list database migrations
- list dependencies
- identify risks
- identify decisions requiring approval

Wait for explicit approval before entering implementation/Act mode.
