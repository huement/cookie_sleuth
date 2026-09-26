import type { UserIntent, ThreatLog, Signal } from '../types';
import {
  AFFILIATE_COOKIE_MARKERS,
  KNOWN_AFFILIATE_NETWORKS,
  isAdTechDomain,
  isLegitimateInfrastructureDomain,
} from '../constants/affiliate';

const AFFILIATE_URL_PARAMS =
  /[?&](aff(?:iliate)?[_-]?id|affid|click[_-]?id|cj[_-]?data|irclickid|sub[_-]?id|sid|partner[_-]?id|pid|campaign[_-]?id|cid|ref(?:errer|id)?|tag|source|utm_source|utm_medium|utm_campaign|awc|ranMID|ranEAID|tduid|phg)=/i;

// Minimum Normalized Threshold (0 - 100 Scale)
const CONFIDENCE_THRESHOLD = 45;

type EvaluateCookieThreatArgs = {
  cookieName: string;
  cookieDomain: string;
  requestUrl: string;
  deliveryMechanism: string;
  tabId?: number;
  tabUrl?: string;
  statusCode?: number;
  requestTimeStamp?: number;
};

type ThreatEvaluationContext = {
  intentCache: UserIntent[];
  pageStartTimes: Map<number, number>;
  inNavDict: (domain: string) => boolean;
  pruneIntents: () => void;
  whitelistedDomains?: string[];
};

export interface ThreatEvaluationParams {
  cookieName: string;
  cookieDomain: string;
  tabDomain: string;
  deliveryChannel: 'main_frame' | 'script' | 'sub_frame' | 'fetch';
  hasUserIntent: boolean;
  inNavDict: boolean;
  is302Redirect: boolean;
  timeDeltaMs: number;
  whitelistedDomains?: string[];
}

export const evaluateCookieThreat = (
  args: EvaluateCookieThreatArgs,
  context: ThreatEvaluationContext
): Omit<ThreatLog, 'id' | 'timestamp'> | undefined => {
  const {
    cookieName,
    cookieDomain,
    requestUrl,
    deliveryMechanism,
    tabId,
    tabUrl,
    statusCode,
    requestTimeStamp,
  } = args;
  const {
    intentCache,
    pageStartTimes,
    inNavDict,
    pruneIntents,
    whitelistedDomains = [],
  } = context;

  const cleanCookieDomain = cookieDomain
    .replace(/^\./, '')
    .replace(/^www\./, '')
    .toLowerCase();

  // STAGE 0: User Whitelist Suppression (Early Exit)
  if (
    whitelistedDomains.some(
      (d) => cleanCookieDomain === d || cleanCookieDomain.endsWith('.' + d)
    )
  ) {
    return;
  }

  // STAGE 0: Absolute Ad-Tech Suppression
  if (isAdTechDomain(cleanCookieDomain)) {
    return;
  }

  const isLegitInfra = isLegitimateInfrastructureDomain(cleanCookieDomain);

  // =================================================================
  // STAGE 1: Affiliate Identification (Binary Check)
  // =================================================================

  const signals: Signal[] = [];

  for (const marker of AFFILIATE_COOKIE_MARKERS) {
    if (marker.pattern.test(cookieName)) {
      signals.push({
        id: 'affiliate-marker',
        label: `Affiliate marker: ${marker.label}`,
        weight: 0,
        description:
          'The cookie name matches a known affiliate marketing pattern.',
      });
      break;
    }
  }

  for (const network of KNOWN_AFFILIATE_NETWORKS) {
    if (
      network.pattern.test(cookieDomain) ||
      network.pattern.test(requestUrl)
    ) {
      signals.push({
        id: 'affiliate-network',
        label: `Affiliate network: ${network.name}`,
        weight: 0,
        description:
          'The cookie domain or request URL matches a known affiliate network.',
      });
      break;
    }
  }

  if (AFFILIATE_URL_PARAMS.test(requestUrl)) {
    signals.push({
      id: 'affiliate-url-params',
      label: 'Affiliate/UTM tracking URL parameters',
      weight: 0,
      description:
        'The request URL contains common affiliate or UTM tracking parameters.',
    });
  }

  pruneIntents();

  // =================================================================
  // STAGE 2: Normalized Multi-Signal Suspicion Engine (0.0 to 1.0)
  // =================================================================

  // Signal 1: User Intent (Weight 0.30)
  const hasIntentMatch = intentCache.some(
    (intent) =>
      (tabId ? intent.tabId === tabId : true) &&
      (cleanCookieDomain.includes(intent.targetDomain) ||
        intent.targetDomain.includes(cleanCookieDomain))
  );
  const s1_noIntent = hasIntentMatch ? 0.0 : 1.0;
  if (!hasIntentMatch)
    signals.push({
      id: 'no-user-intent',
      label: 'No matching user intent',
      weight: 30,
      description:
        'No recent user interaction (like a click) was found that led to this cookie being set.',
    });

  // Signal 2: Delivery Mechanism (Weight 0.20)
  let s2_delivery = 0.0;
  if (deliveryMechanism === 'sub_frame') {
    s2_delivery = 1.0;
    signals.push({
      id: 'delivery-sub-frame',
      label: 'Set via background iframe',
      weight: 20,
      description:
        'The cookie was set by a hidden iframe, a common technique for cookie stuffing.',
    });
  } else if (
    deliveryMechanism === 'script' ||
    deliveryMechanism === 'xmlhttprequest'
  ) {
    s2_delivery = 0.6;
    signals.push({
      id: 'delivery-script',
      label: `Set via client ${deliveryMechanism}`,
      weight: 12,
      description:
        'The cookie was set by a script, which can be used for cookie stuffing.',
    });
  }

  // Signal 3: LZ Novelty (Weight 0.20)
  const isNovelDomain = !inNavDict(cleanCookieDomain);
  const s3_lzNovelty = isNovelDomain ? 1.0 : 0.0;
  if (isNovelDomain)
    signals.push({
      id: 'novel-domain',
      label: 'Novel domain (unvisited in navigation history)',
      weight: 20,
      description:
        'This domain has not been visited before in your navigation history, which can be suspicious.',
    });

  // Signal 4: HTTP Redirect Hop (Weight 0.15)
  const isRedirect = !!(statusCode && statusCode >= 300 && statusCode < 400);
  const s4_redirect = isRedirect ? 1.0 : 0.0;
  if (isRedirect)
    signals.push({
      id: 'redirect-hop',
      label: `Set during HTTP ${statusCode} redirect hop`,
      weight: 15,
      description:
        'The cookie was set during a redirect, which can be a sign of cookie stuffing.',
    });

  // Signal 5: Early Timing (Weight 0.10)
  let s5_earlyTiming = 0.0;
  if (tabId && pageStartTimes.has(tabId) && requestTimeStamp) {
    const pageStart = pageStartTimes.get(tabId)!;
    const elapsedMs = requestTimeStamp - pageStart;

    if (elapsedMs >= 0 && elapsedMs < 500) {
      s5_earlyTiming = 1.0;
      signals.push({
        id: 'early-timing',
        label: `Fired during initial page load (${Math.round(elapsedMs)}ms)`,
        weight: 10,
        description:
          'The cookie was set very early during page load, which can be a sign of cookie stuffing.',
      });
    } else if (elapsedMs >= 500 && elapsedMs < 2000) {
      s5_earlyTiming = Math.max(0, 1 - (elapsedMs - 500) / 1500);
    }
  }

  // Signal 6: Third-Party Context (Weight 0.05)
  let threatContext: 'first-party' | 'third-party' = 'third-party';
  if (tabUrl) {
    try {
      const activeDomain = new URL(tabUrl).hostname.replace(/^www\./, '');
      if (
        cleanCookieDomain.endsWith(activeDomain) ||
        activeDomain.endsWith(cleanCookieDomain)
      ) {
        threatContext = 'first-party';
      }
    } catch {
      // Invalid URL
    }
  }
  const s6_thirdParty = threatContext === 'third-party' ? 1.0 : 0.0;
  if (s6_thirdParty > 0) {
    signals.push({
      id: 'third-party-context',
      label: 'Set in a third-party context',
      weight: 5,
      description:
        'The cookie was set in a third-party context, which is common for tracking cookies.',
    });
  }

  // Combination Stealth Boosts
  if (s1_noIntent === 1.0 && s2_delivery === 1.0 && s3_lzNovelty === 1.0) {
    signals.push({
      id: 'stealth-combo-1',
      label:
        'High-risk stealth combination: Hidden iframe + No Intent + Novel Domain',
      weight: 25,
      description:
        'A combination of high-risk signals was detected, strongly indicating cookie stuffing.',
    });
  }

  if (s1_noIntent === 1.0 && s4_redirect === 1.0 && s3_lzNovelty === 1.0) {
    signals.push({
      id: 'stealth-combo-2',
      label:
        'High-risk stealth combination: Silent 302 Hop + No Intent + Novel Domain',
      weight: 20,
      description:
        'A combination of high-risk signals was detected, strongly indicating cookie stuffing.',
    });
  }

  let score = signals.reduce((acc, signal) => acc + signal.weight, 0);

  // Infrastructure & User Intent Discounts
  if (isLegitInfra) {
    score *= 0.1; // 90% discount for trusted infrastructure
  }

  if (hasIntentMatch) {
    score *= isRedirect ? 0.5 : 0.2; // 80% discount for intentional click
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  return {
    domain: cleanCookieDomain,
    cookieName,
    type: 'UNSOLICITED_COOKIE',
    score,
    context: threatContext,
    deliveryMechanism,
    signals,
  };
};
