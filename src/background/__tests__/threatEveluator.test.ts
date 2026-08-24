import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateCookieThreat } from '../threatEvaluator';
import type { UserIntent } from '../../types';

describe('evaluateCookieThreat - Normalized Engine', () => {
  let navDictSet: Set<string>;

  const mockContext = {
    intentCache: [] as UserIntent[],
    pageStartTimes: new Map<number, number>(),
    inNavDict: (domain: string) => navDictSet.has(domain),
    pruneIntents: vi.fn(),
  };

  beforeEach(() => {
    navDictSet = new Set<string>();
    mockContext.intentCache = [];
    mockContext.pageStartTimes = new Map<number, number>();
  });

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
    expect(result?.score).toBeGreaterThanOrEqual(80); // High confidence stealth boost
    expect(result?.reasons).toContain('Set via background iframe');
    expect(result?.reasons).toContain(
      'High-risk stealth combination: Hidden iframe + No Intent + Novel Domain'
    );
  });

  it('should discount legitimate web infrastructure below threshold', () => {
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

    expect(result).toBeUndefined(); // Discounted below threshold
  });
});
