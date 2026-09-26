import {
  HelpCircle,
  X,
  Zap,
  ExternalLink,
  ShieldAlert,
  Layers,
  BookOpen,
  Activity,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import type { ThreatLog, Signal } from '../types';
import {
  PurgeThreatButton,
  TrustDomainButton,
} from '../components/RemediationControls';
import {
  SIGNAL_EXPLANATIONS,
  type SignalExplanation,
} from '../constants/signalExplanations';

interface ThreatDetailsProps {
  threat: ThreatLog;
  onRefresh?: () => void;
}

// SCORE TIER DEFINITIONS FOR THE SCALE MODAL & UNIFIED THEMES
export interface ScoreTier {
  min: number;
  max: number;
  rangeLabel: string;
  label: string;
  textColor: string;
  baseColor: string;
  badgeClass: string;
  activeBorder: string;
  glowShadow: string;
  summary: string;
  explanation: string;
  recommendedAction: string;
}

export const SCORE_TIERS: ScoreTier[] = [
  {
    min: 80,
    max: 100,
    rangeLabel: '80% – 100%',
    label: 'HIGH CONFIDENCE stuffing',
    textColor:
      'text-pink-500 drop-shadow-[0_0_6px_rgba(255,0,127,0.5)] animate-pulse',
    baseColor: 'text-pink-500',
    badgeClass:
      'text-pink-400 bg-pink-950/90 border-pink-500/80 shadow-[0_0_8px_rgba(255,0,127,0.4)]',
    activeBorder: 'border-pink-500 bg-pink-950/40',
    glowShadow: 'shadow-[0_0_15px_rgba(255,0,127,0.4)]',
    summary:
      'Critical threat. Conclusive multi-signal proof of unsolicited affiliate injection.',
    explanation:
      'Multiple high-weight threat indicators (e.g., background iframe execution, unvisited domain drops, and missing user intent) triggered simultaneously. Highly indicative of deceptive extension monetization.',
    recommendedAction:
      'Purge cookie immediately using the DELETE button or NUKE ALL.',
  },
  {
    min: 60,
    max: 79,
    rangeLabel: '60% – 79%',
    label: 'LIKELY cookie stuffing',
    textColor: 'text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.4)]',
    baseColor: 'text-orange-400',
    badgeClass:
      'text-orange-400 bg-orange-950/90 border-orange-500/80 shadow-[0_0_6px_rgba(251,146,60,0.3)]',
    activeBorder: 'border-orange-500 bg-orange-950/40',
    glowShadow: 'shadow-[0_0_15px_rgba(251,146,60,0.35)]',
    summary:
      'Elevated threat level. High probability of silent background injection.',
    explanation:
      'The cookie event registered strong delivery mechanism anomalies (e.g., client scripts or silent redirect hops) without any corresponding user interaction on the active page.',
    recommendedAction:
      'Inspect the triggered details below. Delete if origin is unrecognized.',
  },
  {
    min: 40,
    max: 59,
    rangeLabel: '40% – 59%',
    label: 'POTENTIALLY unsolicited',
    textColor: 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.4)]',
    baseColor: 'text-amber-400',
    badgeClass:
      'text-amber-400 bg-amber-950/90 border-amber-500/80 shadow-[0_0_6px_rgba(251,191,36,0.3)]',
    activeBorder: 'border-amber-400 bg-amber-950/40',
    glowShadow: 'shadow-[0_0_15px_rgba(251,191,36,0.35)]',
    summary:
      'Meets threat threshold (≥45%). Uninvited affiliate parameter presence.',
    explanation:
      'This event contains recognized affiliate tracking markers or redirect network hops. If you clicked a legitimate coupon banner, it may be valid; otherwise, an extension introduced it in the background.',
    recommendedAction:
      'If this is from a cashback tool you intentionally use, click TRUST.',
  },
  {
    min: 20,
    max: 39,
    rangeLabel: '20% – 39%',
    label: 'LOW / UNLIKELY threat',
    textColor: 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.3)]',
    baseColor: 'text-yellow-400',
    badgeClass:
      'text-yellow-400 bg-yellow-950/90 border-yellow-500/80 shadow-[0_0_6px_rgba(250,204,21,0.2)]',
    activeBorder: 'border-yellow-400 bg-yellow-950/40',
    glowShadow: 'shadow-[0_0_12px_rgba(250,204,21,0.25)]',
    summary: 'Sub-threshold event. Low risk with minor tracking parameters.',
    explanation:
      'Minor tracking indicators were present, but strong user intent match or verified infrastructure discounts reduced the overall suspicion score below alert threshold.',
    recommendedAction:
      'No action required. Retained in internal telemetry logs for scoring calibration.',
  },
  {
    min: 0,
    max: 19,
    rangeLabel: '0% – 19%',
    label: 'CLEAN / UNCHECKED',
    textColor: 'text-cyan-400 drop-shadow-[0_0_5px_rgba(0,240,255,0.4)]',
    baseColor: 'text-cyan-400',
    badgeClass:
      'text-cyan-300 bg-cyan-950/90 border-cyan-500/80 shadow-[0_0_6px_rgba(0,240,255,0.2)]',
    activeBorder: 'border-cyan-400 bg-cyan-950/40',
    glowShadow: 'shadow-[0_0_12px_rgba(0,240,255,0.25)]',
    summary: 'Nominal browsing activity matching verified consumer patterns.',
    explanation:
      'The network event aligned directly with user clicks, top-level navigation, or verified non-affiliate web infrastructure.',
    recommendedAction: 'Safe nominal event.',
  },
];

export const getScoreTheme = (score: number = 0) => {
  const matchedTier =
    SCORE_TIERS.find((tier) => score >= tier.min && score <= tier.max) ||
    SCORE_TIERS[4];

  return {
    text: matchedTier.textColor,
    badge: matchedTier.badgeClass,
    label: matchedTier.label,
    baseColor: matchedTier.baseColor,
    tier: matchedTier,
  };
};

export const ThreatDetails = ({ threat, onRefresh }: ThreatDetailsProps) => {
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showScaleModal, setShowScaleModal] = useState(false);

  const scorePercent = threat.score
    ? threat.score > 1
      ? Math.min(Math.round(threat.score), 100)
      : Math.round(threat.score * 100)
    : 0;

  const theme = getScoreTheme(scorePercent);
  const currentTier = theme.tier;

  const signalsList = Array.isArray(threat.signals)
    ? [...threat.signals].sort((a, b) => b.weight - a.weight)
    : [];

  const getRichExplanation = (
    signalId: string
  ): SignalExplanation | undefined => {
    return SIGNAL_EXPLANATIONS[signalId];
  };

  const selectedExplanation = selectedSignal
    ? getRichExplanation(selectedSignal.id)
    : undefined;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2.5 text-xs animate-fadeIn space-y-2 relative font-mono"
    >
      {/* SECTION LABELS ABOVE MAIN ROW */}
      <div className="flex items-center justify-between text-[9px] font-bold tracking-widest text-zinc-500 uppercase px-0.5">
        <span
          className="flex items-center gap-1"
          onClick={() => setShowScaleModal(true)}
        >
          SCORE <Info className="w-2.5 h-2.5 text-zinc-500" />
        </span>
        <span>ACTIONS</span>
      </div>

      {/* MAIN 1-ROW GRID (A: SCORE | B: DESCRIPTION | C: ACTIONS) */}
      <div className="flex items-center justify-between gap-2">
        {/* A + B: GIANT SCORE & DESCRIPTION (CLICKABLE TO OPEN SCALE SPEC) */}
        <div
          onClick={() => setShowScaleModal(true)}
          className="flex items-center gap-2 cursor-pointer group hover:bg-zinc-800/80 p-1 -m-1 rounded transition-colors"
          title="Click to view score scale specification"
        >
          {/* A: GIANT SCORE */}
          <span
            className={`text-2xl font-black font-mono tracking-tight leading-none ${theme.text}`}
          >
            {scorePercent}%
          </span>

          {/* B: DESCRIPTION WITH LINE WRAP */}
          <div className="flex flex-col">
            <span
              className={`text-[10px] font-bold font-mono uppercase leading-tight tracking-tight break-words max-w-[100px] ${theme.text}`}
            >
              {theme.label}
            </span>
          </div>
        </div>

        {/* C: ACTION BUTTONS */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TrustDomainButton
            domain={threat.domain}
            onActionComplete={onRefresh}
          />
          <PurgeThreatButton threat={threat} onActionComplete={onRefresh} />
        </div>
      </div>

      {/* DIVIDER LINE BEFORE DETAILS */}
      <div className="border-t border-zinc-800/80 pt-2 mt-2">
        <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5">
          DETAILS
        </p>

        {signalsList.length === 0 ? (
          <p className="text-[10px] text-zinc-500 italic py-1">
            No detailed signal breakdown recorded for this legacy log.
          </p>
        ) : (
          <ul className="space-y-1 text-zinc-300">
            {signalsList.map((signal, idx) => (
              <li
                key={`${signal.id}-${idx}`}
                onClick={() => setSelectedSignal(signal)}
                className="flex items-center justify-between rounded-sm group py-1.5 transition-all cursor-pointer hover:bg-zinc-500/20 hover:pl-1.5"
                title="Click to view signal specifications"
              >
                <span className="flex items-center gap-1.5 truncate pr-1">
                  <span
                    className={`font-extrabold ${getScoreTheme(signal.weight).baseColor} text-[11px]`}
                  >
                    +{signal.weight}%
                  </span>
                  <span className="truncate text-[11px] text-zinc-200">
                    {signal.label}
                  </span>
                </span>

                <div className="flex items-center gap-1 text-zinc-500 group-hover:text-cyan-300 transition-colors flex-shrink-0">
                  <HelpCircle className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL 1: THREAT SCORE SCALE OVERLAY */}
      {showScaleModal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowScaleModal(false);
          }}
          className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md z-50 p-4 flex flex-col justify-between animate-fadeIn border-2 border-cyan-500/50 font-mono"
        >
          <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/40 max-h-[100vh] min-h-[430px]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
              <span className="text-xs font-black text-cyan-300 tracking-wider flex items-center gap-1.5 uppercase drop-shadow-[0_0_6px_#00f0ff]">
                <Activity className="w-4 h-4 text-pink-500" /> THREAT SCORE
                SCALE
              </span>
              <button
                onClick={() => setShowScaleModal(false)}
                className="text-zinc-500 hover:text-pink-500 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TOP COMPONENT: SCALE LIST WITH CURRENT SCORE HIGHLIGHT */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
                SCORING TIERS & CURRENT POSITION
              </p>

              <div className="space-y-1.5">
                {SCORE_TIERS.map((tier) => {
                  const isCurrent =
                    scorePercent >= tier.min && scorePercent <= tier.max;

                  return (
                    <div
                      key={tier.rangeLabel}
                      className={`p-2 rounded border transition-all ${
                        isCurrent
                          ? `${tier.activeBorder}${tier.glowShadow} bg-zinc-900/90`
                          : 'bg-zinc-900/30 border-zinc-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                              isCurrent
                                ? tier.badgeClass
                                : 'text-zinc-500 border-zinc-800 bg-zinc-950'
                            }`}
                          >
                            {tier.rangeLabel}
                          </span>

                          <span
                            className={`text-[10px] font-bold uppercase ${
                              isCurrent ? tier.baseColor : 'text-zinc-400'
                            }`}
                          >
                            {tier.label}
                          </span>
                        </div>

                        {/* GIANT CURRENT SCORE BADGE */}
                        {isCurrent && (
                          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-cyan-500/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                            <span className="text-[8px] text-zinc-400 font-bold uppercase">
                              CURRENT:
                            </span>
                            <span
                              className={`text-lg font-black ${tier.baseColor}`}
                            >
                              {scorePercent}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM COMPONENT: DETAILED EXPLANATION FOR CURRENT LEVEL */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className={`w-4 h-4 ${currentTier.baseColor}`} />
                <span className="text-[10px] font-extrabold uppercase text-cyan-300 tracking-wider">
                  LEVEL ANALYSIS ({scorePercent}%)
                </span>
              </div>

              {/* Summary Box */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded space-y-2 text-[10px] text-zinc-300">
                <p className="font-bold text-zinc-100">{currentTier.summary}</p>
                <p className="text-zinc-400 leading-relaxed">
                  {currentTier.explanation}
                </p>
              </div>

              {/* Action Box */}
              <div className="bg-cyan-950/30 border border-cyan-500/30 p-2 rounded text-[10px] space-y-1">
                <p className="text-cyan-400 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />{' '}
                  RECOMMENDED ACTION
                </p>
                <p className="text-zinc-300">{currentTier.recommendedAction}</p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowScaleModal(false)}
            className="w-full py-1.5 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold text-xs uppercase rounded transition-colors tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.2)] mt-3 flex-shrink-0"
          >
            CLOSE SCALE SPEC
          </button>
        </div>
      )}

      {/* MODAL 2: INDIVIDUAL SIGNAL SPECIFICATION OVERLAY */}
      {selectedSignal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSignal(null);
          }}
          className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md z-50 p-4 flex flex-col justify-between animate-fadeIn border-2 border-cyan-500/50 font-mono"
        >
          <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/40 max-h-[100vh] min-h-[430px]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
              <span className="text-xs font-black text-pink-500 tracking-wider flex items-center gap-1.5 uppercase drop-shadow-[0_0_6px_#ff007f]">
                <Zap className="w-4 h-4 text-cyan-400" /> SIGNAL SPECIFICATION
              </span>
              <button
                onClick={() => setSelectedSignal(null)}
                className="text-zinc-500 hover:text-pink-500 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Signal Top Banner */}
            <div className="bg-zinc-900/90 border border-cyan-500/30 p-2.5 rounded space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-cyan-400 uppercase tracking-widest font-bold">
                  {selectedSignal.id}
                </span>
                {selectedExplanation && (
                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    {selectedExplanation.category}
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-pink-400 leading-snug">
                {selectedSignal.label}
              </h4>

              <div className="inline-block px-1.5 py-0.5 bg-pink-950/80 border border-pink-500/50 text-pink-300 text-[9px] rounded font-extrabold shadow-[0_0_6px_rgba(255,0,127,0.3)]">
                +{selectedSignal.weight}% THREAT WEIGHT
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-cyan-400" /> OVERVIEW
              </p>
              <p className="text-zinc-300 text-[10px] leading-relaxed bg-zinc-900/40 p-2 rounded border border-zinc-800/80">
                {selectedExplanation?.summary || selectedSignal.description}
              </p>
            </div>

            {/* Why It Matters */}
            {selectedExplanation?.whyItMatters && (
              <div className="space-y-1">
                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1">
                  <Layers className="w-3 h-3 text-pink-400" /> WHY IT MATTERS
                </p>
                <p className="text-zinc-300 text-[10px] leading-relaxed bg-zinc-900/40 p-2 rounded border border-zinc-800/80">
                  {selectedExplanation.whyItMatters}
                </p>
              </div>
            )}

            {/* How It Works in Detection */}
            {selectedExplanation?.howItWorks && (
              <div className="space-y-1">
                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" /> HOW SLEUTH CAUGHT
                  THIS
                </p>
                <p className="text-zinc-400 text-[10px] leading-relaxed bg-zinc-900/40 p-2 rounded border border-zinc-800/80">
                  {selectedExplanation.howItWorks}
                </p>
              </div>
            )}

            {/* References & Links */}
            {selectedExplanation?.references &&
              selectedExplanation.references.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-emerald-400" /> RESEARCH &
                    REFERENCES
                  </p>
                  <div className="space-y-1">
                    {selectedExplanation.references.map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-1.5 bg-cyan-950/30 hover:bg-cyan-950/70 border border-cyan-500/30 rounded text-[10px] text-cyan-300 hover:text-cyan-200 transition-colors group"
                      >
                        <span className="truncate max-w-[280px]">
                          {ref.title}
                        </span>
                        <ExternalLink className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <button
            onClick={() => setSelectedSignal(null)}
            className="w-full py-1.5 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold text-xs uppercase rounded transition-colors tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.2)] mt-3 flex-shrink-0"
          >
            CLOSE SPEC
          </button>
        </div>
      )}
    </div>
  );
};
