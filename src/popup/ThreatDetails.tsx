import { HelpCircle, X, Zap, Info } from 'lucide-react';
import { useState } from 'react';
import type { ThreatLog } from '../types';
import {
  PurgeThreatButton,
  TrustDomainButton,
} from '../components/RemediationControls';

interface ReasonDetailSpec {
  title: string;
  weight: string;
  category: string;
  description: string;
  mitigation: string;
}

interface ThreatDetailsProps {
  threat: ThreatLog;
  onRefresh?: () => void;
}

// Map signal reason strings to structured spec explanations
const getReasonSpec = (reasonText: string): ReasonDetailSpec => {
  const lower = reasonText.toLowerCase();

  if (lower.includes('no matching user intent')) {
    return {
      title: 'Missing User Intent Correlation',
      weight: '30% Normalized Weight',
      category: 'Stage 2 // Intent Signal',
      description:
        'No click or pointer interaction was registered on this tab within the 4,000ms intent lookback window for this cookie domain.',
      mitigation:
        'Cookies set without prior user clicks indicate background script execution rather than voluntary user navigation.',
    };
  }

  if (lower.includes('background iframe') || lower.includes('sub_frame')) {
    return {
      title: 'Sub-Frame / Hidden Iframe Delivery',
      weight: '20% Normalized Weight',
      category: 'Stage 2 // Delivery Channel',
      description:
        'The cookie was set inside an invisible sub-frame or background iframe embedded on the current page.',
      mitigation:
        'Hidden 1x1 pixel iframes are a primary stealth vector used by cookie stuffers to silently claim attribution credit.',
    };
  }

  if (lower.includes('client script') || lower.includes('xmlhttprequest')) {
    return {
      title: 'Client Script / XHR Execution',
      weight: '12% Normalized Weight',
      category: 'Stage 2 // Delivery Channel',
      description:
        'Cookie set programmatically via JavaScript DOM mutation (document.cookie) or asynchronous background Fetch/XHR call.',
      mitigation:
        'Client-side script drops execute automatically on page parse without requiring link navigation.',
    };
  }

  if (lower.includes('novel domain')) {
    return {
      title: 'LZ Novelty (Unvisited Domain)',
      weight: '20% Normalized Weight',
      category: 'Stage 2 // Information Theory',
      description:
        'Lempel-Ziv dictionary miss: The domain setting this cookie does not exist in your top-level navigation history.',
      mitigation:
        'Unvisited third-party domains setting affiliate cookies are statistically uncorrelated with explicit user intent.',
    };
  }

  if (lower.includes('redirect')) {
    return {
      title: 'HTTP 302 Redirect Hop',
      weight: '15% Normalized Weight',
      category: 'Stage 2 // HTTP Context',
      description:
        'Cookie was set during an intermediate 301/302 HTTP response header hop prior to reaching the final page target.',
      mitigation:
        'Mid-flight redirect chains frequently route traffic through affiliate tracking nodes to drop tracking tokens.',
    };
  }

  if (lower.includes('initial page load')) {
    return {
      title: 'Page-Load Early Timing (<500ms)',
      weight: '10% Normalized Weight',
      category: 'Stage 2 // Temporal Execution',
      description: 'The cookie was set within 500ms of page load initiation.',
      mitigation:
        'Human reaction time requires at least 150-200ms. Drops under 500ms occur programmatically before human clicks are possible.',
    };
  }

  if (lower.includes('high-risk stealth combination')) {
    return {
      title: 'Multi-Signal Stealth Combination Boost',
      weight: '+20% to +25% Threat Boost',
      category: 'Stage 2 // Compound Anomaly',
      description:
        'Multiple high-severity stealth signals occurred simultaneously (e.g. Hidden Iframe + No Intent + Novel Domain).',
      mitigation:
        'Compound stealth drops represent high-confidence automated cookie stuffing patterns.',
    };
  }

  if (lower.includes('third-party')) {
    return {
      title: 'Third-Party Context Attribution',
      weight: '05% Normalized Weight',
      category: 'Stage 2 // Domain Attribution',
      description:
        'The cookie domain setting attribution does not match the top-level host domain of the active tab.',
      mitigation:
        'Cross-site cookie drops allow external domains to register tracking tokens across unrelated merchant sites.',
    };
  }

  if (
    lower.includes('affiliate marker') ||
    lower.includes('affiliate network') ||
    lower.includes('tracking url parameters')
  ) {
    return {
      title: 'Affiliate Tracking Identification',
      weight: 'Stage 1 // Mandatory Flag',
      category: 'Stage 1 // Fingerprint Match',
      description: `Identified tracking parameters or known network patterns matching "${reasonText}".`,
      mitigation:
        'Confirms this cookie is an affiliate attribution identifier eligible for Stage 2 unsolicited threat evaluation.',
    };
  }

  return {
    title: 'Detection Signal Reason',
    weight: 'Heuristic Evaluation Weight',
    category: 'Stage 2 // Evaluation Signal',
    description: reasonText,
    mitigation: 'Evaluated against normalized multi-signal threat thresholds.',
  };
};

export const ThreatDetails = ({ threat, onRefresh }: ThreatDetailsProps) => {
  const [selectedReason, setSelectedReason] = useState<ReasonDetailSpec | null>(
    null
  );

  const scorePercent = threat.score
    ? threat.score > 1
      ? Math.min(Math.round(threat.score), 100)
      : Math.round(threat.score * 100)
    : 0;

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-red-500 animate-pulse';
    if (score >= 60) return 'text-orange-400';
    if (score >= 45) return 'text-yellow-400';
    return 'text-cyan-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'HIGH CONFIDENCE stuffing';
    if (score >= 60) return 'LIKELY cookie stuffing';
    if (score >= 45) return 'POTENTIALLY unsolicited';
    return 'NO CLEAR threat';
  };

  const reasonsList =
    threat.reasons && threat.reasons.length > 0
      ? threat.reasons
      : ['No matching user interaction', 'Third-party domain attribution'];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2 p-2 bg-zinc-800/60 border border-zinc-700/80 rounded-sm text-xs animate-fadeIn space-y-2 relative"
    >
      {/* SCORE & ACTIONS HEADER (2 ROWS) */}
      <div className="border-b border-zinc-700/50 pb-1.5 space-y-1.5">
        {/* ROW 1: SCORE PERCENT & LABEL */}
        <div className="flex items-center justify-between">
          <p
            className={`font-mono font-bold ${getScoreColorClass(scorePercent)}`}
          >
            {scorePercent}% {getScoreLabel(scorePercent)}
          </p>
        </div>

        {/* ROW 2: REMEDIATION ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-1.5">
          <TrustDomainButton
            domain={threat.domain}
            onActionComplete={onRefresh}
          />
          <PurgeThreatButton threat={threat} onActionComplete={onRefresh} />
        </div>
      </div>

      {/* REASONS LIST */}
      <ul className="space-y-1 text-zinc-300 pt-0.5">
        {reasonsList.map((reasonText, idx) => {
          const spec = getReasonSpec(reasonText);
          return (
            <li
              key={`${reasonText}-${idx}`}
              onClick={() => setSelectedReason(spec)}
              className="flex items-center justify-between group hover:bg-zinc-800/90 p-1 rounded transition-colors cursor-pointer border border-transparent hover:border-cyan-500/30"
              title="Click to view signal specifications"
            >
              <span className="flex items-center gap-1.5 truncate pr-1">
                <span className="w-1 h-1 rounded-full bg-pink-500 flex-shrink-0"></span>
                <span className="truncate text-[11px]">{reasonText}</span>
              </span>

              <div className="flex items-center gap-1 text-zinc-500 group-hover:text-cyan-300 transition-colors flex-shrink-0">
                <HelpCircle className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </li>
          );
        })}
      </ul>

      {/* INDIVIDUAL REASON MODAL OVERLAY */}
      {selectedReason && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReason(null);
          }}
          className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md z-50 p-4 flex flex-col justify-between animate-fadeIn border-2 border-cyan-500/50"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
              <span className="text-xs font-black text-pink-500 tracking-wider flex items-center gap-1.5 uppercase drop-shadow-[0_0_6px_#ff007f]">
                <Zap className="w-4 h-4 text-cyan-400" /> SIGNAL SPECIFICATION
              </span>
              <button
                onClick={() => setSelectedReason(null)}
                className="text-zinc-500 hover:text-pink-500 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] text-zinc-300 leading-relaxed space-y-2.5 font-mono">
              <div className="bg-zinc-900/90 border border-cyan-500/30 p-2 rounded space-y-1">
                <p className="text-[9px] text-cyan-400 uppercase tracking-widest font-bold">
                  {selectedReason.category}
                </p>
                <h4 className="text-xs font-bold text-pink-400">
                  {selectedReason.title}
                </h4>
                <div className="inline-block px-1.5 py-0.5 bg-pink-950/60 border border-pink-500/40 text-pink-300 text-[9px] rounded font-bold">
                  {selectedReason.weight}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-zinc-300 text-[10px] leading-normal">
                  {selectedReason.description}
                </p>
                <div className="p-2 bg-zinc-900/60 border-l-2 border-cyan-400 text-[10px] text-zinc-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>{selectedReason.mitigation}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedReason(null)}
            className="w-full py-1.5 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold text-xs uppercase rounded transition-colors tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.2)] mt-3"
          >
            CLOSE SPEC
          </button>
        </div>
      )}
    </div>
  );
};
