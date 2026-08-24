# 



| # | Suggestion | Why It Matters | How to Implement |
|---|---|---|---|
| 1 | Raise the confidence threshold | Your current `CONFIDENCE_THRESHOLD = 5` is extremely permissive. A single affiliate URL parameter worth `+8` can trigger a detection by itself. | Raise the threshold substantially, but preferably don't rely on one global threshold. Require multiple independent evidence categories before declaring `UNSOLICITED_COOKIE`. |
| 2 | Separate "affiliate activity" from "cookie stuffing" | An affiliate cookie is not inherently malicious. Your current model can effectively treat "affiliate tracking detected" as "possible stuffing." | Create separate concepts such as `affiliateScore` and `suspicionScore`. First establish that the cookie is affiliate-related, then determine whether the attribution appears unsolicited. |
| 3 | Require multiple categories of evidence | Legitimate websites routinely have third-party requests, redirects, iframes, and cookies during page load. Any one of these is weak evidence. | Require evidence from multiple categories, e.g. `affiliate indicator + no user intent + indirect delivery`. Don't allow one signal to trigger a stuffing detection by itself. |
| 4 | Reduce the weight of third-party cookies | Your code currently gives third-party cookies `+5`. Modern websites generate huge numbers of legitimate third-party requests, so this creates noise. | Reduce this to something like `+1` or treat third-party status as contextual information rather than a strong threat signal. |
| 5 | Reduce the weight of early cookie timing | Your code gives cookies created within 500ms of page load `+6`. Sites like Gmail, YouTube, and large web apps legitimately create many cookies immediately. | Make timing a supporting signal. For example, `+1/+2` instead of `+6`, and only make it meaningful when combined with other suspicious behavior. |
| 6 | Make user intent much more important | The key question for cookie stuffing is whether the user actually initiated an interaction that could legitimately produce the affiliate attribution. | Give strong positive evidence to an actual user interaction and strong negative/positive evidence depending on the absence of one. Ideally distinguish direct clicks, navigation, redirects, iframes, and unrelated third-party requests. |
| 7 | Track the relationship between user action and cookie creation | Simply asking whether the user interacted with a domain isn't enough. You want to know whether the cookie resulted from that interaction. | Track a chain such as `user click → destination → redirect → affiliate domain → cookie`. If the cookie appears without a plausible chain, increase suspicion. |
| 8 | Add interaction distance | A cookie from an affiliate domain directly reached by a user click is very different from one loaded through a hidden iframe several sites away. | Track something like `interactionDistance`: `0 = directly interacted`, `1 = directly navigated`, `2 = redirect from intentional action`, `3 = indirectly loaded`, `4 = unrelated third-party`. Increase suspicion as the distance increases. |
| 9 | Treat redirects differently depending on their origin | Your current redirect score gives `+5` regardless of why the redirect happened. Legitimate affiliate links commonly use redirects. | Determine whether the redirect followed an actual user action. `user click → affiliate redirect → merchant` should be low-risk. `page load → hidden redirect → affiliate cookie` should be much more suspicious. |
| 10 | Treat hidden/background iframes as stronger evidence | Your existing `sub_frame` signal is useful, but an iframe alone does not prove stuffing. | Increase suspicion when an affiliate-related cookie is created by a hidden/background iframe, especially when there is also no user intent and no direct navigation to the affiliate domain. |
| 11 | Add a legitimate-infrastructure suppression layer | Large services such as Google, YouTube, Microsoft, Meta, CDNs, analytics providers, etc. naturally trigger many of your current heuristics. | Create a small `KNOWN_LEGITIMATE_INFRASTRUCTURE` list. Prefer downgrading their score rather than blindly returning early. Example: `score -= 5` rather than `if (whitelist) return`. |
| 12 | Don't build an enormous whitelist | A giant whitelist will become difficult to maintain and could create blind spots if a malicious domain isn't listed. | Use the whitelist as a secondary confidence adjustment, not the primary detection mechanism. Keep it focused on well-known infrastructure and services that generate predictable false positives. |
| 13 | Add domain reputation/history | A brand-new or completely unrelated domain setting affiliate attribution can be more suspicious than an established service. | Track domain observations over time. A domain repeatedly behaving like normal analytics infrastructure should receive less suspicion; unusual affiliate attribution behavior should receive more. |
| 14 | Distinguish affiliate domains from merchants | The domain setting the cookie matters. A merchant setting its own affiliate-related cookie is different from an unrelated third-party domain injecting attribution. | Identify whether `cookieDomain` is the current merchant, an established affiliate network, or an unrelated third party. Increase suspicion for unrelated third-party attribution. |
| 15 | Add merchant/affiliate relationship logic | A legitimate affiliate network may have a known relationship with the site the user intentionally visited. | Maintain or infer relationships such as `merchant → affiliate network`. If the user intentionally navigated to a merchant and the affiliate cookie follows the expected attribution path, reduce suspicion. |
| 16 | Make "no user intent" insufficient by itself | Your current code adds `+5` whenever no matching intent exists. That can make normal automated tracking look malicious. | Treat missing intent as supporting evidence only. Require it to be combined with suspicious delivery or attribution behavior before declaring stuffing. |
| 17 | Don't let affiliate URL parameters trigger a threat by themselves | `AFFILIATE_URL_PARAMS` currently adds `+8`, which is already above your threshold of `5`. This means something as ordinary as `utm_source=` can effectively trigger detection. | Change affiliate URL parameters into an indicator that establishes `affiliateScore`, not a direct threat score. Require additional evidence before declaring stuffing. |
| 18 | Separate evidence into categories | Your current system adds everything into one score, allowing several weak signals to accumulate without considering what those signals actually represent. | Create categories such as `affiliateEvidence`, `intentEvidence`, `deliveryEvidence`, `contextEvidence`, and `reputationEvidence`. Require evidence from at least 2–3 categories. |
| 19 | Require a "detection story" | A good detection should explain why the behavior looks like cookie stuffing rather than simply saying "score = 12." | Build detections around a sequence such as `no user interaction → hidden iframe → affiliate domain → attribution cookie`. Store those events as the reason for the detection. |
| 20 | Introduce severity levels | Not every suspicious affiliate event deserves the same alert. Your current system effectively turns everything over the threshold into the same threat type. | Add classifications such as `AFFILIATE_ACTIVITY`, `SUSPICIOUS_AFFILIATE_ACTIVITY`, `UNSOLICITED_COOKIE`, and `LIKELY_COOKIE_STUFFING`. |
| 21 | Make the UI conservative | If the extension tells users that Gmail or YouTube is a "cookie stuffer," users will quickly lose trust in the detector. | Only show strong language such as `COOKIE STUFFING DETECTED` for high-confidence cases. Use softer language such as `Affiliate activity observed` for weaker cases. |
| 22 | Log false positives for tuning | You need real-world data to determine which signals are actually useful. | Store the individual signals/reasons for each detection. When a false positive occurs, you can see whether it was caused by timing, third-party status, URL parameters, novelty, redirects, etc. |
| 23 | Use combinations instead of isolated signals | The strongest evidence is usually behavioral combinations rather than individual characteristics. | Create explicit rules such as `affiliate attribution + no user interaction + hidden iframe` or `affiliate redirect + no navigation + cookie creation`. Give these combinations a much larger confidence boost. |
| 24 | Don't treat "novel domain" as strong evidence | Your current novelty signal gives `+8`. Many perfectly legitimate third-party services will be domains the user has never directly visited. | Reduce novelty to a small supporting signal, such as `+1/+2`, or use it primarily in combination with suspicious delivery behavior. |
| 25 | Consider requiring a minimum "affiliate confidence" AND "stuffing confidence" | This is probably the cleanest architectural improvement to your current scoring system. | Instead of `if (score >= 5)`, use something conceptually like `affiliateScore >= 8 && suspicionScore >= 8`. This prevents ordinary tracking signals from becoming stuffing detections. |
| 26 | Keep the current two-stage architecture | Your existing "affiliate indicator first, then deeper analysis" structure is good and worth keeping. | Keep Stage 1 as a cheap affiliate detector. Replace Stage 2 with a more conservative unsolicited-attribution analysis rather than simply accumulating generic suspicious-cookie signals. |

## Recommended scoring architecture

Instead of:

    affiliate indicators
            ↓
         one score
            ↓
      score >= 5
            ↓
       COOKIE STUFFER

I'd change it to:

    STAGE 1
    Is this actually affiliate-related?
            ↓
       affiliateScore
            ↓
    Not affiliate-related?
            ↓
          IGNORE

            ↓

    STAGE 2
    Does the attribution appear unsolicited?
            ↓
       suspicionScore
            ↓
    Analyze:
      - user intent
      - navigation chain
      - redirect chain
      - iframe/sub-frame
      - third-party relationship
      - timing
      - domain reputation
      - cookie type
            ↓

    STAGE 3
    Require multiple independent signals
            ↓
      LOW / MEDIUM / HIGH
            ↓
    Only HIGH = COOKIE STUFFING

## Example of the new logic

    Affiliate URL parameter
            ↓
       affiliateScore +8
            ↓
    Is there evidence of unsolicited attribution?
            ↓
      ┌─────┴─────┐
      │           │
     YES          NO
      │           │
      ▼           ▼
    Analyze       Legitimate
    behavior      affiliate activity
      │
      ▼
    Hidden iframe?          +4
    No user interaction?    +5
    Unrelated domain?       +4
    Affiliate redirect?    +3
    Novel domain?           +1
    Early timing?           +1
      │
      ▼
    suspicionScore
      │
      ├── Low → Ignore
      ├── Medium → Log / optionally show
      └── High → COOKIE STUFFING

## Specific changes I'd make to your current code first

| Current Behavior | Problem | Recommended Change |
|---|---|---|
| `CONFIDENCE_THRESHOLD = 5` | Far too easy to trigger | Replace with separate affiliate/suspicion thresholds |
| Affiliate URL params `+8` | Can immediately trigger a threat | Make this affiliate evidence, not threat evidence |
| Known affiliate network `+10` | Legitimate affiliate networks become highly suspicious | Use this to establish `affiliateScore`, then analyze whether attribution was unsolicited |
| Novel domain `+8` | Almost every third-party service can be "novel" | Reduce substantially, e.g. `+1/+2` |
| Early `<500ms` `+6` | Normal modern websites load things immediately | Reduce substantially and make it supporting evidence |
| Third-party `+5` | Extremely common behavior | Reduce to `+1` or contextual-only |
| Redirect `+5` | Legitimate affiliate links commonly redirect | Score differently based on whether a user action preceded it |
| Sub-frame `+5` | Useful, but not enough by itself | Keep as supporting evidence; combine with no intent + affiliate attribution |
| No intent `+5` | Missing intent isn't proof of stuffing | Make it important only when combined with suspicious delivery |
| Intent match `-10` | Good concept, but currently buried inside a single score | Make legitimate user intent a major part of the attribution chain |
| `score < 5 → ignore` | Too simplistic | Require multiple evidence categories before classification |

## The key principle

The detector should NOT ask:

    "Does this cookie look like something a cookie stuffer might use?"

It should ask:

    "Can I establish that an affiliate attribution was created
     without a plausible user action that would have caused it?"

That distinction should eliminate a large portion of the Gmail/YouTube/normal-web false positives while making your high-confidence detections much more meaningful.

#blog-articles