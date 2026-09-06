-- ============================================================================
-- FARMLENS V2 — FARM DIGITAL TWIN / FARM HEALTH MAP
-- Phase 1: Database Migration
-- ============================================================================
-- 
-- IMPORTANT COMPATIBILITY WARNING:
-- The existing backend (backend/supabase_client.py) uses the SUPABASE_ANON_KEY
-- for all database operations. It does NOT pass user JWTs to the Supabase client.
-- 
-- Enabling RLS on the `history` table (Section D below) will cause the existing
-- GET /history and POST /history endpoints to return empty/denied responses
-- UNTIL Phase 2 updates the backend to pass user JWTs to the Supabase client.
-- 
-- RECOMMENDATION: Run Sections A, B, C, E now (safe, non-breaking).
-- Run Section D (history RLS) AFTER Phase 2 backend changes are deployed.
-- ============================================================================

-- ============================================================================
-- SECTION A: Create `farms` table
-- ============================================================================
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  total_area_hectares NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION B: Create `fields` table
-- ============================================================================
CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  crop TEXT,
  area_hectares NUMERIC,
  boundary_geojson JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION C: Extend `history` table (non-breaking, nullable columns)
-- ============================================================================
ALTER TABLE history
  ADD COLUMN IF NOT EXISTS field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ============================================================================
-- SECTION D: RLS on `history`
-- ============================================================================
-- STATUS: EXECUTED on 2026-09-02 via supabase/migrations/002_enable_history_rls.sql
-- (Security checkpoint after Phase 2 made all `history` access JWT-scoped.)
-- The statements below are kept for reference only — do NOT re-run here;
-- migration 002 is the authoritative record.
-- The optional second policy ("history for own fields") remains deferred.

-- ALTER TABLE history ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Users can access own history" ON history
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can access history for own fields" ON history
--   FOR SELECT USING (
--     field_id IS NOT NULL
--     AND EXISTS (
--       SELECT 1 FROM fields f
--       WHERE f.id = history.field_id
--       AND f.user_id = auth.uid()
--     )
--   );

-- ============================================================================
-- SECTION E: RLS on `farms` and `fields` (safe — new tables)
-- ============================================================================
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

-- Farms: users can manage only their own farms
CREATE POLICY "Users can manage own farms" ON farms
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fields: users can manage only their own fields
CREATE POLICY "Users can manage own fields" ON fields
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SECTION F: Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_fields_farm_id ON fields(farm_id);
CREATE INDEX IF NOT EXISTS idx_fields_user_id ON fields(user_id);
CREATE INDEX IF NOT EXISTS idx_history_field_id ON history(field_id);

-- ============================================================================
-- SECTION G: Verification queries (run after migration)
-- ============================================================================
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name IN ('farms', 'fields', 'history')
-- ORDER BY table_name, ordinal_position;
--
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('farms', 'fields', 'history')
-- ORDER BY tablename, policyname;