import type { UserIntent, ThreatLog } from '../types';
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
  const { intentCache, pageStartTimes, inNavDict, pruneIntents } = context;

  const cleanCookieDomain = cookieDomain
    .replace(/^\./, '')
    .replace(/^www\./, '');

  // 0. Absolute Ad-Tech Suppression
  if (isAdTechDomain(cleanCookieDomain)) {
    return;
  }

  const isLegitInfra = isLegitimateInfrastructureDomain(cleanCookieDomain);

  // =================================================================
  // STAGE 1: Affiliate Identification (Binary Check)
  // =================================================================
  let isAffiliate = false;
  const reasons: string[] = [];

  for (const marker of AFFILIATE_COOKIE_MARKERS) {
    if (marker.pattern.test(cookieName)) {
      isAffiliate = true;
      reasons.push(`Affiliate marker: ${marker.label}`);
      break;
    }
  }

  for (const network of KNOWN_AFFILIATE_NETWORKS) {
    if (
      network.pattern.test(cookieDomain) ||
      network.pattern.test(requestUrl)
    ) {
      isAffiliate = true;
      reasons.push(`Affiliate network: ${network.name}`);
      break;
    }
  }

  if (AFFILIATE_URL_PARAMS.test(requestUrl)) {
    isAffiliate = true;
    reasons.push('Affiliate/UTM tracking URL parameters');
  }

  if (!isAffiliate) return;

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
  if (!hasIntentMatch) reasons.push('No matching user intent');

  // Signal 2: Delivery Mechanism (Weight 0.20)
  let s2_delivery = 0.0;
  if (deliveryMechanism === 'sub_frame') {
    s2_delivery = 1.0;
    reasons.push('Set via background iframe');
  } else if (
    deliveryMechanism === 'script' ||
    deliveryMechanism === 'xmlhttprequest'
  ) {
    s2_delivery = 0.6;
    reasons.push(`Set via client ${deliveryMechanism}`);
  }

  // Signal 3: LZ Novelty (Weight 0.20)
  const isNovelDomain = !inNavDict(cleanCookieDomain);
  const s3_lzNovelty = isNovelDomain ? 1.0 : 0.0;
  if (isNovelDomain)
    reasons.push('Novel domain (unvisited in navigation history)');

  // Signal 4: HTTP Redirect Hop (Weight 0.15)
  const isRedirect = !!(statusCode && statusCode >= 300 && statusCode < 400);
  const s4_redirect = isRedirect ? 1.0 : 0.0;
  if (isRedirect) reasons.push(`Set during HTTP ${statusCode} redirect hop`);

  // Signal 5: Early Timing (Weight 0.10)
  let s5_earlyTiming = 0.0;
  if (tabId && pageStartTimes.has(tabId) && requestTimeStamp) {
    const pageStart = pageStartTimes.get(tabId)!;
    const elapsedMs = requestTimeStamp - pageStart;

    if (elapsedMs >= 0 && elapsedMs < 500) {
      s5_earlyTiming = 1.0;
      reasons.push(
        `Fired during initial page load (${Math.round(elapsedMs)}ms)`
      );
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

  // Calculate Base Normalized Suspicion Score (0.0 to 1.0)
  let normalizedSuspicion =
    s1_noIntent * 0.3 +
    s2_delivery * 0.2 +
    s3_lzNovelty * 0.2 +
    s4_redirect * 0.15 +
    s5_earlyTiming * 0.1 +
    s6_thirdParty * 0.05;

  // Combination Stealth Boosts
  if (s1_noIntent === 1.0 && s2_delivery === 1.0 && s3_lzNovelty === 1.0) {
    normalizedSuspicion += 0.25; // Hidden iframe + No Intent + Novel Domain
    reasons.push(
      'High-risk stealth combination: Hidden iframe + No Intent + Novel Domain'
    );
  }

  if (s1_noIntent === 1.0 && s4_redirect === 1.0 && s3_lzNovelty === 1.0) {
    normalizedSuspicion += 0.2; // Silent 302 Hop + No Intent + Novel Domain
    reasons.push(
      'High-risk stealth combination: Silent 302 Hop + No Intent + Novel Domain'
    );
  }

  // Infrastructure & User Intent Discounts
  if (isLegitInfra) {
    normalizedSuspicion *= 0.1; // 90% discount for trusted infrastructure
  }

  if (hasIntentMatch) {
    normalizedSuspicion *= isRedirect ? 0.5 : 0.2; // 80% discount for intentional click
  }

  // Scale Final Normalized Score to Integer 0 - 100
  const score = Math.min(
    100,
    Math.max(0, Math.round(normalizedSuspicion * 100))
  );

  if (score < CONFIDENCE_THRESHOLD) return;

  return {
    domain: cleanCookieDomain,
    cookieName,
    type: 'UNSOLICITED_COOKIE',
    score,
    context: threatContext,
    deliveryMechanism,
    reasons,
  };
};
