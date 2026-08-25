<p align="center">
  <img src="./src/assets/logomark.png" alt="Cookie Sleuth Logo">
</p>

# Threat Detection Specifications & Technical Guide (v3.0 Engine)

This document details the threat detection architecture, information-theoretic algorithms, signal weights, and normalized risk scoring mechanisms used by **Cookie Sleuth** to identify cookie stuffing, unauthorized affiliate attribution, and covert tracking drops.

---

## 1. Executive Summary & Engine Architecture

Cookie Sleuth uses a **3-Stage Normalized Detection Pipeline** to distinguish legitimate web traffic, display ad tracking, and voluntary affiliate link clicks from covert cookie stuffing.

```text
+-------------------------------------------------------------------+
|               STAGE 1: AFFILIATE IDENTIFICATION                   |
| Checks: Cookie Fingerprints, Network Domains, URL Query Parameters|
| Filter: Absolute Ad-Tech & DSP/SSP Suppression (DoubleClick, etc.)|
+-------------------------------------------------------------------+
                 │
    [ Affiliate Indicator? ]
                 │
  ┌──────────────┴─────────────────────────────────┐
  ▼                                                ▼
[ YES ]                                          [ NO ]
  │                                                │
  ▼                                                ▼
+------------------------------------+      [ IGNORE / CLEAN ]
| STAGE 2: NORMALIZED SUSPICION      |
| Signal 1: User Intent      (30%)   |
| Signal 2: Delivery Vector  (20%)   |
| Signal 3: LZ Novelty       (20%)   |
| Signal 4: HTTP 302 Hop     (15%)   |
| Signal 5: Early Timing     (10%)   |
| Signal 6: 3rd-Party Context(05%)   |
| Modifiers: Stealth Boosts /        |
|            Infra & Click Discounts |
+------------------------------------+
                          │
                          ▼
+-------------------------------------------------------------------+
|               STAGE 3: DUAL-THRESHOLD VERIFICATION                |
| Bounded Normalized Scale: 0 to 100 Normalized Probability Points  |
| Threat Threshold: Score >= 45 / 100                               |
+-------------------------------------------------------------------+
```

---

## 2. Stage 1: Affiliate Identification & Ad-Tech Suppression

### What It Measures

Before running deep behavioral analysis, Stage 1 establishes whether a cookie event is related to affiliate marketing attribution.

### 1. Ad-Tech & Cookie Sync Suppression

Programmatic display ad exchanges, demand-side platforms (DSPs), supply-side platforms (SSPs), and identity resolution brokers (e.g., The Trade Desk `adsrvr.org`, Magnite `rubiconproject.com`, Xandr `adnxs.com`, LiveRamp `pippio.com`) drop third-party cookies across domain boundaries to sync user IDs.

- **Why Suppress?** While these cookies track users for display advertising (a privacy concern), they do **not** constitute affiliate commission fraud. Suppressing them prevents false-positive alerts on standard web browsing.

### 2. Affiliate Fingerprint Matching

A cookie passes Stage 1 if it matches any of three indicator categories:

1. **Cookie Name Fingerprints:** Patterns matching `affid`, `clickid`, `subid`, `partner_id`, `cj_`, `aw_`, `rakuten_`, `impact_`, etc.
2. **Known Affiliate Networks:** Domain or request URL matches against major network infrastructures (Commission Junction, Impact, ShareASale, Awin, Rakuten, Partnerize, ClickBank, FlexOffers, Tradedoubler).
3. **Attribution URL Parameters:** Request URLs containing query parameters such as `?aff_id=`, `?clickid=`, `?ref=`, `?subid=`, `?utm_source=`, `?awc=`, or `?ranMID=`.

---

## 3. Lempel-Ziv (LZ78) Navigation Novelty Engine

### Anchor ID: `#3-lz-navigation-novelty`

### Mathematical Foundation

Grounded in Lempel-Ziv (LZ78) universal compression theory, the LZ Novelty engine evaluates data unpredictability relative to a dynamically constructed dictionary.

`Navigation Dictionary = hostnames explicitly navigated to by user`

### How It Works in Cookie Sleuth

1. **Dictionary Construction:** As you browse, top-level document navigations captured via `chrome.webNavigation.onCommitted` (frame ID 0) populate the in-memory dictionary $D$, along with root apex domains.
2. **Dictionary Hit:** A cookie set by a domain `d` explicitly navigated to by the user (or subdomains thereof) represents expected behavior (`s_3 = 0.0`).
3. **Dictionary Miss (Novelty Event):** A cookie set by an uninvited third-party domain `d` not explicitly navigated to by the user constitutes a dictionary miss (`s_3 = 1.0`).

### Why It Measures Novelty

Legitimate cookies originate from sites you intentionally visit. Stuffed cookies originate from stealth third-party domains you never navigated to. A high session-level **LZ Novelty Rate** ($>40\%$) indicates a large proportion of cookies originate from uninvited third-party novelties.

- **Signal Weight:** **20% of Normalized Suspicion Score**
- **Triggered Reason:** `Novel domain (unvisited in navigation history)`

---

## 4. Page-Load Early Timing Engine (<500ms)

### Anchor ID: `#4-early-timing-engine`

### What It Measures

Measures the elapsed time delta (`Delta t`) between top-level frame navigation initiation and the exact millisecond the cookie header or DOM write occurs.

`Delta t = t_cookie_event - t_page_navigation_start`

### Human Physiological Speed Limits

Human reaction time requires at least `150--200ms` to process visual stimuli and several seconds to evaluate a page before clicking a link.

- **`Delta t < 500ms` (`s_5 = 1.0`):** Physical impossibility of human click interaction. The cookie was set automatically during initial page asset parse by an embedded script, image pixel, or background iframe.
- **`500ms <= Delta t < 2000ms` (`s_5 decaying`):** Set during initial page render. Linear decay function: `s_5 = max(0, 1 - (Delta t - 500) / 1500)`
- **`Delta t >= 2000ms` (`s_5 = 0.0`):** Sufficient time elapsed for potential human interaction.

- **Signal Weight:** **10% of Normalized Suspicion Score**
- **Triggered Reason:** `Fired during initial page load ([X]ms)`

---

## 5. Tab-Scoped User Intent & Retroactive De-risking

### Anchor ID: `#1-tab-scoped-user-intent`

### What It Measures

Verifies whether an outbound click was explicitly registered on the active tab prior to an attribution cookie write.

### How Intent Tracking Works

1. **Intent Registration:** Content scripts listen for `pointerdown` and `click` events on anchor tags, saving `targetDomain`, `tabId`, and `timestamp` into a short-lived `intentCache` (4,000ms TTL).
2. **Intent Verification:** When a cookie drop occurs, the engine checks if `intentCache` contains a matching entry for `tabId` and `targetDomain`.
   - **No Intent Match (`s_1 = 1.0`):** High suspicion penalty (+30% base weight).
   - **Intent Match Verified (`s_1 = 0.0`):** Applies an **80% total score discount** (or **50% discount** if dropped mid-redirect).

### Retroactive Domain De-risking

If an uninvited domain sets an attribution cookie, but the user subsequently navigates directly to that domain later in the session, `deRiskDomain()` updates the dictionary `D`, de-risks the previously logged threat, and automatically clears the alert state.

---

## 6. Delivery Channel Vectors & HTTP Redirect Correlation

### Anchor ID: `#5-delivery-channel-vectors`

### What It Measures

Identifies the technical delivery mechanism used to set the cookie. Covert cookie stuffing relies on invisible elements or automated background requests rather than standard page navigations.

### Channel Vectors & Normalized Weights

| Delivery Mechanism                                    | Normalized Value ($s_2$)           | Risk Description                                                         |
| :---------------------------------------------------- | :--------------------------------- | :----------------------------------------------------------------------- |
| **Sub-Frame (`sub_frame`)**                           | **`s_2 = 1.0` (100% vector risk)** | Set via background/hidden iframe element embedded in page DOM.           |
| **Client Script / XHR (`script` / `xmlhttprequest`)** | **`s_2 = 0.6` (60% vector risk)**  | Set programmatically via `document.cookie` or background `fetch()` call. |
| **Top-Level Navigation (`main_frame`)**               | **`s_2 = 0.0` (0% vector risk)**   | Standard top-level browser document load.                                |

### HTTP 302 Redirect Hop Correlation (`#6-redirect-correlation`)

Monitors `details.statusCode` in `webRequest.onHeadersReceived` for HTTP 300-series redirect statuses (`301`, `302`, `303`, `307`, `308`).

- **Redirect Hop Detected (`s_4 = 1.0`):** Cookie dropped mid-flight during intermediate network redirection.
- **Signal Weight:** **15% of Normalized Suspicion Score**
- **Triggered Reason:** `Set during HTTP [Code] redirect hop`

---

## 7. First-Party vs. Third-Party Domain Attribution

### Anchor ID: `#4-first-party-vs-third-party-detection`

### What It Measures

Evaluates whether the cookie domain matches the website visible in the active browser address bar (**First-Party Context**) or an external third-party domain (**Third-Party Context**).

- **Third-Party Domain Context (`s_6 = 1.0`):** Cross-site cookie drop originating from an external tracking host.
- **First-Party Context (`s_6 = 0.0`):** Cookie set directly by the host domain visited by the user.
- **Signal Weight:** **05% of Normalized Suspicion Score**

---

## 8. Modifiers, Combination Boosts, and Infrastructure Discounts

### Anchor ID: `#8-modifiers-and-discounts`

To maximize precision and eliminate false positives on complex web applications, Stage 2 applies dynamic mathematical adjustments:

### 1. High-Risk Stealth Combination Boosts

When multiple stealth delivery vectors align, the engine applies an additive risk boost:

- **Hidden Iframe + No Intent + Novel Domain:** `+0.25 Score Boost (+25%)`
- **Silent 302 Redirect + No Intent + Novel Domain:** `+0.20 Score Boost (+20%)`

### 2. Legitimate Infrastructure Discount

Major web infrastructure platforms (Google, YouTube, Microsoft, Meta, Apple, Cloudflare, Akamai, AWS) generate complex multi-domain background asset traffic.

- **Infrastructure Match:** Applies a **90% score reduction** (`Score * 0.10`), preventing false alerts on embedded web components like YouTube players or Gmail API calls.

---

## 9. Threat/Risk Scoring Engine & Mathematical Formula

### Anchor ID: `#9-threatrisk-scoring`

### The Normalized Formula

`Base Suspicion = 0.30 s_1 + 0.20 s_2 + 0.20 s_3 + 0.15 s_4 + 0.10 s_5 + 0.05 s_6`

`Final Score = min(100, max(0, floor((Base Suspicion + Boosts) * Discounts * 100)))`

### Confidence Threshold

An event is classified as an unsolicited threat when its final calculated score meets or exceeds the **Confidence Threshold of 45 / 100**.

### Severity Classification

| Normalized Score Range | Threat Classification Label | UI Badge Color              |
| :--------------------- | :-------------------------- | :-------------------------- |
| **80 – 100**           | `HIGH CONFIDENCE stuffing`  | **Pulsing Neon Pink**       |
| **60 – 79**            | `LIKELY cookie stuffing`    | **Orange**                  |
| **45 – 59**            | `POTENTIALLY unsolicited`   | **Yellow**                  |
| **0 – 44**             | `CLEAN / Suppressed`        | **Suppressed (Not Logged)** |

---

## 10. Explainable Telemetry & Reason Tags

### Anchor ID: `#10-explainable-threat-score`

Every threat logged by Cookie Sleuth contains an immutable array of human-readable reasons explaining the exact evidence used to assign the score.

### Telemetry Breakdown Card

In the extension popup interface, clicking any logged threat card expands its telemetry profile:

1. **Normalized Severity Percentage:** Visual score indicator (0–100%).
2. **Context Badges:** `FIRST-PARTY` or `THIRD-PARTY` indicator, delivery vector (`sub_frame`, `script`, `redirect`).
3. **Interactive Signal Spec Modals:** Clicking any itemized reason tag pops up a detailed specification modal explaining the mathematical weight, evaluation category, description, and security context.

# Cookie Stuffing Guard

A Manifest V3 Chrome Extension powered by React, TypeScript, and Tailwind CSS v4 that monitors browser cookie assignments to detect and audit cookie stuffing attacks in real time.

## Development Quickstart

```bash
# Install dependencies
pnpm install

# Run hot-reloading dev server
pnpm dev

# Build production bundle
pnpm build
```

### Loading into Chrome

1. Build the project using pnpm build.
2. Open Chrome and navigate to chrome://extensions/.
3. Enable Developer mode in the top right corner.
4. Click Load unpacked and select the generated dist/ directory.

### Formatting & Linting

```bash
pnpm lint
pnpm format
```

### Project Structure

- `src/`: Source code directory
  - `background/`: Background script for handling cookie monitoring
  - `content/`: Content script for intercepting cookie assignments
  - `popup/`: React-powered popup UI for displaying results
- `public/`: Static assets
- `dist/`: Build output directory

## Laboratory Testing

In order to test out the extension, I have setup a Laravel backend that will trigger cookie stuffing attacks. The backend is located at [https://labs.huement.com](labs.huement.com) . In order to accurately test the extension, you can't use only a Javascript vectors for the attack, you will need a server of some kind, (Python, PHP, etc) in order to trigger some of the attacks. However there is a Github pages hosted version that will allow you to test SOME possible cookie stuffing attacks that is going to be released soon, as well as a docker container version that will allow for all possible cookie stuff attacks. So follow the repo and stay tuned for those upcoming releases.
