# Crop Analysis Accuracy Bugfix Design

## Overview

Three interconnected bugs prevented FarmLens from ever reaching the real AI backend. The root cause was that login/register never persisted a JWT token, so `analyzeImage` always fell back to the deterministic frontend mock. As a consequence, the heatmap overlay was always empty and multi-image uploads received undifferentiated mock results. The fix threads a proper HS256 JWT through the entire stack: generated in the browser on login, stored in `localStorage`, sent as a Bearer token, and validated by the backend using the same shared secret.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `farmlens_token` is absent from `localStorage` after login, causing every analysis to bypass the backend
- **Property (P)**: The desired behavior — when a token exists, `analyzeImage` SHALL call `POST /analyze` and return real AI results including `heatmap_b64`
- **Preservation**: Existing offline fallback, result page layout, auth redirect, and logout behavior that must remain unchanged
- **buildJWT**: New async helper in `src/contexts/AuthContext.tsx` that signs an HS256 JWT using Web Crypto API
- **analyzeImage**: Function in `src/pages/Result.tsx` that orchestrates backend call with Bearer token and falls back to frontend mock on failure
- **predict**: Function in `backend/services/ai_service.py` that calls Gemini Vision when `GEMINI_API_KEY` is set, otherwise uses deterministic MD5 mock
- **generate_heatmap_b64**: Function in `backend/services/ai_service.py` that produces a JET-colormap disease heatmap as a base64 JPEG
- **get_current_user**: FastAPI dependency in `backend/utils/auth.py` that validates Bearer tokens against both `farmlens-dev-secret` and `SUPABASE_JWT_SECRET`
- **HeatmapViewer**: New React component in `src/pages/Result.tsx` that renders an Original/Disease Heatmap toggle when `heatmap_b64` is non-empty

## Bug Details

### Bug Condition

The bug manifests when a user logs in and then submits an image for analysis. The `login` and `register` callbacks in `AuthProvider` stored only a user object in `localStorage` and never wrote a JWT token. As a result, `analyzeImage` read `farmlens_token`, found it absent, and unconditionally fell back to the frontend mock — the backend was never contacted.

**Formal Specification:**
```
FUNCTION isBugCondition(state)
  INPUT: state — { localStorage, isAuthenticated }
  OUTPUT: boolean

  RETURN isAuthenticated = true
         AND localStorage.getItem("farmlens_token") = null
         AND analyzeImage() DID NOT call POST /analyze
END FUNCTION
```

### Examples

- User registers, uploads a tomato image → mock always returns "Leaf Blight / 65%" regardless of actual image content
- User uploads a healthy wheat image → mock may return "Root Rot / 80%" because the hash collides with a different mock entry
- Two different crop images hash to the same 2-byte prefix → identical results returned for both
- Backend is running with `GEMINI_API_KEY` set → Gemini Vision is never invoked because the request never arrives

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When the backend is unreachable or returns a non-2xx response, `analyzeImage` SHALL continue to fall back to the deterministic frontend mock so the app works offline
- The Result page layout (crop, disease, severity, confidence, status, explanation fields) SHALL remain unchanged
- Unauthenticated users SHALL continue to be redirected to `/login` before analysis
- When `heatmap_b64` is empty (healthy crop or mock fallback), the Result page SHALL continue to display the original image without errors
- Logout SHALL continue to clear `farmlens_user` from `localStorage`, and SHALL now also clear `farmlens_token`

**Scope:**
All behavior that does NOT involve the token-gated backend call is unaffected. This includes:
- Mouse/touch interactions on the Result page
- History recording via `addAnalysis`
- Session caching via `sessionStorage`
- Multi-image thumbnail strip and navigation

## Hypothesized Root Cause

1. **Missing token persistence on login/register**: `AuthProvider.login` and `AuthProvider.register` called `setUser` and wrote `farmlens_user` to `localStorage` but never generated or stored a JWT token. This was the primary root cause.

2. **No backend JWT validation for frontend-generated tokens**: Even if a token had been stored, the backend `get_current_user` only accepted `SUPABASE_JWT_SECRET`-signed tokens. A frontend-generated token with a different secret would be rejected with 401.

3. **`analyzeImage` short-circuits on missing token**: The `if (token)` guard in `analyzeImage` meant that a missing token caused an immediate fallback with no error surfaced to the user — the silent failure made the bug hard to notice.

4. **`heatmap_b64` never rendered**: `HeatmapViewer` was not present; the Result page had no toggle UI and no code path to display a heatmap even if the backend had been reached.

## Correctness Properties

Property 1: Bug Condition - Backend Called When Token Present

_For any_ analysis request where `isBugCondition` holds (user is authenticated and `farmlens_token` is present in `localStorage`), the fixed `analyzeImage` function SHALL send the image to `POST /analyze` with a valid Bearer token and return the backend's response including `crop`, `disease`, `severity`, `confidence`, `status`, `heatmap_b64`, and `explanation`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Offline Fallback Unchanged

_For any_ analysis request where the bug condition does NOT hold (backend unreachable, returns non-2xx, or token absent), the fixed `analyzeImage` function SHALL produce the same deterministic mock result as the original function, preserving offline functionality and result page layout.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `src/contexts/AuthContext.tsx`

**Function**: `login`, `register`, `logout`

**Specific Changes**:
1. **Add `buildJWT` helper**: Async function using `crypto.subtle` (Web Crypto API) to sign an HS256 JWT with header `{alg:"HS256",typ:"JWT"}`, payload `{sub, email, iat, exp}` (7-day expiry), and HMAC-SHA-256 signature. Secret is `"farmlens-dev-secret"` — matches the backend override.
2. **Call `buildJWT` on login**: After setting user state, call `buildJWT(userId, email).then(saveToken)` where `saveToken` writes to `localStorage.setItem("farmlens_token", token)`.
3. **Call `buildJWT` on register**: Same as login — generate and store token immediately after registration.
4. **Clear token on logout**: Add `clearToken()` (which calls `localStorage.removeItem("farmlens_token")`) to the `logout` callback alongside the existing user removal.

---

**File**: `backend/utils/auth.py`

**Function**: `get_current_user`

**Specific Changes**:
5. **Accept dev secret**: Try decoding the Bearer token against `DEV_JWT_SECRET = "farmlens-dev-secret"` first, then fall back to `SUPABASE_JWT_SECRET`. Both use `algorithms=["HS256"]` with `verify_aud: False`. Return `payload["sub"]` on first successful decode.

---

**File**: `src/pages/Result.tsx`

**Function**: `analyzeImage`, new `HeatmapViewer` component

**Specific Changes**:
6. **Always attempt backend call when token exists**: Remove any condition that skips the backend. Read `farmlens_token`, and if present, `fetch` the image blob, build a `FormData`, and `POST` to `http://localhost:8000/analyze` with `Authorization: Bearer <token>`. Map `d.heatmap_b64` to the `heatmap` field of `AnalysisItem`.
7. **Graceful fallback**: Wrap the backend call in `try/catch`; on any error or non-ok response, log a warning and fall through to the deterministic mock.
8. **Add `HeatmapViewer` component**: Renders the image with a toggle button row (Original / Disease Heatmap) when `heatmap` is non-empty. Uses local `showHeatmap` state to switch `<img src>` between `preview` and `heatmap`. Shows a badge overlay indicating current view mode.

---

**File**: `backend/services/ai_service.py`

**Function**: `generate_heatmap_b64`, `predict`

**Specific Changes**:
9. **HSV colour analysis for heatmap**: Convert image to HSV; compute a disease map as the inverse of the healthy-green mask (hue 35–85), boosted by brown/yellow pixel masks (typical disease colours). Smooth with Gaussian blur, normalize to 0–255, apply JET colormap, blend with original at `alpha = 0.35 + (severity/100)*0.35`.
10. **Legend bar**: Append a gradient bar at the bottom of the heatmap image with "Low" and "High" labels using `cv2.putText`.
11. **Gemini Vision integration**: `predict` checks `os.environ.get("GEMINI_API_KEY")`; if set, calls `_gemini_predict` which uses `google.generativeai` with `gemini-1.5-flash` and a structured JSON prompt. Falls back to `_mock_predict` on any exception.
12. **Heatmap only for infected crops**: `predict` calls `generate_heatmap_b64` only when `result["status"] == "Infected"`, leaving `heatmap_b64` as `""` for healthy crops.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Simulate login, then call `analyzeImage` with a mock image and assert that `fetch` was called with the backend URL and a Bearer token. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Token absent after login**: Call `login("test@example.com", "pass")`, then assert `localStorage.getItem("farmlens_token")` is non-null (will fail on unfixed code)
2. **Backend called when token present**: Manually set `farmlens_token` in localStorage, call `analyzeImage`, assert `fetch` was called with `Authorization: Bearer ...` header (will fail on unfixed code — fetch is never called)
3. **Heatmap rendered when backend returns it**: Mock `fetch` to return `{heatmap_b64: "data:image/jpeg;base64,..."}`, assert `HeatmapViewer` toggle is visible (will fail on unfixed code — component doesn't exist)
4. **Multi-image differentiation**: Upload two images with different content, assert results differ (may fail on unfixed code due to hash collision)

**Expected Counterexamples**:
- `localStorage.getItem("farmlens_token")` returns `null` after login
- `fetch` is never called with `http://localhost:8000/analyze`
- Possible causes: missing `buildJWT` call in login, missing token write, missing backend call guard

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition(state) DO
  result := analyzeImage_fixed(preview, filename)
  ASSERT fetch WAS CALLED WITH url = "http://localhost:8000/analyze"
  ASSERT fetch WAS CALLED WITH header Authorization = "Bearer <token>"
  ASSERT result.heatmap = backendResponse.heatmap_b64
  ASSERT result.crop = backendResponse.crop
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL state WHERE NOT isBugCondition(state) DO
  ASSERT analyzeImage_original(preview, filename) = analyzeImage_fixed(preview, filename)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe mock fallback behavior on unfixed code (backend unreachable path), then write property-based tests verifying the same deterministic output after the fix.

**Test Cases**:
1. **Mock fallback preservation**: When `fetch` throws a network error, assert `analyzeImage` returns the same deterministic mock result as before the fix
2. **Unauthenticated redirect preservation**: When `isAuthenticated` is false, assert navigation to `/login` still occurs
3. **Healthy crop no heatmap**: When backend returns `heatmap_b64: ""`, assert `HeatmapViewer` toggle is not shown and original image is displayed
4. **Logout clears token**: After `logout()`, assert both `farmlens_user` and `farmlens_token` are absent from `localStorage`

### Unit Tests

- Test `buildJWT` produces a valid three-part JWT with correct header/payload structure
- Test `get_current_user` accepts tokens signed with `farmlens-dev-secret`
- Test `get_current_user` rejects tokens with an invalid signature
- Test `generate_heatmap_b64` returns a non-empty base64 string for a valid image with severity > 0
- Test `generate_heatmap_b64` returns `""` when passed invalid/empty bytes
- Test `analyzeImage` falls back to mock when `fetch` throws

### Property-Based Tests

- Generate random `(userId, email)` pairs and verify `buildJWT` always produces a decodable JWT with matching `sub` and `email` claims
- Generate random image byte arrays and verify `_mock_predict` always returns one of the five known mock entries (determinism property)
- Generate random non-number-key inputs and verify `analyzeImage` mock fallback always returns a result with all required fields (`crop`, `disease`, `severity`, `confidence`, `status`, `heatmap`, `explanation`)

### Integration Tests

- Full login → upload → analyze flow with a running backend: assert real AI result is returned and heatmap toggle appears for an infected crop image
- Full login → upload → analyze flow with backend offline: assert mock result is returned and no error is thrown
- Multi-image upload: assert each image receives an independent backend call and results differ for visually distinct images
- Logout after analysis: assert `farmlens_token` is cleared and subsequent analysis redirects to login
