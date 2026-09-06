-- ============================================================================
-- FARMLENS V2 — SECURITY CHECKPOINT: Enable RLS on `history`
-- ============================================================================
-- This executes the previously deferred Section D of 001_farm_twin.sql.
--
-- Preconditions met (Phase 2, verified):
--   * GET/POST /history use the JWT-scoped per-request Supabase client
--     (backend/routes/history.py — UserContext.client)
--   * All other `history` reads (routes/field.py, routes/health_map.py)
--     are JWT-scoped as well
--   * POST /analyze never writes the history table
--
-- Executed on: 2026-09-02 (Supabase Dashboard SQL Editor)
-- ============================================================================

ALTER TABLE history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own history" ON history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NOTE: The optional "Users can access history for own fields" SELECT policy
-- from 001_farm_twin.sql Section D remains intentionally deferred — current
-- flows never require it (every insert validates field ownership and stamps
-- user_id from the verified JWT).

-- ============================================================================
-- ROLLBACK (only if breakage requires it):
--   DROP POLICY "Users can access own history" ON history;
--   ALTER TABLE history DISABLE ROW LEVEL SECURITY;
-- ============================================================================