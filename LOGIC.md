# Cookie Sleuth — Features to Make Detection Smarter

## 1. Tab-Scoped User Intent

**What it means:**  
Track user intent separately for each browser tab instead of keeping one global pool of recent clicks.

**Why it's important:**  
A click in one tab shouldn't accidentally make an unrelated cookie event in another tab appear legitimate.

**Suggested fix:**  
Associate every intent event with the tab ID and only correlate cookies/requests against intent from that same tab.

---

## 2. Richer User Intent

**What it means:**  
Don't just record that "the user clicked something." Record what they interacted with and where it was going.

**Why it's important:**  
A click on an actual affiliate link is much stronger evidence of legitimate attribution than an unrelated click somewhere on the page.

**Suggested fix:**  
Capture the source page, target URL, interaction type, timestamp, and relevant element information as part of the intent event.

---

## 3. Affiliate Cookie Confidence Scoring

**What it means:**  
Stop treating every cookie with a suspicious-looking name as an affiliate cookie.

**Why it's important:**  
Names like `tag`, `ref`, or `partner` are generic and can create false positives. Some names are much stronger indicators of affiliate tracking than others.

**Suggested fix:**  
Give different cookie names and patterns different confidence weights rather than using a simple yes/no regex match.

---

## 4. First-Party vs. Third-Party Detection

**What it means:**  
Determine whether the cookie belongs to the website the user is currently visiting or to an outside domain.

**Why it's important:**  
A first-party session cookie is very different from an affiliate cookie being established by an unrelated third-party domain.

**Suggested fix:**  
Compare the cookie's domain against the active page/site context and classify the relationship as first-party, third-party, or cross-site.

---

## 5. Track How the Cookie Was Delivered

**What it means:**  
Don't only record that a cookie appeared. Try to determine what browser activity surrounded it.

**Why it's important:**  
Cookie stuffing often involves mechanisms such as hidden iframes, tracking pixels, redirects, or automatically triggered requests rather than an obvious user navigation.

**Suggested fix:**  
Correlate cookie events with nearby navigation and network activity and record the apparent delivery mechanism.

---

## 6. Navigation and Request Correlation

**What it means:**  
Connect the user's action, navigation, network request, redirect, and eventual cookie creation into one chain of events.

**Why it's important:**  
A cookie created immediately after the user intentionally follows an affiliate link looks very different from one created without any corresponding navigation.

**Suggested fix:**  
Build a short-lived event timeline for each tab and look for relationships between user intent, navigation, requests, redirects, and cookie changes.

---

## 7. Negative Evidence

**What it means:**  
Look for evidence that an affiliate attribution happened without anything the user did that would explain it.

**Why it's important:**  
"No user interaction + third-party affiliate request + affiliate cookie" is much stronger evidence than simply "affiliate cookie detected."

**Suggested fix:**  
Increase the suspicion score when attribution occurs without a matching click, navigation, visible interaction, or other plausible user action.

---

## 8. Affiliate Network Intelligence

**What it means:**  
Recognize domains and URL patterns associated with affiliate networks and tracking systems.

**Why it's important:**  
Knowing that a request came from a recognized affiliate ecosystem gives the detector much more context than analyzing cookie names alone.

**Suggested fix:**  
Maintain a local intelligence database of known affiliate networks, domains, URL patterns, and common tracking indicators. Treat this as supporting evidence rather than automatically labeling something malicious.

---

## 9. Threat/Risk Scoring

**What it means:**  
Replace the current binary "stuffing / not stuffing" decision with a confidence or risk score.

**Why it's important:**  
Cookie attribution isn't always black and white. A scoring system lets you combine several weak or strong signals and greatly reduce false positives.

**Suggested fix:**  
Assign positive and negative weights to signals such as user intent, third-party status, affiliate-network involvement, hidden frames, redirects, suspicious cookie names, and repeated attribution attempts.

---

## 10. Explainable Detection / Event Timeline

**What it means:**  
Instead of simply telling the user that something was detected, show them why the extension thinks it is suspicious.

**Why it's important:**  
The user needs to be able to distinguish between "this cookie exists" and "this cookie appears to have been set without a legitimate user action." It also makes the extension feel like a forensic tool rather than a blacklist.

**Suggested fix:**  
Store the evidence behind each detection and present a short timeline such as: "No matching user interaction → third-party request → affiliate tracking parameter → cookie created 43ms later."

---

# The Overall Goal

The extension currently asks:

> "Did an affiliate-looking cookie appear, and did the user recently interact with that domain?"

The smarter version should ask:

> "What happened immediately before this attribution cookie was created, and is there convincing evidence that the user actually intended to generate this attribution?"

That distinction is the key.

The existing `REGISTER_USER_INTENT` system is already a good foundation. The biggest architectural improvement is to turn it from a simple 4-second "did they click?" check into a short-lived, tab-scoped event history that can be correlated with navigation, requests, redirects, and cookie creation. Your current implementation already has the intent cache and expiration mechanism to build on. :contentReference[oaicite:0]{index=0}

# IMMEDIATE ITEMS TO DO

If this were my extension, my next 5 features would be

1. Tab-scoped intent
   Fix this before anything else.

2. Affiliate confidence scoring
   Replace the current regex boolean with weighted signals.

3. First-party vs third-party context
   This will eliminate a lot of false positives.

4. Request/navigation correlation
   Determine whether the cookie came through an actual user-driven navigation, an iframe, redirect, pixel, etc.

5. Explainable threat score
   Don't just say STUFFING DETECTED. Tell the user why.

For example:

82% likely cookie stuffing

No matching user interaction
Third-party affiliate domain
Affiliate identifier detected
Cookie set 43ms after hidden-frame request

That would turn Cookie Sleuth from a "cookie name watcher" into something that actually has an argument for why an attribution event looks fraudulent.

And your existing code is already surprisingly close to the right foundation—the REGISTER_USER_INTENT + short-lived intent cache is exactly the piece I'd keep, just make it tab-aware, richer, and one component of a larger correlation model.
