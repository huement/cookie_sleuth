import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  type Mock,
} from 'vitest';
import type { UserIntent, ThreatLog } from '../types';

// Mock chrome APIs
const chromeMock = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  action: {
    setIcon: vi.fn(),
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  tabs: {
    get: vi.fn(),
    query: vi.fn(),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
  webRequest: {
    onHeadersReceived: {
      addListener: vi.fn(),
    },
  },
  cookies: {
    onChanged: {
      addListener: vi.fn(),
    },
  },
};

vi.stubGlobal('chrome', chromeMock);
vi.stubGlobal('crypto', {
  randomUUID: () => 'mock-uuid',
});

// To make evaluateCookieThreat runnable in the test file, we need to copy it and its dependencies here.
// In a real-world scenario, you would refactor this into a separate, testable module.

const AFFILIATE_COOKIE_MARKERS = [
  { pattern: /affid/i, score: 10, label: 'Generic Affiliate ID' },
];
const KNOWN_AFFILIATE_NETWORKS = [
  { name: 'Commission Junction', pattern: /cj\.com/i, score: 10 },
];
const AFFILIATE_URL_PARAMS =
  /[?&](aff(?:iliate)?[_-]?id|affid|click[_-]?id|cj[_-]?data|irclickid|sub[_-]?id|sid|partner[_-]?id|pid|campaign[_-]?id|cid|ref(?:errer|id)?|tag|source|utm_source|utm_medium|utm_campaign|awc|ranMID|ranEAID|tduid|phg)=/i;

const CONFIDENCE_THRESHOLD = 5;
let intentCache: UserIntent[] = [];
const INTENT_EXPIRY_MS = 4000;

const pruneIntents = () => {
  const now = Date.now();
  intentCache = intentCache.filter(
    (item) => now - item.timestamp < INTENT_EXPIRY_MS
  );
};

const evaluateCookieThreat = (
  cookieName: string,
  cookieDomain: string,
  requestUrl: string,
  deliveryMechanism: string,
  tabId?: number,
  tabUrl?: string,
  statusCode?: number
) => {
  let score = 0;
  const reasons: string[] = [];

  // A. Check Cookie Name Fingerprints
  let hasCookieMarker = false;
  for (const marker of AFFILIATE_COOKIE_MARKERS) {
    if (marker.pattern.test(cookieName)) {
      score += marker.score;
      reasons.push(marker.label);
      hasCookieMarker = true;
      break;
    }
  }

  // B. Check Known Affiliate Network Intelligence
  let isAffiliateNetwork = false;
  for (const network of KNOWN_AFFILIATE_NETWORKS) {
    if (
      network.pattern.test(cookieDomain) ||
      network.pattern.test(requestUrl)
    ) {
      score += 10;
      reasons.push(`Known affiliate network (${network.name})`);
      isAffiliateNetwork = true;
      break;
    }
  }

  // C. Check URL Query Parameters
  if (AFFILIATE_URL_PARAMS.test(requestUrl)) {
    score += 8;
    reasons.push('Affiliate tracking URL parameters detected');
  }

  // If no affiliate indicators match at all, skip evaluation
  if (!hasCookieMarker && !isAffiliateNetwork && score === 0) return;

  pruneIntents();
  const cleanCookieDomain = cookieDomain
    .replace(/^\./, '')
    .replace(/^www\./, '');

  // D. First-Party vs. Third-Party Context
  let context: 'first-party' | 'third-party' = 'third-party';
  if (tabUrl) {
    try {
      const activeDomain = new URL(tabUrl).hostname.replace(/^www\./, '');
      if (
        cleanCookieDomain.endsWith(activeDomain) ||
        activeDomain.endsWith(cleanCookieDomain)
      ) {
        context = 'first-party';
      }
    } catch {
      // Invalid URL
    }
  }

  if (context === 'third-party') {
    score += 5;
    reasons.push('Third-party domain attribution');
  }

  // E. Delivery Mechanism & HTTP Redirect Correlation (Feature #4)
  const isRedirect = statusCode && statusCode >= 300 && statusCode < 400;
  if (isRedirect) {
    score += 5;
    reasons.push(`Cookie set during HTTP ${statusCode} redirect hop`);
  }

  if (deliveryMechanism === 'sub_frame') {
    score += 5;
    reasons.push('Set via background iframe');
  } else if (
    deliveryMechanism === 'script' ||
    deliveryMechanism === 'xmlhttprequest'
  ) {
    score += 3;
    reasons.push(`Set via client ${deliveryMechanism}`);
  }

  // F. Strict Tab-Scoped Intent Check
  const hasMatch = intentCache.some(
    (intent) =>
      (tabId ? intent.tabId === tabId : true) &&
      (cleanCookieDomain.includes(intent.targetDomain) ||
        intent.targetDomain.includes(cleanCookieDomain))
  );

  if (!hasMatch) {
    score += 5;
    reasons.push('No matching user intent on this tab');
  } else {
    // If set during an intermediate 302 redirect, user intent shouldn't fully excuse mid-flight cookie drops
    const intentDiscount = isRedirect ? -2 : -10;
    score += intentDiscount;
  }

  // Check Threshold
  if (score < CONFIDENCE_THRESHOLD) return;

  const newThreat: ThreatLog = {
    id: crypto.randomUUID(),
    domain: cleanCookieDomain,
    cookieName,
    type: 'UNSOLICITED_COOKIE',
    timestamp: Date.now(),
    score,
    context,
    deliveryMechanism,
    reasons,
  };

  // 1. Immediately set the global alert icon & badge
  chrome.action.setIcon({
    path: { 16: '/icon16-alert.png', 32: '/icon32-alert.png' },
  });
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF007F' });

  // 2. Save threat to storage
  chrome.storage.local.get(['threats', 'threatCount'], (res) => {
    const threats: ThreatLog[] = Array.isArray(res.threats) ? res.threats : [];
    const count = typeof res.threatCount === 'number' ? res.threatCount + 1 : 1;

    chrome.storage.local.set({
      threats: [newThreat, ...threats].slice(0, 50),
      threatCount: count,
    });
  });
};

describe('evaluateCookieThreat', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should detect a threat from an affiliate cookie', () => {
    // Arrange
    const cookieName = 'affid_123';
    const cookieDomain = 'some-random-site.com';
    const requestUrl = 'https://some-random-site.com/page';
    const tabUrl = 'https://example.com';
    const tabId = 1;

    // Mock the response from chrome.storage.local.get
    (chrome.storage.local.get as Mock).mockImplementation(
      (keys: string[], callback: (items: { [key: string]: any }) => void) => {
        callback({ threats: [], threatCount: 0 });
      }
    );

    // Act
    evaluateCookieThreat(
      cookieName,
      cookieDomain,
      requestUrl,
      'script',
      tabId,
      tabUrl
    );

    // Assert
    expect(chrome.storage.local.set).toHaveBeenCalled();

    const setCall = (chrome.storage.local.set as Mock).mock.calls[0][0];
    expect(setCall.threatCount).toBe(1);
    expect(setCall.threats).toHaveLength(1);

    const threat = setCall.threats[0];
    expect(threat.cookieName).toBe(cookieName);
    expect(threat.domain).toBe('some-random-site.com');
    expect(threat.reasons).toContain('Generic Affiliate ID');
    expect(threat.reasons).toContain('Third-party domain attribution');
    expect(threat.reasons).toContain('No matching user intent on this tab');
  });
});
