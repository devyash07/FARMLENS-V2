# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Backend Called When Token Present
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when user is authenticated and `farmlens_token` exists in localStorage, `analyzeImage` calls `POST /analyze` with Bearer token
  - Test that backend response includes `crop`, `disease`, `severity`, `confidence`, `status`, `heatmap_b64`, and `explanation`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Offline Fallback Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (backend unreachable, token absent)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that when backend is unreachable, `analyzeImage` returns deterministic mock result
  - Test that when user is not authenticated, navigation to `/login` occurs
  - Test that when `heatmap_b64` is empty, original image is displayed without errors
  - Test that logout clears both `farmlens_user` and `farmlens_token` from localStorage
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for crop analysis accuracy bugs

  - [x] 3.1 Implement JWT token generation in AuthContext
    - Add `buildJWT` helper function using Web Crypto API (crypto.subtle)
    - Sign HS256 JWT with header `{alg:"HS256",typ:"JWT"}`, payload `{sub, email, iat, exp}` (7-day expiry)
    - Use shared secret `"farmlens-dev-secret"` matching backend
    - Add `saveToken` helper to write token to `localStorage.setItem("farmlens_token", token)`
    - Add `clearToken` helper to remove token from localStorage
    - Call `buildJWT(userId, email).then(saveToken)` in both `login` and `register` callbacks
    - Call `clearToken()` in `logout` callback alongside existing user removal
    - _Bug_Condition: isBugCondition(state) where isAuthenticated = true AND localStorage.getItem("farmlens_token") = null_
    - _Expected_Behavior: After login/register, farmlens_token SHALL be present in localStorage_
    - _Preservation: Logout SHALL continue to clear farmlens_user and now also clear farmlens_token_
    - _Requirements: 2.1, 3.5_

  - [x] 3.2 Update backend auth to accept dev secret
    - Modify `get_current_user` in `backend/utils/auth.py`
    - Define `DEV_JWT_SECRET = "farmlens-dev-secret"`
    - Try decoding Bearer token against `DEV_JWT_SECRET` first, then fall back to `SUPABASE_JWT_SECRET`
    - Use `algorithms=["HS256"]` with `verify_aud: False` for both
    - Return `payload["sub"]` on first successful decode
    - Raise 401 if both fail
    - _Bug_Condition: Frontend-generated tokens with dev secret are rejected by backend_
    - _Expected_Behavior: Backend SHALL accept tokens signed with farmlens-dev-secret_
    - _Preservation: Backend SHALL continue to accept SUPABASE_JWT_SECRET tokens_
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Update Result page with backend call and HeatmapViewer
    - Modify `analyzeImage` in `src/pages/Result.tsx` to always attempt backend call when token exists
    - Read `farmlens_token` from localStorage
    - Fetch image blob, build FormData, POST to `http://localhost:8000/analyze` with `Authorization: Bearer <token>`
    - Map `d.heatmap_b64` to `heatmap` field of `AnalysisItem`
    - Wrap backend call in try/catch for graceful fallback to deterministic mock
    - Add new `HeatmapViewer` component that renders image with Original/Disease Heatmap toggle
    - Use local `showHeatmap` state to switch `<img src>` between `preview` and `heatmap`
    - Show toggle button row only when `heatmap` is non-empty
    - Display badge overlay indicating current view mode
    - _Bug_Condition: analyzeImage() DID NOT call POST /analyze when token present_
    - _Expected_Behavior: analyzeImage SHALL send image to backend and return AI result with heatmap_b64_
    - _Preservation: When backend unreachable, SHALL fall back to deterministic mock_
    - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.4_

  - [x] 3.4 Improve heatmap generation with HSV colour analysis
    - Modify `generate_heatmap_b64` in `backend/services/ai_service.py`
    - Convert image to HSV colour space
    - Compute disease map as inverse of healthy-green mask (hue 35-85)
    - Boost disease map with brown/yellow pixel masks (typical disease colours)
    - Smooth with Gaussian blur, normalize to 0-255
    - Apply JET colormap (blue=least infected → red=most infected)
    - Blend with original at `alpha = 0.35 + (severity/100)*0.35`
    - Append gradient legend bar at bottom with "Low" and "High" labels
    - Call `generate_heatmap_b64` only when `result["status"] == "Infected"`
    - _Bug_Condition: heatmap_b64 is always empty because backend is never reached_
    - _Expected_Behavior: Backend SHALL generate heatmap for infected crops_
    - _Preservation: Healthy crops SHALL continue to have empty heatmap_b64_
    - _Requirements: 2.3, 3.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Backend Called When Token Present
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Offline Fallback Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
