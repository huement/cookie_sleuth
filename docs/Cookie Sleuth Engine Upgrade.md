# Cookie Sleuth Engine Upgrade — Summary of Changes

## Overview
`cookie_sleuth` was transformed from a heuristic point-scoring extension into an information-theoretic threat detection engine. The update eliminates false positive storms (from platforms like Google, YouTube, and Gmail) by separating **Affiliate Identification** from **Unsolicited Attribution Suspicion**, introducing **Lempel-Ziv (LZ) Navigation Novelty**, tracking **Early Timing (<500ms)**, suppressing **Programmatic Ad-Tech Cookie Syncs**, and applying a **Normalized Multi-Signal Scoring Engine**.

---
## 1. Core Architectural Shift: 3-Stage Scoring Pipeline

Instead of accumulating unbounded points that allowed benign query parameters (like `utm_source=`) or standard third-party requests to trigger threats, the engine now operates on a strict 3-stage pipeline:

* **Stage 1: Affiliate Identification**
  * Verifies if the cookie, domain, or request URL contains affiliate markers.
  * If no affiliate indicators exist, evaluation immediately stops and the request is ignored.

* **Stage 2: Normalized Suspicion Engine**
  * Evaluates six weighted suspicion signals (0.0 to 1.0 scale):
    * Signal 1: User Intent (Weight 0.30)
    * Signal 2: Delivery Channel (Weight 0.20)
    * Signal 3: LZ Novelty (Weight 0.20)
    * Signal 4: Redirect Hop (Weight 0.15)
    * Signal 5: Early Timing (Weight 0.10)
    * Signal 6: Third-Party Context (Weight 0.05)
  * Applies stealth combination boosts (+0.20 to +0.25) when high-risk factors align.
  * Applies infrastructure and intent discounts (80% to 90% reduction) for trusted domains and intentional clicks.

* **Stage 3: Dual-Threshold Verification**
  * Scales the final normalized suspicion score to an integer between 0 and 100.
  * Requires a minimum normalized score of 45 to trigger a threat alert.


```bash
[ Stage 1: Affiliate Identification ] 
│ 
├─► Not Affiliate? ──► IGNORE 
│ 
▼ 
[ Stage 2: Normalized Suspicion Engine ] 
│ 
├── Signal 1: User Intent (0.30) 
├── Signal 2: Delivery Channel (0.20) 
├── Signal 3: LZ Novelty (0.20) 
├── Signal 4: Redirect Hop (0.15) 
├── Signal 5: Early Timing (0.10) 
└── Signal 6: 3rd-Party Context (0.05) 
│ 
├── Stealth Combination Boosts (+0.20 to +0.25) 
└── Infrastructure / Intent Discounts (80%–90% reduction) 
│ 
▼ 
[ Stage 3: Dual-Threshold Verification ] 
│ 
├─► Score < 45 ──► IGNORE / CLEAN 
└─► Score >= 45 ──► FLAG THREAT (0–100 Scale)
```

---
## 2. Key Features Implemented

### A. Lempel-Ziv (LZ) Navigation Novelty Engine
* **Navigation Dictionary (`navDict`)**: Collects root hostnames that the user explicitly navigates to via `chrome.webNavigation.onCommitted` (frameId: 0).
* **Novelty Scoring**: Evaluates incoming cookie domains against `navDict`. If a domain setting an affiliate cookie has never been directly navigated to, it is flagged as an LZ "miss" (uninvited novelty).
* **Persistence & Apex Resolution**: Saves dictionary state to `chrome.storage.local` and automatically indexes apex root domains (e.g., `sub.example.com` de-risks `example.com`).

### B. Page-Load Early Timing Signal (<500ms)
* **Navigation Start Map (`pageStartTimes`)**: Captures exact epoch timestamps on `chrome.webNavigation.onBeforeNavigate`.
* **Automated Drop Detection**: Measures time delta (`elapsedMs = requestTimeStamp - pageStartTime`). Cookies dropped within <500ms of top-level document load are flagged for physical impossibility of human click interaction.

### C. Programmatic Ad-Tech & Cookie Sync Suppression
* **`ADTECH_DOMAINS` Database**: Created a database of programmatic DSPs, SSPs, and identity sync brokers (e.g., The Trade Desk, Magnite, PubMatic, Xandr, LiveRamp, DoubleClick).
* **Fraud Score Exclusion**: Completely suppresses these domains from triggering commission fraud alerts. They cause high LZ novelty by design (cross-domain ID syncing), but represent display ad tracking rather than affiliate fraud.

### D. Legitimate Web Infrastructure Discounts
* **`KNOWN_LEGITIMATE_INFRASTRUCTURE` Database**: Indexed major platforms (Google, YouTube, Microsoft, Meta, Apple, Cloudflare, Akamai, AWS).
* **Dynamic Score Reduction**: Applies a 90% score reduction to legitimate web infrastructure, eliminating false positives on complex web apps (e.g., YouTube video embeds, Gmail API calls).

### E. Retroactive Domain De-risking
* **Auto-Clearing Threats**: When a user explicitly navigates to a domain that previously triggered a threat alert, `deRiskDomain()` retroactively removes that domain's threats from `chrome.storage.local` and resets alert badges if all threats are resolved.

### F. Multi-Signal Stealth Combination Boosts
* Evaluates compound behavioral signatures used by actual cookie stuffers.
* Automatically boosts normalized suspicion scores when high-risk factors align (e.g., Hidden Iframe + No Intent + Novel Domain, or Silent 302 Redirect + No Intent + Novel Domain).

---

## 3. Codebase & Directory Restructuring

* **`src/background/index.ts`**: Service worker orchestration, listeners, navDict state, and storage management.
* **`src/background/threatEvaluator.ts`**: Modular 3-Stage Normalized Detection Engine.
* **`src/background/__tests__/threatEvaluator.test.ts`**: Vitest suite covering normalized scoring, combinations, and suppression.
* **`src/constants/affiliate.ts`**: Fingerprints, Ad-Tech, and Legitimate Infrastructure databases.
* **`src/popup/App.tsx`**: Interactive popup UI with toggleable visual analytics.
* **`src/types/`**: Core TypeScript interfaces.

```
src/ 
├── background/ 
│ ├── index.ts # Service worker orchestration, listeners, navDict state 
│ ├── threatEvaluator.ts # Modular 3-Stage Normalized Detection Engine 
│ └── tests/ 
│ └── threatEvaluator.test.ts # Vitest suite covering normalized scoring & suppression 
├── constants/ 
│ └── affiliate.ts # Fingerprints, Ad-Tech, & Legitimate Infrastructure DBs 
├── popup/ 
│ └── App.tsx # Interactive popup UI with toggleable visual analytics 
└── types/ # Core TypeScript interfaces
```

---

## 4. UI & Visual Analytics Updates (`App.tsx`)

* **Interactive Toggle (`STREAM / ANALYTICS`)**: Added a view switcher in the popup header.
* **LZ Novelty Rate Gauge**: Displays a dynamic visual progress bar indicating the session's overall LZ dictionary miss rate (Green: <15%, Yellow: 15-40%, Pink: >40%).
* **Threat Severity Sparkline**: Visualizes the proportion of HIGH, MED, and LOW threats currently logged.
* **Navigation Stats**: Displays live metrics for total tracked navigation domains (`navDictSize`) and total intercepts.
* **Adaptive Stream View**: Automatically scales event list height between 150px and 240px depending on whether analytics are expanded.

---

## 5. Lab Testing Setup Enhancements

Updated Laravel simulation lab to validate all newly implemented signals:
* **On-Load Automated Drop**: Endpoint `stuffOnLoad()` triggering on DOM load to test Early Timing (<500ms).
* **Ad-Tech Sync**: Endpoint `adtechSync()` dropping `adsrvr_id` to verify zero false positives on ad-tech traffic.
* **Cross-Domain LZ Novelty**: Button injecting third-party pixels to verify `navDict` miss detection.
* **Legitimate User Intent**: Pointerdown intent registration verifying score discounts on explicit clicks.



#blog-articles