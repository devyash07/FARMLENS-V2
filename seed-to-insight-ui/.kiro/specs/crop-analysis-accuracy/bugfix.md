# Bugfix Requirements Document

## Introduction

Three related bugs in the FarmLens crop disease detection app cause the analysis pipeline to produce inaccurate, incomplete, and undifferentiated results:

1. **AI bypass**: The frontend never sends requests to the real backend AI (Gemini Vision) because no JWT token is stored in `localStorage` after login — the auth system stores only a user object, not a token. Every analysis silently falls back to the deterministic frontend mock, so users always see mock results regardless of what crop they upload.

2. **Missing heatmap overlay**: The heatmap is generated server-side and returned as `heatmap_b64` in the API response, but the backend is never reached (see bug 1), so `heatmap` is always an empty string and the overlay never renders on the Result page.

3. **No per-image differentiation for multi-image uploads**: Because the frontend mock uses a hash of the first 2 KB of each image's data URL, different images of different crops may hash to the same mock entry and return identical results. Additionally, since the real backend (which uses Gemini Vision per image) is never called, there is no actual per-image AI analysis — all images effectively get the same mock treatment.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user logs in THEN the system stores only a user object in `localStorage` under `farmlens_user` and does NOT store a JWT token under `farmlens_token`

1.2 WHEN the Result page calls `analyzeImage` THEN the system reads `farmlens_token` from `localStorage`, finds it absent, skips the backend call, and falls back to the deterministic frontend mock for every image

1.3 WHEN the frontend mock is used for analysis THEN the system returns an empty string for `heatmap`, causing the heatmap overlay to never appear on the Result page

1.4 WHEN multiple images of different crops are uploaded THEN the system applies the same frontend mock hash function to each image independently, which can map different crop images to the same mock entry, producing identical or inaccurate results that are not differentiated by actual crop content

### Expected Behavior (Correct)

2.1 WHEN a user logs in successfully THEN the system SHALL generate and store a JWT token in `localStorage` under `farmlens_token` so that subsequent API calls can authenticate with the backend

2.2 WHEN the Result page calls `analyzeImage` and a valid `farmlens_token` exists THEN the system SHALL send the image to the real backend `/analyze` endpoint and receive a Gemini Vision AI result

2.3 WHEN the backend returns a non-empty `heatmap_b64` value for an infected crop THEN the system SHALL display the heatmap overlay on top of the original image in the Result page

2.4 WHEN multiple images of different crops are uploaded THEN the system SHALL analyze each image independently via the real AI backend and return distinct, accurate results per image reflecting the actual content of each image

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the backend is unreachable or returns an error THEN the system SHALL CONTINUE TO fall back to the deterministic frontend mock so that the app remains functional offline

3.2 WHEN a single image is uploaded THEN the system SHALL CONTINUE TO display the result on the Result page with the same layout and fields (crop, disease, severity, confidence, status, explanation)

3.3 WHEN a user is not authenticated THEN the system SHALL CONTINUE TO redirect to the login page before allowing image analysis

3.4 WHEN the backend returns `heatmap_b64` as an empty string (e.g., for a healthy crop) THEN the system SHALL CONTINUE TO display the original image without an overlay and without errors

3.5 WHEN a user logs out THEN the system SHALL CONTINUE TO remove the user session from `localStorage`, and the stored JWT token SHALL also be cleared
