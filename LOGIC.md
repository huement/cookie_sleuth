# Cookie Sleuth

## Features & Detection Roadmap

<p align="center">
  <img src="./src/assets/sleuth-lg.png" alt="Cookie Sleuth Logo">
</p>

## INITIAL FEATURE LIST

### 1| Tab-Scoped User Intent — ✅ [COMPLETED]

- **Status:** Implemented in index.ts and content scripts.
- **Implementation:** intentCache associates user clicks directly with sender.tab.id. Threat evaluation matches tabId strictly so actions in Tab A never authorize background cookies in Tab B.

### 2| Richer User Intent — ✅ [COMPLETED]

- **Status:** Implemented in content scripts and service worker.
- **Implementation:** Intent registration captures targetUrl, targetDomain, timestamp, tabId, sourceUrl, and interaction type.

### 3| Affiliate Cookie Confidence Scoring — ✅ [COMPLETED]

- **Status:** Implemented in index.ts.
- **Implementation:** Replaced binary regex with AFFILIATE_COOKIE_MARKERS (10, 9, 7, 5, 3 points based on pattern specificity).

### 4| First-Party vs. Third-Party Detection — ✅ [COMPLETED]

- **Status:** Implemented in index.ts.
- **Implementation:** Dynamically compares cookie domain against active tab URL or details.initiator. Adds +5 penalty score and reason tag for third-party attributions.

### 5| Track How the Cookie Was Delivered — ✅ [COMPLETED]

- **Status:** Implemented in index.ts.
- **Implementation:** Distinguishes between sub_frame (iframes), xmlhttprequest, script, and http_header drops with custom risk scores.

### 6| Navigation & Request Correlation — ✅ [COMPLETED]

- **Status:** Implemented in webRequest listeners.
- **Implementation:** Reads HTTP `301/302/303/307/308` response status codes. Flags mid-flight redirect hops (+5 score penalty) and reduces intent discounts during redirect chains.

### 7| Negative Evidence — ✅ [COMPLETED]

- **Status:** Implemented in index.ts.
- **Implementation:** Evaluates missing intent, subframe delivery, and third-party status. Penalizes attribution attempts occurring without user click interaction.

### 8| Affiliate Network Intelligence — ✅ [COMPLETED]

- **Status:** Implemented in index.ts.
- **Implementation:** Added pattern matching for major affiliate networks (CJ, Impact, ShareASale, Awin, FlexOffers, Rakuten, Skimlinks, VigLink, ClickBank) and tracking URL parameters (+10 and +8 score penalties).

### 9| Threat/Risk Scoring — ✅ [COMPLETED]

- **Status:** Implemented in index.ts and App.tsx.
- **Implementation:** Calculates cumulative weighted score against CONFIDENCE_THRESHOLD (5). Normalizes score into threat probability in the UI.

### 10| Explainable Detection & Deep Linking — ✅ [COMPLETED]

- **Status:** Implemented in index.ts and App.tsx.
- **Implementation:** Threat objects persist specific array of triggered reasons. Popup UI displays reasons with direct deep-links to documentation sections in this repository.

## IMMEDIATE ITEMS TO DO

### Phase 1 Core Checklist

- [x] **1. Tab-scoped intent** — Fixed & validated.
- [x] **2. Affiliate confidence scoring** — Weighted signals active.
- [x] **3. First-party vs third-party context** — Dynamic domain matching active.
- [x] **4. Request/navigation correlation** — HTTP 302 redirect & subframe tracking active.
- [x] **5. Explainable threat score** — Dynamic reason breakdown with GitHub doc links active.
