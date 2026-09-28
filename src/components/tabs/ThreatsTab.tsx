import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Terminal,
  Activity,
  BarChart3,
  Compass,
  HelpCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import type { ThreatLog } from '../../types';
import { ThreatDetails, getScoreTheme } from '../../popup/ThreatDetails';
import { NukeAllButton } from '../RemediationControls';
import hatLogo from '../../assets/sleuth-lg.png';

interface ThreatsTabProps {
  threats: ThreatLog[];
  totalIntercepts: number;
  lzNoveltyRate: number;
  navDictSize: number;
  fetchState: () => void;
}

const ThreatsTab: React.FC<ThreatsTabProps> = ({
  threats,
  totalIntercepts,
  lzNoveltyRate,
  navDictSize,
  fetchState,
}) => {
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [showLzModal, setShowLzModal] = useState(false);

  // Quick Filter State ('ALL' | 'HIGH' | 'MED')
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'HIGH' | 'MED'>(
    'ALL'
  );

  // Compute threat distribution buckets for the sparkline graph
  const highThreats = threats.filter(
    (t) => t.score !== undefined && t.score >= 80
  ).length;
  const medThreats = threats.filter(
    (t) => t.score !== undefined && t.score >= 50 && t.score < 80
  ).length;
  const lowThreats = threats.filter(
    (t) => t.score !== undefined && t.score < 50
  ).length;
  const maxThreatBucket = Math.max(highThreats, medThreats, lowThreats, 1);

  // Filtered threats stream logic
  const filteredThreats = threats.filter((t) => {
    const score = t.score ?? 0;
    if (filterSeverity === 'HIGH') return score >= 80;
    if (filterSeverity === 'MED') return score >= 50 && score < 80;
    return true;
  });

  return (
    <motion.div
      key="threats-tab"
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 15 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      {/* TOGGLEABLE HEADER BAR */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 mt-1 uppercase">
        <span className="flex items-center gap-1 text-cyan-300 font-bold">
          <Activity className="w-3.5 h-3.5 text-pink-500" />
          {showAnalytics ? 'SESSION ANALYTICS' : 'OVERVIEW METRICS'}
        </span>
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-cyan-500/40 hover:border-cyan-300 text-cyan-400 rounded text-[10px] transition-colors"
        >
          <BarChart3 className="w-3 h-3 text-pink-500" />
          <span>{showAnalytics ? 'STREAM' : 'ANALYTICS'}</span>
        </button>
      </div>

      {/* DYNAMIC VIEW SWITCH (Valid use of mode="wait" for single view swap) */}
      <AnimatePresence mode="wait">
        {/* LZ NOVELTY EXPLANATION MODAL */}
        {showLzModal && (
          <div
            onClick={() => setShowLzModal(false)}
            className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-50 p-4 flex flex-col justify-between animate-fadeIn border-2 border-cyan-500/50"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <span className="text-xs font-black text-pink-500 tracking-wider flex items-center gap-1.5 uppercase drop-shadow-[0_0_6px_#ff007f]">
                  <HelpCircle className="w-4 h-4 text-cyan-400" /> LZ NOVELTY
                  ENGINE
                </span>
                <button
                  onClick={() => setShowLzModal(false)}
                  className="text-zinc-500 hover:text-pink-500 transition-colors p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[11px] text-zinc-300 leading-relaxed space-y-2 font-mono">
                <p>
                  Derived from{' '}
                  <strong className="text-cyan-300">Lempel-Ziv (LZ78)</strong>{' '}
                  data compression theory.
                </p>
                <p className="text-zinc-400">
                  Your explicit top-level web navigation history forms an
                  in-memory{' '}
                  <strong className="text-zinc-200">dictionary</strong>.
                </p>

                <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded space-y-1 text-[10px]">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓ HIT:</span>
                    <span>Cookie set by a domain you explicitly visited.</span>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1 border-t border-zinc-800">
                    <span className="text-pink-500 font-bold">⚠ MISS:</span>
                    <span>
                      Cookie set by an uninvited domain outside your dictionary.
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 italic">
                  High rate (<strong className="text-pink-400">&gt;40%</strong>)
                  indicates a large proportion of cookie drops originate from
                  uninvited third-party novelties.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLzModal(false)}
              className="w-full py-1.5 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold text-xs uppercase rounded transition-colors tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.2)]"
            >
              ACKNOWLEDGE
            </button>
          </div>
        )}

        {showAnalytics ? (
          <motion.div
            key="analytics-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-3 flex flex-col justify-between"
          >
            {/* SECTION 1: LZ NOVELTY & RISK INDEX GRID */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-zinc-950 p-2 rounded border border-zinc-800 flex flex-col justify-between">
                <div
                  className="flex justify-between items-center text-[9px] uppercase cursor-pointer"
                  onClick={() => setShowLzModal(true)}
                >
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Compass className="w-2.5 h-2.5 text-pink-500" /> LZ Novelty
                  </span>
                  <span
                    className={`text-base font-bold ${
                      lzNoveltyRate > 40
                        ? 'text-pink-500'
                        : lzNoveltyRate > 15
                          ? 'text-yellow-400'
                          : 'text-emerald-400'
                    }`}
                  >
                    {lzNoveltyRate}%
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden my-1">
                  <div
                    className={`h-full transition-all duration-500 ${
                      lzNoveltyRate > 40
                        ? 'bg-pink-500 shadow-[0_0_8px_#ff007f]'
                        : lzNoveltyRate > 15
                          ? 'bg-yellow-400'
                          : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(lzNoveltyRate, 100)}%` }}
                  />
                </div>
                <span className="text-[8px] text-zinc-500">
                  Unvisited Domain Misses
                </span>
              </div>

              <div className="bg-zinc-950 p-2 rounded border border-zinc-800 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[9px] uppercase">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5 text-cyan-400" /> Risk
                    Index
                  </span>
                  <span
                    className={`font-bold ${
                      threats.length > 5 || lzNoveltyRate > 40
                        ? 'text-pink-500 animate-pulse'
                        : threats.length > 0
                          ? 'text-yellow-400'
                          : 'text-emerald-400'
                    }`}
                  >
                    {threats.length > 5 || lzNoveltyRate > 40
                      ? 'HIGH'
                      : threats.length > 0
                        ? 'ELEVATED'
                        : 'CLEAN'}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-cyan-300">
                  {threats.length > 0
                    ? `${threats.length} Active Threats`
                    : 'Nominal Operations'}
                </div>
                <span className="text-[8px] text-zinc-500">
                  Real-Time Context Health
                </span>
              </div>
            </div>

            {/* SECTION 2: THREAT SEVERITY SPARKLINE BARS */}
            <div>
              <p className="text-[11px] text-zinc-400 uppercase my-1">
                Threat Severity Distribution
              </p>
              <div className="flex items-end gap-2 h-20 bg-zinc-950 p-2 rounded border border-zinc-800">
                <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full bg-pink-500/80 rounded-t transition-all duration-300 shadow-[0_0_8px_#ff007f]"
                    style={{
                      height: `${(highThreats / maxThreatBucket) * 100}%`,
                    }}
                  />
                  <span className="text-[8px] text-zinc-400">
                    HIGH ({highThreats})
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full bg-yellow-400/80 rounded-t transition-all duration-300"
                    style={{
                      height: `${(medThreats / maxThreatBucket) * 100}%`,
                    }}
                  />
                  <span className="text-[8px] text-zinc-400">
                    MED ({medThreats})
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full bg-cyan-400/80 rounded-t transition-all duration-300"
                    style={{
                      height: `${(lowThreats / maxThreatBucket) * 100}%`,
                    }}
                  />
                  <span className="text-[8px] text-zinc-400">
                    LOW ({lowThreats})
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 3: DELIVERY MECHANISM BREAKDOWN */}
            <div>
              <p className="text-[11px] text-zinc-400 uppercase my-1">
                Delivery Channel Vectors
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex justify-between items-center">
                  <span className="text-zinc-500">Sub-Frame (Iframe)</span>
                  <span className="font-bold text-pink-400">
                    {
                      threats.filter((t) => t.deliveryMechanism === 'sub_frame')
                        .length
                    }
                  </span>
                </div>

                <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex justify-between items-center">
                  <span className="text-zinc-500">HTTP 302 Redirect</span>
                  <span className="font-bold text-yellow-400">
                    {
                      threats.filter((t) =>
                        (t.signals || []).some((s) =>
                          s.label.toLowerCase().includes('redirect')
                        )
                      ).length
                    }
                  </span>
                </div>

                <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex justify-between items-center">
                  <span className="text-zinc-500">Script / XHR</span>
                  <span className="font-bold text-cyan-300">
                    {
                      threats.filter(
                        (t) =>
                          t.deliveryMechanism === 'script' ||
                          t.deliveryMechanism === 'xmlhttprequest'
                      ).length
                    }
                  </span>
                </div>

                <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex justify-between items-center">
                  <span className="text-zinc-500">
                    Early Timing (&lt;500ms)
                  </span>
                  <span className="font-bold text-pink-400">
                    {
                      threats.filter((t) =>
                        (t.signals || []).some((s) =>
                          s.label.includes('initial page load')
                        )
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4: TELEMETRY SUMMARY */}
            <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 flex justify-between items-center mt-1">
              <span>
                Nav Dictionary <br />
                <strong className="text-cyan-300">{navDictSize} domains</strong>
              </span>
              <span>
                3rd-Party Context <br />
                <strong className="text-pink-400">
                  {threats.length > 0
                    ? `${Math.round(
                        (threats.filter((t) => t.context === 'third-party')
                          .length /
                          threats.length) *
                          100
                      )}%`
                    : '0%'}
                </strong>
              </span>
              <span>
                Intercepts <br />
                <strong className="text-cyan-300">{totalIntercepts}</strong>
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="stream-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* EVENT STREAM HEADER */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 uppercase pt-2 mt-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 font-mono font-bold">
                  <span className="font-bold text-pink-500 text-[12px] mr-[3px]">
                    {threats.length.toString().padStart(4, '0')}
                  </span>
                  Detected
                </div>

                <div className="flex items-center gap-1">
                  {(['ALL', 'HIGH', 'MED'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setFilterSeverity(level)}
                      className={`px-1.5 py-0.2 text-[8px] rounded border transition-colors font-bold ${
                        filterSeverity === level
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_6px_rgba(0,240,255,0.3)]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RELATIVE WRAPPER FOR FLOATING ACTION BUTTON */}
            <div className="relative mt-[10px]">
              {/* EVENT STREAM LIST */}
              <div className="h-[320px] overflow-y-auto space-y-2 pr-1 pb-8 transition-all duration-300 scrollbar-thin scrollbar-thumb-cyan-500/40">
                <AnimatePresence>
                  {filteredThreats.length === 0 ? (
                    <motion.div
                      key="empty-state"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2"
                    >
                      <img
                        src={hatLogo}
                        alt="Cookie Icon"
                        className="w-[80px] h-[80px] opacity-80"
                      />
                      <p className="text-[11px] tracking-widest">
                        {filterSeverity === 'ALL'
                          ? 'NO STUFFING DETECTED'
                          : `NO ${filterSeverity} THREATS`}
                      </p>
                    </motion.div>
                  ) : (
                    filteredThreats.map((threat) => {
                      const score = threat.score ?? 0;
                      const theme = getScoreTheme(score);
                      return (
                        <div
                          key={threat.id}
                          onClick={() =>
                            setSelectedThreatId(
                              selectedThreatId === threat.id ? null : threat.id
                            )
                          }
                          className="bg-zinc-900/90 border-l-2 border-pink-500 border border-transparent hover:border-cyan-400/50 p-2 rounded text-xs space-y-1 hover:bg-zinc-900 transition-all hover:shadow-[0_0_12px_rgba(0,240,255,0.15)] cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                              <span className="font-bold text-pink-400 flex items-center gap-1 truncate">
                                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />{' '}
                                {threat.domain}
                              </span>
                              {/* BADGE COLOR MATCHES GIANT SCORE 1:1 */}
                              <span
                                className={`text-[9px] font-extrabold px-1 py-0.2 rounded border ${theme.badge}`}
                              >
                                {score}%
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <span>
                                {new Date(threat.timestamp).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  }
                                )}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-cyan-500 group-hover:text-cyan-300 transition-transform duration-200 ${
                                  selectedThreatId === threat.id
                                    ? 'rotate-180 text-pink-400'
                                    : ''
                                }`}
                              />
                            </div>
                          </div>

                          <div className="text-[10px] text-zinc-400 truncate">
                            TAG:{' '}
                            <span className="text-cyan-300">
                              {threat.cookieName}
                            </span>
                          </div>

                          {/* EXPANDABLE DETAILS ACCORDION */}
                          {selectedThreatId === threat.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{
                                duration: 0.2,
                                ease: 'easeInOut',
                              }}
                              className="overflow-hidden"
                            >
                              <ThreatDetails threat={threat} />
                            </motion.div>
                          )}
                        </div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

              {/* FLOATING ACTION BUTTON OVERLAY */}
              <NukeAllButton
                threats={threats}
                onActionComplete={fetchState}
                variant="bottom"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ThreatsTab;
