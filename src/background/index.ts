import type { UserIntent, ThreatLog } from '../types';

const INTENT_EXPIRY_MS = 4000;
let intentCache: UserIntent[] = [];

const pruneIntents = () => {
  const now = Date.now();
  intentCache = intentCache.filter(
    (item) => now - item.timestamp < INTENT_EXPIRY_MS
  );
};

const AFFILIATE_MARKERS = [
  { pattern: /aff_id|affid/i, score: 10, label: 'Affiliate ID parameter' },
  { pattern: /clickid|cj_data/i, score: 9, label: 'Click tracking identifier' },
  { pattern: /partner/i, score: 7, label: 'Partner tracking marker' },
  { pattern: /tag/i, score: 5, label: 'Generic tag parameter' },
  { pattern: /ref/i, score: 3, label: 'Referral marker' },
];

const CONFIDENCE_THRESHOLD = 5;

// 1. Listen for user intent
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    message.type === 'REGISTER_USER_INTENT' &&
    sender.tab?.id &&
    sender.tab.url
  ) {
    try {
      const url = new URL(message.targetUrl);
      intentCache.push({
        targetUrl: message.targetUrl,
        targetDomain: url.hostname.replace(/^www\./, ''),
        timestamp: message.timestamp,
        tabId: sender.tab.id,
        sourceUrl: sender.tab.url,
        interaction: { type: 'click' },
      });
      pruneIntents();
      sendResponse({ status: 'INTENT_ACKNOWLEDGED' });
    } catch {
      // Invalid URL
    }
  }
  return true;
});

// Helper to evaluate and record threats dynamically
const evaluateCookieThreat = (
  cookieName: string,
  cookieDomain: string,
  deliveryMechanism: string,
  tabId?: number,
  tabUrl?: string
) => {
  let score = 0;
  const reasons: string[] = [];

  // A. Affiliate Cookie Name Score
  for (const marker of AFFILIATE_MARKERS) {
    if (marker.pattern.test(cookieName)) {
      score += marker.score;
      reasons.push(marker.label);
      break;
    }
  }

  if (score === 0) return; // Not an affiliate-related cookie

  pruneIntents();
  const cleanCookieDomain = cookieDomain
    .replace(/^\./, '')
    .replace(/^www\./, '');

  // B. Dynamic First-Party vs Third-Party Detection
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
      // Invalid tab URL
    }
  }

  if (context === 'third-party') {
    score += 5;
    reasons.push('Third-party domain attribution');
  }

  // C. Delivery Mechanism Scoring
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

  // D. Tab-Scoped Intent Verification
  const hasMatch = intentCache.some(
    (intent) =>
      (tabId ? intent.tabId === tabId : true) &&
      (cleanCookieDomain.includes(intent.targetDomain) ||
        intent.targetDomain.includes(cleanCookieDomain))
  );

  if (!hasMatch) {
    score += 5;
    reasons.push('No matching user intent/interaction');
  } else {
    score -= 10; // Discount score if legitimate intent was registered
  }

  // Final Threshold Check
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

  chrome.action.setIcon({
    path: { 16: '/icon16-alert.png', 32: '/icon32-alert.png' },
    ...(tabId && { tabId }),
  });

  chrome.action.setBadgeText({ text: '!', ...(tabId && { tabId }) });
  chrome.action.setBadgeBackgroundColor({ color: '#FF007F' });

  chrome.storage.local.get(['threats', 'threatCount'], (res) => {
    const threats: ThreatLog[] = Array.isArray(res.threats) ? res.threats : [];
    const count = typeof res.threatCount === 'number' ? res.threatCount + 1 : 1;

    chrome.storage.local.set({
      threats: [newThreat, ...threats].slice(0, 50),
      threatCount: count,
    });
  });
};

// Listener 1: HTTP Response Headers
chrome.webRequest.onHeadersReceived.addListener(
  (details): any => {
    if (details.responseHeaders) {
      for (const header of details.responseHeaders) {
        if (header.name.toLowerCase() === 'set-cookie' && header.value) {
          const cookieName = header.value.split('=')[0].trim();
          const requestDomain = new URL(details.url).hostname;

          // Fetch tab URL for first/third party context
          if (details.tabId >= 0) {
            chrome.tabs.get(details.tabId, (tab) => {
              evaluateCookieThreat(
                cookieName,
                requestDomain,
                details.type,
                details.tabId,
                tab?.url
              );
            });
          } else {
            evaluateCookieThreat(cookieName, requestDomain, details.type);
          }
        }
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders']
);

// Listener 2: Client-side cookies
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.removed) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    evaluateCookieThreat(
      changeInfo.cookie.name,
      changeInfo.cookie.domain,
      changeInfo.cause === 'explicit' ? 'script' : 'http_header',
      activeTab?.id,
      activeTab?.url
    );
  });
});
