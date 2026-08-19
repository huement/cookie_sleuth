import type { UserIntent, ThreatLog } from '../types';
import {
  AFFILIATE_COOKIE_MARKERS,
  KNOWN_AFFILIATE_NETWORKS,
} from '../constants/affiliate';

const INTENT_EXPIRY_MS = 4000;
let intentCache: UserIntent[] = [];

// Clean up expired user intents
const pruneIntents = () => {
  const now = Date.now();
  intentCache = intentCache.filter(
    (item) => now - item.timestamp < INTENT_EXPIRY_MS
  );
};

// Affiliate Cookie Name Fingerprints and Network Markers
// Are Loaded From Constants.

// Affiliate URL Query Parameters
const AFFILIATE_URL_PARAMS =
  /[?&](aff(?:iliate)?[_-]?id|affid|click[_-]?id|cj[_-]?data|irclickid|sub[_-]?id|sid|partner[_-]?id|pid|campaign[_-]?id|cid|ref(?:errer|id)?|tag|source|utm_source|utm_medium|utm_campaign|awc|ranMID|ranEAID|tduid|phg)=/i;

const CONFIDENCE_THRESHOLD = 5;

// Restore alert icon state on service worker startup if uncleared threats exist
chrome.storage.local.get(['threats'], (res) => {
  if (Array.isArray(res.threats) && res.threats.length > 0) {
    chrome.action.setIcon({
      path: { 16: '/icon16-alert.png', 32: '/icon32-alert.png' },
    });
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF007F' });
  }
});

// Register Intent from Content Script
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

// Threat Evaluation Engine
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

// Listener 1: HTTP Response Headers (Catches 301/302 Redirects, Fetch, XHR)
chrome.webRequest.onHeadersReceived.addListener(
  (details): any => {
    if (details.responseHeaders) {
      for (const header of details.responseHeaders) {
        if (header.name.toLowerCase() === 'set-cookie' && header.value) {
          const cookieName = header.value.split('=')[0].trim();
          const requestDomain = new URL(details.url).hostname;
          const initiatorUrl = details.initiator
            ? `${details.initiator}/`
            : undefined;

          if (details.tabId >= 0) {
            chrome.tabs.get(details.tabId, (tab) => {
              evaluateCookieThreat(
                cookieName,
                requestDomain,
                details.url,
                details.type,
                details.tabId,
                tab?.url || initiatorUrl,
                details.statusCode // <-- PASSES HTTP STATUS CODE (e.g. 302)
              );
            });
          } else {
            evaluateCookieThreat(
              cookieName,
              requestDomain,
              details.url,
              details.type,
              undefined,
              initiatorUrl,
              details.statusCode
            );
          }
        }
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders']
);

// Listener 2: Client-side Cookie Changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.removed) return;

  const cleanDomain = changeInfo.cookie.domain
    .replace(/^\./, '')
    .replace(/^www\./, '');

  const matchingIntent = intentCache.find(
    (intent) =>
      cleanDomain.includes(intent.targetDomain) ||
      intent.targetDomain.includes(cleanDomain)
  );

  if (matchingIntent?.tabId) {
    chrome.tabs.get(matchingIntent.tabId, (tab) => {
      evaluateCookieThreat(
        changeInfo.cookie.name,
        changeInfo.cookie.domain,
        tab?.url || '',
        changeInfo.cause === 'explicit' ? 'script' : 'http_header',
        matchingIntent.tabId,
        tab?.url
      );
    });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      evaluateCookieThreat(
        changeInfo.cookie.name,
        changeInfo.cookie.domain,
        activeTab?.url || '',
        changeInfo.cause === 'explicit' ? 'script' : 'http_header',
        activeTab?.id,
        activeTab?.url
      );
    });
  }
});
