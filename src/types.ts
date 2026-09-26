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

export interface Signal {
  id: string;
  label: string;
  weight: number;
  description: string;
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
  signals: Signal[]; // Dynamic explanation breakdown
}

export interface ThreatEvaluationContext {
  intentCache: UserIntent[];
  pageStartTimes: Map<number, number>;
  inNavDict: (domain: string) => boolean;
  pruneIntents: () => void;
  whitelistedDomains?: string[];
}
