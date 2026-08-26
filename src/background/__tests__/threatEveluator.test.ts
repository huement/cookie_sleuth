import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateCookieThreat } from '../threatEvaluator';
import type { UserIntent } from '../../types';

describe('evaluateCookieThreat - Full Pipeline Suite', () => {
  let navDictSet: Set<string>;

  const mockContext = {
    intentCache: [] as UserIntent[],
    pageStartTimes: new Map<number, number>(),
    inNavDict: (domain: string) => navDictSet.has(domain),
    pruneIntents: vi.fn(),
    whitelistedDomains: [] as string[],
  };

  beforeEach(() => {
    navDictSet = new Set<string>();
    mockContext.intentCache = [];
    mockContext.pageStartTimes = new Map<number, number>();
    mockContext.whitelistedDomains = [];
  });

  // =================================================================
  // STAGE 1: SUPPRESSION & IDENTIFICATION TESTS
  // =================================================================

  it('should suppress evaluation if domain is in whitelistedDomains', () => {
    mockContext.whitelistedDomains = ['internal-tracker.com'];

    const result = evaluateCookieThreat(
      {
        cookieName: 'aff_id',
        cookieDomain: 'sub.internal-tracker.com',
        requestUrl: 'https://sub.internal-tracker.com/track?aff_id=999',
        deliveryMechanism: 'sub_frame',
      },
      mockContext
    );

    expect(result).toBeUndefined();
  });

  it('should ignore non-affiliate standard session cookies', () => {
    const result = evaluateCookieThreat(
      {
        cookieName: 'session_token',
        cookieDomain: 'example.com',
        requestUrl: 'https://example.com/api/user',
        deliveryMechanism: 'main_frame',
      },
      mockContext
    );

    expect(result).toBeUndefined();
  });

  it('should discount legitimate web infrastructure below the threat threshold', () => {
    const result = evaluateCookieThreat(
      {
        cookieName: 'PREF',
        cookieDomain: 'youtube.com',
        requestUrl: 'https://youtube.com/embed/123?utm_source=test',
        deliveryMechanism: 'sub_frame',
        tabId: 1,
        tabUrl: 'https://example.com',
      },
      mockContext
    );

    expect(result).toBeUndefined();
  });

  // =================================================================
  // STAGE 2 & 3: MULTI-SIGNAL SCORING & STEALTH BOOSTS
  // =================================================================

  it('should detect a high-confidence threat on an unvisited stealth affiliate iframe', () => {
    const result = evaluateCookieThreat(
      {
        cookieName: 'affid_123',
        cookieDomain: 'stealth-affiliate.com',
        requestUrl: 'https://stealth-affiliate.com/pixel?affid=123',
        deliveryMechanism: 'sub_frame',
        tabId: 1,
        tabUrl: 'https://example.com',
      },
      mockContext
    );

    expect(result).toBeDefined();
    expect(result?.score).toBeGreaterThanOrEqual(80);
    expect(result?.reasons).toContain('Set via background iframe');
    expect(result?.reasons).toContain(
      'High-risk stealth combination: Hidden iframe + No Intent + Novel Domain'
    );
  });

  it('should heavily discount threat score when matching user intent exists', () => {
    mockContext.intentCache = [
      {
        targetDomain: 'affiliate-merchant.com',
        timestamp: Date.now(),
        tabId: 1,
        sourceUrl: 'https://example.com',
        targetUrl: 'https://affiliate-merchant.com',
        interaction: { type: 'click' },
      },
    ];

    const result = evaluateCookieThreat(
      {
        cookieName: 'aff_id',
        cookieDomain: 'affiliate-merchant.com',
        requestUrl: 'https://affiliate-merchant.com/buy?aff_id=777',
        deliveryMechanism: 'main_frame',
        tabId: 1,
        tabUrl: 'https://affiliate-merchant.com',
      },
      mockContext
    );

    // Score should be suppressed or fall below CONFIDENCE_THRESHOLD (45)
    expect(result).toBeUndefined();
  });

  it('should apply early page-load timing penalty when dropped under 500ms', () => {
    const tabId = 42;
    const navStart = 10000;
    mockContext.pageStartTimes.set(tabId, navStart);

    const result = evaluateCookieThreat(
      {
        cookieName: 'irclickid',
        cookieDomain: 'fast-drop-tracker.net',
        requestUrl: 'https://fast-drop-tracker.net/track?irclickid=999',
        deliveryMechanism: 'script',
        tabId,
        requestTimeStamp: navStart + 150, // 150ms after load (impossible human click)
      },
      mockContext
    );

    expect(result).toBeDefined();
    expect(
      result?.reasons.some((r) => r.includes('Fired during initial page load'))
    ).toBe(true);
  });
});
