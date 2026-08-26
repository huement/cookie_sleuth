import { describe, it, expect } from 'vitest';
import { evaluateCookieThreat } from '../threatEvaluator';

describe('threatEvaluator Stage 0 & Stage 2 Engine v3.0 Tests', () => {
  const baseContext = {
    intentCache: [],
    pageStartTimes: new Map<number, number>(),
    inNavDict: () => false,
    pruneIntents: () => {},
    whitelistedDomains: ['trustedpartner.com'],
  };

  it('Stage 0: Early exit for whitelisted domains', () => {
    const result = evaluateCookieThreat(
      {
        cookieName: 'aff_id',
        cookieDomain: 'trustedpartner.com',
        requestUrl: 'https://trustedpartner.com/track?affid=99',
        deliveryMechanism: 'sub_frame',
      },
      baseContext
    );

    expect(result).toBeUndefined();
  });

  it('Stage 0: Early exit for programmatic ad-tech domain (adsrvr.org)', () => {
    const result = evaluateCookieThreat(
      {
        cookieName: 'tuuid',
        cookieDomain: 'adsrvr.org',
        requestUrl: 'https://adsrvr.org/track',
        deliveryMechanism: 'script',
      },
      baseContext
    );

    expect(result).toBeUndefined();
  });

  it('Stage 2: Flags high-confidence stealth cookie (Hidden Iframe + No Intent + Novel Domain)', () => {
    const result = evaluateCookieThreat(
      {
        cookieName: 'irclickid',
        cookieDomain: 'covert-affiliate.com',
        requestUrl: 'https://covert-affiliate.com/pixel?aff_id=123',
        deliveryMechanism: 'sub_frame',
      },
      {
        ...baseContext,
        whitelistedDomains: [],
      }
    );

    expect(result).toBeDefined();
    expect(result?.score).toBeGreaterThanOrEqual(80);
    expect(result?.type).toBe('UNSOLICITED_COOKIE');
    expect(result?.reasons).toContain(
      'High-risk stealth combination: Hidden iframe + No Intent + Novel Domain'
    );
  });

  // it('should heavily discount threat score when matching user intent exists', () => {
  //   baseContext.intentCache = [
  //     {
  //       targetDomain: 'affiliate-merchant.com',
  //       timestamp: Date.now(),
  //       tabId: 1,
  //       sourceUrl: 'https://example.com',
  //       targetUrl: 'https://affiliate-merchant.com',
  //       interaction: { type: 'click' },
  //     },
  //   ];

  //   const result = evaluateCookieThreat(
  //     {
  //       cookieName: 'aff_id',
  //       cookieDomain: 'affiliate-merchant.com',
  //       requestUrl: 'https://affiliate-merchant.com/buy?aff_id=777',
  //       deliveryMechanism: 'main_frame',
  //       tabId: 1,
  //       tabUrl: 'https://affiliate-merchant.com',
  //     },
  //     baseContext
  //   );

  //   // Score should be suppressed or fall below CONFIDENCE_THRESHOLD (45)
  //   expect(result).toBeUndefined();
  // });

  it('should apply early page-load timing penalty when dropped under 500ms', () => {
    const tabId = 42;
    const navStart = 10000;
    baseContext.pageStartTimes.set(tabId, navStart);

    const result = evaluateCookieThreat(
      {
        cookieName: 'irclickid',
        cookieDomain: 'fast-drop-tracker.net',
        requestUrl: 'https://fast-drop-tracker.net/track?irclickid=999',
        deliveryMechanism: 'script',
        tabId,
        requestTimeStamp: navStart + 150, // 150ms after load (impossible human click)
      },
      baseContext
    );

    expect(result).toBeDefined();
    expect(
      result?.reasons.some((r) => r.includes('Fired during initial page load'))
    ).toBe(true);
  });
});
