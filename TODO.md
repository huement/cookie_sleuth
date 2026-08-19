# TODO

## NEXT PHASE ROADMAP (Phase 2 Ideas)

### 1| Auto-Quarantine / Cookie Auto-Delete Toggle

- **Status:** Planned for Phase 2.
- **Implementation:** Add a user toggle setting to automatically delete cookies immediately if threat score exceeds 80% ($18+ points).

### 2| Domain Whitelist / Allowlist

- **Status:** Planned for Phase 2.
- **Implementation:** Allow users to whitelist specific trusted domains or affiliate networks directly from the popup UI.

### 3| Granular Event Timeline View

- **Status:** Planned for Phase 2.
- **Implementation:** Record exact millisecond event timestamps ([10:42:01.002] Click Registered -> [10:42:01.014] 302 Redirect Hop -> [10:42:01.043] Cookie Dropped) for deep forensic inspection.

### Notes for a detection-oriented extension

- Score + domain match + absence of a recent legitimate user click (your intent cache) is a solid combination for raising a threat.
- Many networks set first-party cookies on the merchant domain and third-party cookies on their own domains — watch both.
- Cookie lifetimes and SameSite attributes have changed; some stuffing still uses image/iframe loads or service-worker-style tricks, so also consider request monitoring (webRequest / declarativeNetRequest) for known tracking domains.
- Keep the lists maintainable — consider loading them from a remote JSON that you can update without shipping a new extension version.

## UI IMPROVEMENTS

Adding an "active affiliate links" tab. Filtering the noise of all cookies to specifically highlight active, intentional affiliate sessions will give users immediate, readable context. Do this by adding in a tab that shows the "active affiliate links" next to the other two tabs.

## DETECTION IMPROVEMENTS

To improve the actual detection algorithm and catch stuffing as it happens, your current combination of intent caching, domain matching, and threat scoring is an excellent foundation. Based on your current roadmap and architecture, here are the most impactful criteria you can add to your detection engine.

### Expanding Delivery Vectors & Metadata

Currently, your delivery vector detection successfully identifies iframes, scripts, and XHR requests. You can strengthen this by analyzing additional technical mechanisms:

- **Image Load Tracking:** You noted that some stuffing still relies on image loads. Hidden 1x1 tracking pixels are classic stuffing vectors. You should expand your vector detection to catch cookies dropped via image requests and apply a high risk score.
- **Service Worker Monitoring:** Malicious actors often use service-worker-style tricks to drop cookies entirely in the background. Monitoring web requests initiated by service workers could catch highly evasive stuffing.
- **Cookie Lifetime and SameSite Analysis:** Cookie lifetimes and SameSite attributes have changed in the modern web. Evaluating these attributes can serve as a strong heuristic; for instance, a third-party cookie dropped mid-redirect with a suspiciously long expiration date (e.g., 10 years) is a massive red flag.

⠀Behavioral and Timing Anomalies
Instead of just looking at the *type* of drop, you can analyze the *behavior* surrounding it.

- **Volume Anomalies:** If a single tab click (your 4,000 ms intent cache) results in 15 different affiliate network cookies being dropped across various domains, that is a strong indicator of an iframe stuffing array, even if intent exists.
- **Millisecond Timelines:** Implementing a granular event timeline view that records exact millisecond timestamps. Tracking the exact timing from Click Registered to 302 Redirect Hop to Cookie Dropped allows for deep forensic inspection and tighter timing bounds.

⠀Active Mitigation
To move from merely *detecting* to actively *preventing* stuffing:

- **Auto-Quarantine Capabilities:** You can implement an auto-quarantine or auto-delete toggle. If a dropped cookie exceeds an 80% threat probability (18+ points), the extension could automatically purge it from the browser before the user ever makes a purchase.
