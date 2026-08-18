export interface UserIntent {
  tabId: number;
  timestamp: number;

  sourceUrl: string;
  targetUrl: string;

  targetDomain: string;

  interaction: {
    type: 'click' | 'auxclick' | 'keyboard' | 'submit';
    element?: string;
    button?: number;
  };
}

export interface ThreatLog {
  id: string;
  domain: string;
  cookieName: string;
  type: 'UNSOLICITED_COOKIE' | 'HIDDEN_REDIRECT';
  timestamp: number;
  score?: number;
  context?: 'first-party' | 'third-party';
  deliveryMechanism: string;
  reasons: string[]; // Dynamic explanation breakdown
}
