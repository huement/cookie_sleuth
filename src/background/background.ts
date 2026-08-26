import type { UserIntent, ThreatLog } from '../types';
import { evaluateCookieThreat as evaluate } from './threatEvaluator';

// --- STATE MANAGEMENT ---
const INTENT_EXPIRY_MS = 4000;
let intentCache: UserIntent[] = [];
const pageStartTimes = new Map<number, number>();
let navDict = new Set<string>();
let whitelistedDomains: string[] = [];

// Session Metrics
let totalCookieEvents = 0;
let novelCookieEvents = 0;

const updateSessionMetricsInStorage = () => {
  const lzNoveltyRate =
    totalCookieEvents > 0
      ? Math.round((novelCookieEvents / totalCookieEvents) * 100)
      : 0;

  chrome.storage.local.set({
    navDictSize: navDict.size,
    lzNoveltyRate,
  });
};

// --- INITIAL STORAGE RECOVERY ---
chrome.storage.local.get(
  ['navDict', 'whitelistedDomains', 'threats'],
  (res) => {
    if (Array.isArray(res.navDict)) {
      navDict = new Set(res.navDict);
    }
    if (Array.isArray(res.whitelistedDomains)) {
      whitelistedDomains = res.whitelistedDomains;
    } else {
      whitelistedDomains = [];
    }
    if (Array.isArray(res.threats) && res.threats.length > 0) {
      chrome.action.setIcon({
        path: { 16: '/icon16-alert.png', 32: '/icon32-alert.png' },
      });
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF007F' });
    }
  }
);

// Sync whitelist changes dynamically when the user trusts or untrusts a domain
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.whitelistedDomains) {
    const newValue = changes.whitelistedDomains.newValue;
    whitelistedDomains = Array.isArray(newValue) ? newValue : [];
  }
});

// --- NAVIGATION DICTIONARY (LZ NOVELTY) ---
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const scheduleSaveNavDict = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    chrome.storage.local.set({
      navDict: Array.from(navDict),
      navDictSize: navDict.size,
    });
  }, 3000);
};

const inNavDict = (domain: string): boolean => {
  if (!domain) return false;
  const clean = domain
    .replace(/^\./, '')
    .replace(/^www\./, '')
    .toLowerCase();

  if (navDict.has(clean)) return true;

  const parts = clean.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    if (navDict.has(parts.slice(i).join('.'))) return true;
  }
  return false;
};

// --- RETROACTIVE DOMAIN DE-RISKING ---
const deRiskDomain = (hostname: string) => {
  const cleanHost = hostname.replace(/^www\./, '').toLowerCase();
  const parts = cleanHost.split('.');
  const apex = parts.length > 2 ? parts.slice(-2).join('.') : cleanHost;

  chrome.storage.local.get(['threats'], (res) => {
    if (!Array.isArray(res.threats) || res.threats.length === 0) return;

    const remainingThreats = res.threats.filter((threat: ThreatLog) => {
      const threatDomain = threat.domain.toLowerCase();
      const isDeRisked =
        threatDomain === cleanHost ||
        threatDomain.endsWith('.' + apex) ||
        apex.endsWith('.' + threatDomain);

      return !isDeRisked;
    });

    if (remainingThreats.length !== res.threats.length) {
      chrome.storage.local.set({
        threats: remainingThreats,
        threatCount: remainingThreats.length,
      });

      if (remainingThreats.length === 0) {
        chrome.action.setIcon({
          path: { 16: '/icon16.png', 32: '/icon32.png' },
        });
        chrome.action.setBadgeText({ text: '' });
      }
    }
  });
};

const addToNavDict = (hostname: string) => {
  if (!hostname || hostname === 'localhost') return;
  const cleanHost = hostname.replace(/^www\./, '').toLowerCase();

  let changed = false;
  if (!navDict.has(cleanHost)) {
    navDict.add(cleanHost);
    changed = true;
  }

  const parts = cleanHost.split('.');
  if (parts.length > 2) {
    const apex = parts.slice(-2).join('.');
    if (!navDict.has(apex)) {
      navDict.add(apex);
      changed = true;
    }
  }

  if (changed) {
    scheduleSaveNavDict();
    deRiskDomain(cleanHost);
  }
};

const pruneIntents = () => {
  const now = Date.now();
  intentCache = intentCache.filter(
    (item) => now - item.timestamp < INTENT_EXPIRY_MS
  );
};

// --- THREAT EVALUATION WRAPPER ---
const evaluateCookieThreat = (
  cookieName: string,
  cookieDomain: string,
  requestUrl: string,
  deliveryMechanism: string,
  tabId?: number,
  tabUrl?: string,
  statusCode?: number,
  requestTimeStamp?: number
) => {
  const threatData = evaluate(
    {
      cookieName,
      cookieDomain,
      requestUrl,
      deliveryMechanism,
      tabId,
      tabUrl,
      statusCode,
      requestTimeStamp,
    },
    {
      intentCache,
      pageStartTimes,
      inNavDict,
      pruneIntents,
      whitelistedDomains,
    }
  );

  if (!threatData) return;

  const newThreat: ThreatLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...threatData,
  };

  chrome.action.setIcon({
    path: { 16: '/icon16-alert.png', 32: '/icon32-alert.png' },
  });
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF007F' });

  chrome.storage.local.get(['threats', 'threatCount'], (res) => {
    const threats: ThreatLog[] = Array.isArray(res.threats) ? res.threats : [];
    const count = typeof res.threatCount === 'number' ? res.threatCount + 1 : 1;

    chrome.storage.local.set({
      threats: [newThreat, ...threats].slice(0, 50),
      threatCount: count,
    });
  });

  totalCookieEvents++;
  if (!inNavDict(cookieDomain)) {
    novelCookieEvents++;
  }
  updateSessionMetricsInStorage();
};

// --- LISTENERS ---

// Listener 1: User Intent
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

// Listener 2: HTTP Response Headers
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
              if (chrome.runtime.lastError) return;
              evaluateCookieThreat(
                cookieName,
                requestDomain,
                details.url,
                details.type,
                details.tabId,
                tab?.url || initiatorUrl,
                details.statusCode,
                details.timeStamp
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
              details.statusCode,
              details.timeStamp
            );
          }
        }
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders', 'extraHeaders']
);

// Listener 3: Client-side Cookie Changes
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
      if (chrome.runtime.lastError) return;
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

// Listener 4: Page Start Timing
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    pageStartTimes.set(details.tabId, details.timeStamp);
  }
});

// Listener 5: LZ Dictionary Updates
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0 && details.url) {
    try {
      const hostname = new URL(details.url).hostname;
      addToNavDict(hostname);
    } catch {
      // Invalid URL
    }
  }
});

// Listener 6: Tab Removal Cleanup
chrome.tabs.onRemoved.addListener((tabId) => {
  pageStartTimes.delete(tabId);
});
