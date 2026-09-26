export interface SignalExplanation {
  category: 'BEHAVIORAL' | 'DELIVERY VECTOR' | 'FINGERPRINT' | 'STEALTH COMBO';
  summary: string;
  whyItMatters: string;
  howItWorks: string;
  references?: { title: string; url: string }[];
}

export const SIGNAL_EXPLANATIONS: Record<string, SignalExplanation> = {
  'no-user-intent': {
    category: 'BEHAVIORAL',
    summary:
      'No recent user click or interaction was detected prior to this cookie being created.',
    whyItMatters:
      'Legitimate affiliate attribution relies on explicit consumer choice (e.g., clicking a coupon link). When an extension sets an affiliate cookie without prior intent, it steals attribution from legitimate traffic sources and monetizes user browsing silently.',
    howItWorks:
      'Cookie Sleuth tracks user clicks and form submits in a short-term 4000ms intent cache. If an affiliate token is set for a domain absent from this cache, it triggers a missing intent penalty.',
    references: [
      {
        title: 'Ben Edelman: Affiliate Fraud & Cookie Stuffing Analysis',
        url: 'https://www.benedelman.org/affiliatemanagement/',
      },
      {
        title: 'FTC Guides Concerning Use of Endorsements & Testimonials',
        url: 'https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking',
      },
    ],
  },

  'delivery-sub-frame': {
    category: 'DELIVERY VECTOR',
    summary: 'The cookie was dropped by an invisible or background iframe.',
    whyItMatters:
      'Rogue extensions frequently inject hidden 0x0 pixel or off-screen iFrames into loaded web pages. These iFrames silently navigate to affiliate URLs in the background, forcing the browser to accept affiliate cookies without the user ever seeing a redirect.',
    howItWorks:
      'Evaluated via WebRequest & WebNavigation APIs. Requests originating from `sub_frame` contexts carrying affiliate parameters or setting `Set-Cookie` headers receive a elevated threat penalty.',
    references: [
      {
        title: 'OWASP: Cross-Frame Scripting & Hidden iFrame Attacks',
        url: 'https://owasp.org/',
      },
    ],
  },

  'delivery-script': {
    category: 'DELIVERY VECTOR',
    summary: 'The cookie was programmatically set via client-side JavaScript execution.',
    whyItMatters:
      'Injected content scripts can execute `document.cookie = ...` directly inside the DOM context. This bypasses standard HTTP response header inspection and allows malicious extensions to write attribution keys directly.',
    howItWorks:
      'Monitored via `chrome.cookies.onChanged` API listening for `explicit` script-driven cookie mutations.',
    references: [
      {
        title: 'MDN Web Docs: Document.cookie API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie',
      },
    ],
  },

  'novel-domain': {
    category: 'BEHAVIORAL',
    summary: 'The cookie domain does not exist in your active navigation dictionary.',
    whyItMatters:
      'Based on Lempel-Ziv (LZ78) compression theory. When you navigate the web, your explicit browser visits form a dictionary of known domains. If an affiliate cookie drops from a domain you never visited, it is an uninvited third-party drop.',
    howItWorks:
      'Cookie Sleuth logs top-level domain visits (`webNavigation.onCommitted`) into an in-memory dictionary (`navDict`). Cookies set by domains outside this set trigger an LZ Novelty miss.',
    references: [
      {
        title: 'Lempel-Ziv (LZ78) Compression & Novelty Detection in Telemetry',
        url: 'https://en.wikipedia.org/wiki/LZ77_and_LZ78',
      },
    ],
  },

  'redirect-hop': {
    category: 'DELIVERY VECTOR',
    summary: 'The cookie was set during an intermediate HTTP 301/302/307 redirect.',
    whyItMatters:
      'Affiliate cookie stuffing rarely happens directly. Rogue extensions route network requests through intermediate sub-networks or redirect chains to obscure origin tracking. Catching the intermediate hop is critical for detecting attribution hijacking.',
    howItWorks:
      'Monitored via `chrome.webRequest.onHeadersReceived` whenever an HTTP status code between 300–399 drops a `Set-Cookie` header during page load or iframe navigation.',
    references: [
      {
        title: 'IETF RFC 9110: HTTP Redirection Status Codes',
        url: 'https://www.rfc-editor.org/rfc/rfc9110.html#section-15.4',
      },
    ],
  },

  'early-timing': {
    category: 'BEHAVIORAL',
    summary: 'The cookie was set within <500ms of initial page navigation.',
    whyItMatters:
      'Human interactions (clicks, coupon applications) take time after a page loads. Network requests firing affiliate cookies under 500ms indicate automated extension background scripts triggering instantly upon DOM creation.',
    howItWorks:
      'Cookie Sleuth records `pageStartTime` on `onBeforeNavigate`. If an affiliate cookie is set within $\\Delta t < 500\\text{ms}$, it is flagged for early timing automation.',
  },

  'third-party-context': {
    category: 'BEHAVIORAL',
    summary: 'The cookie domain does not match the main frame eTLD+1 domain.',
    whyItMatters:
      'Third-party cookies dropped across unrelated sites allow tracking networks and rogue extensions to build cross-site profiles and claim attribution on merchants you did not explicitly visit.',
    howItWorks:
      'Compares the cookie’s apex domain against the active tab’s URL domain.',
  },

  'affiliate-marker': {
    category: 'FINGERPRINT',
    summary: 'Cookie key matches known affiliate marketing parameter patterns.',
    whyItMatters:
      'Identifies standard affiliate attribution cookies (such as sub-IDs, transaction IDs, or publisher markers) used by major affiliate networks.',
    howItWorks:
      'Matched against regex fingerprints like `aff_id`, `clickid`, `irclickid`, `subid`, `cjdata`, `utm_source`, etc.',
  },

  'affiliate-network': {
    category: 'FINGERPRINT',
    summary: 'Domain or URL matches a known commercial affiliate network.',
    whyItMatters:
      'Confirms the request or cookie originated from or passed through known affiliate intermediary infrastructure (e.g., CJ, Impact, Rakuten, ShareASale, Awin).',
    howItWorks:
      'Matched against a compiled dataset of affiliate network domain patterns.',
  },

  'stealth-combo-1': {
    category: 'STEALTH COMBO',
    summary: 'High-risk concurrence: Hidden iframe + No User Intent + Unvisited Novel Domain.',
    whyItMatters:
      'This multi-signal pattern represents the quintessential "stealth cookie stuffing" attack vector used by deceptive browser extensions to maximize payouts with zero user visibility.',
    howItWorks:
      'Fires automatically when Signals 1 (No Intent), 2 (Sub-Frame), and 3 (LZ Novelty Miss) trigger simultaneously on a single event.',
  },

  'stealth-combo-2': {
    category: 'STEALTH COMBO',
    summary: 'High-risk concurrence: Silent 302 Hop + No User Intent + Unvisited Novel Domain.',
    whyItMatters:
      'Indicates a hidden background network request passing through intermediate redirect networks without user interaction.',
    howItWorks:
      'Fires automatically when Signals 1 (No Intent), 4 (Redirect Hop), and 3 (LZ Novelty Miss) trigger simultaneously.',
  },
};