import {
  ShieldAlert,
  Terminal,
  Trash2,
  Cookie,
  Users,
  Binary,
  Search,
  RefreshCw,
  Lock,
  Globe,
  Key,
  BarChart3,
  Activity,
  Compass,
  HelpCircle,
  X,
} from 'lucide-react';
import type { ThreatLog } from '../types';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThreatDetails } from './ThreatDetails';
import hatLogo from '../assets/sleuth-lg.png';
import {
  AFFILIATE_COOKIE_MARKERS,
  KNOWN_AFFILIATE_NETWORKS,
} from '../constants/affiliate';

export const App = () => {
  const [activeTab, setActiveTab] = useState<
    'threats' | 'cookies' | 'affiliates'
  >('threats');
  const [threats, setThreats] = useState<ThreatLog[]>([]);
  const [totalIntercepts, setTotalIntercepts] = useState<number>(0);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);

  // New Analytics & View Toggle State
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [lzNoveltyRate, setLzNoveltyRate] = useState<number>(0);
  const [navDictSize, setNavDictSize] = useState<number>(0);

  // Cookie Viewer State
  const [rawCookies, setRawCookies] = useState<chrome.cookies.Cookie[]>([]);
  const [cookieSearch, setCookieSearch] = useState('');
  const [isLoadingCookies, setIsLoadingCookies] = useState(false);

  // Affiliate Viewer State
  const [affiliateCookies, setAffiliateCookies] = useState<
    chrome.cookies.Cookie[]
  >([]);
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [isLoadingAffiliateCookies, setIsLoadingAffiliateCookies] =
    useState(false);

  // Modal Popups
  const [showLzModal, setShowLzModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Load Threats & Storage Listeners
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      console.warn(
        '[COOKIE SLEUTH] Extension APIs not detected. Running in mock/standalone mode.'
      );
      return;
    }

    chrome.storage.local.get(
      ['threats', 'threatCount', 'lzNoveltyRate', 'navDictSize'],
      (res) => {
        setThreats((res.threats as ThreatLog[]) || []);
        setTotalIntercepts((res.threatCount as number) || 0);
        setLzNoveltyRate((res.lzNoveltyRate as number) || 0);
        setNavDictSize((res.navDictSize as number) || 0);
      }
    );

    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.threats)
        setThreats((changes.threats.newValue as ThreatLog[]) || []);
      if (changes.threatCount)
        setTotalIntercepts((changes.threatCount.newValue as number) || 0);
      if (changes.lzNoveltyRate)
        setLzNoveltyRate((changes.lzNoveltyRate.newValue as number) || 0);
      if (changes.navDictSize)
        setNavDictSize((changes.navDictSize.newValue as number) || 0);
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Fetch Live Cookies when switching to Cookie Matrix tab
  const fetchLiveCookies = () => {
    if (typeof chrome === 'undefined' || !chrome.cookies) return;
    setIsLoadingCookies(true);

    chrome.cookies.getAll({}, (cookies) => {
      setRawCookies(cookies || []);
      setIsLoadingCookies(false);
    });
  };

  const fetchAffiliateCookies = () => {
    if (typeof chrome === 'undefined' || !chrome.cookies) return;
    setIsLoadingAffiliateCookies(true);

    chrome.cookies.getAll({}, (cookies) => {
      const affiliateCookies = (cookies || []).filter((cookie) => {
        // 1. Check if the cookie name matches an affiliate parameter fingerprint
        const matchesMarker = AFFILIATE_COOKIE_MARKERS.some((marker) =>
          marker.pattern.test(cookie.name)
        );

        // 2. Check if the domain matches a known affiliate tracking network
        const matchesNetwork = KNOWN_AFFILIATE_NETWORKS.some((network) =>
          network.pattern.test(cookie.domain)
        );

        return matchesMarker || matchesNetwork;
      });

      // Update State with Filtered Cookies
      setAffiliateCookies(affiliateCookies);
      setIsLoadingAffiliateCookies(false);
    });
  };

  const uniqueNetworksCount = new Set(
    affiliateCookies.map((c) => {
      const matchedNetwork = KNOWN_AFFILIATE_NETWORKS.find((n) =>
        n.pattern.test(c.domain)
      );
      return matchedNetwork ? matchedNetwork.name : c.domain.replace(/^\./, '');
    })
  ).size;

  useEffect(() => {
    if (activeTab === 'cookies') {
      fetchLiveCookies();
    }
    if (activeTab === 'affiliates') {
      fetchAffiliateCookies();
    }
    if (activeTab === 'threats') {
      //fetchAffiliateCookies();
      if (showAnalytics) setShowAnalytics(false);
    }
  }, [activeTab]);

  const deleteSingleCookie = (cookie: chrome.cookies.Cookie) => {
    if (typeof chrome === 'undefined' || !chrome.cookies) return;
    const protocol = cookie.secure ? 'https:' : 'http:';
    const url = `${protocol}//${cookie.domain.replace(/^\./, '')}${cookie.path}`;

    chrome.cookies.remove({ url, name: cookie.name }, () => {
      fetchLiveCookies();
    });
  };

  const filteredCookies = rawCookies.filter(
    (c) =>
      c.name.toLowerCase().includes(cookieSearch.toLowerCase()) ||
      c.domain.toLowerCase().includes(cookieSearch.toLowerCase())
  );

  const filteredAffiliateCookies = affiliateCookies.filter(
    (c) =>
      c.name.toLowerCase().includes(affiliateSearch.toLowerCase()) ||
      c.domain.toLowerCase().includes(affiliateSearch.toLowerCase())
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

  return (
    <div className="w-[380px] h-[520px] bg-zinc-950 text-cyan-400 font-mono p-4 flex flex-col justify-between select-none border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.15)] relative overflow-hidden">
      {/* HEADER BAR */}
      <div>
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
          <div className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-pink-500 animate-pulse drop-shadow-[0_0_8px_#ff007f]" />
            <h1 className="text-lg font-black tracking-wider text-cyan-300 uppercase drop-shadow-[0_0_5px_#00f0ff]">
              COOKIE SLEUTH
            </h1>
          </div>
          {/* DYNAMIC HEADER STATUS BADGE */}
          <AnimatePresence mode="wait">
            {isLoadingCookies || isLoadingAffiliateCookies ? (
              <motion.div className="flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-500/50 px-2 py-0.5 rounded text-[10px] text-cyan-400 tracking-widest uppercase animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                LOADING
              </motion.div>
            ) : (
              <motion.div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] text-emerald-400 tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                ACTIVE
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CYBERPUNK TAB NAVIGATION */}
        <div className="relative flex bg-zinc-900/90 border border-cyan-500/20 p-1 rounded my-3 text-xs">
          {/* Animated Active Background Indicator */}
          <div
            className={`absolute top-1 bottom-1 transition-all duration-300 rounded bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)] ${
              activeTab === 'threats'
                ? 'left-1 w-[calc(33.33%-4px)]'
                : activeTab === 'affiliates'
                  ? 'left-[calc(33.33%+1px)] w-[calc(33.33%-4px)]'
                  : 'left-[calc(66.66%+1px)] w-[calc(33.33%-4px)]'
            }`}
          />

          <button
            onClick={() => setActiveTab('threats')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 z-10 font-bold ${
              activeTab === 'threats' ? 'text-cyan-300' : 'text-zinc-500'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>DETECTED</span>
          </button>

          <button
            onClick={() => setActiveTab('affiliates')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 z-10 transition-colors font-bold ${
              activeTab === 'affiliates'
                ? 'text-cyan-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>AFFILIATE</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 z-10 transition-colors font-bold ${
              activeTab === 'cookies'
                ? 'text-cyan-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>ALL COOKIES</span>
          </button>
        </div>

        {/* TAB CONTENT CONTAINER WITH ANIMATE PRESENCE */}
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* TAB 1: THREAT STREAM & TOGGLEABLE GRAPH PANEL */}
            {activeTab === 'threats' && (
              <motion.div
                key="threats-tab"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="h-full"
              >
                {/* TOGGLEABLE HEADER BAR */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 uppercase">
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

                {/* DYNAMIC VIEW SWITCH WITH SLIDE ANIMATION */}
                <AnimatePresence mode="wait">
                  {showAnalytics ? (
                    <motion.div
                      key="analytics-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="bg-zinc-900/90 border border-cyan-500/30 p-3 rounded space-y-3 h-[345px] flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/40"
                    >
                      {/* SECTION 1: LZ NOVELTY & RISK INDEX GRID */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* LZ Novelty Bar */}
                        <div className="bg-zinc-950 p-2 rounded border border-zinc-800 flex flex-col justify-between">
                          <div className="flex justify-between items-center text-[9px] uppercase">
                            <span className="text-zinc-400 flex items-center gap-1">
                              <Compass className="w-2.5 h-2.5 text-pink-500" />{' '}
                              LZ Novelty
                            </span>
                            <span
                              className={`font-bold ${
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
                              style={{
                                width: `${Math.min(lzNoveltyRate, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[8px] text-zinc-500">
                            Unvisited Domain Misses
                          </span>
                        </div>

                        {/* Risk Index Badge */}
                        <div className="bg-zinc-950 p-2 rounded border border-zinc-800 flex flex-col justify-between">
                          <div className="flex justify-between items-center text-[9px] uppercase">
                            <span className="text-zinc-400 flex items-center gap-1">
                              <Activity className="w-2.5 h-2.5 text-cyan-400" />{' '}
                              Risk Index
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
                        <p className="text-[9px] text-zinc-400 uppercase mb-1">
                          Threat Severity Distribution
                        </p>
                        <div className="flex items-end gap-2 h-16 bg-zinc-950 p-2 rounded border border-zinc-800">
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

                      {/* SECTION 3: DELIVERY MECHANISM BREAKDOWN (2x2 GRID) */}
                      <div>
                        <p className="text-[9px] text-zinc-400 uppercase mb-1">
                          Delivery Channel Vectors
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800/80 flex justify-between items-center">
                            <span className="text-zinc-500">
                              Sub-Frame (Iframe)
                            </span>
                            <span className="font-bold text-pink-400">
                              {
                                threats.filter(
                                  (t) => t.deliveryMechanism === 'sub_frame'
                                ).length
                              }
                            </span>
                          </div>

                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800/80 flex justify-between items-center">
                            <span className="text-zinc-500">
                              HTTP 302 Redirect
                            </span>
                            <span className="font-bold text-yellow-400">
                              {
                                threats.filter((t) =>
                                  t.reasons.some((r) =>
                                    r.toLowerCase().includes('redirect')
                                  )
                                ).length
                              }
                            </span>
                          </div>

                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800/80 flex justify-between items-center">
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

                          <div className="bg-zinc-950 p-1.5 rounded border border-zinc-800/80 flex justify-between items-center">
                            <span className="text-zinc-500">
                              Early Timing (&lt;500ms)
                            </span>
                            <span className="font-bold text-pink-400">
                              {
                                threats.filter((t) =>
                                  t.reasons.some((r) =>
                                    r.includes('initial page load')
                                  )
                                ).length
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 4: TELEMETRY & SYSTEM DICTIONARY SUMMARY */}
                      <div className="pt-2 border-t border-zinc-800/80 text-[9px] text-zinc-400 flex justify-between items-center">
                        <span>
                          Nav Dictionary <br />
                          <strong className="text-cyan-300">
                            {navDictSize} domains
                          </strong>
                        </span>
                        <span>
                          3rd-Party Context <br />
                          <strong className="text-pink-400">
                            {threats.length > 0
                              ? `${Math.round(
                                  (threats.filter(
                                    (t) => t.context === 'third-party'
                                  ).length /
                                    threats.length) *
                                    100
                                )}%`
                              : '0%'}
                          </strong>
                        </span>
                        <span>
                          Intercepts <br />
                          <strong className="text-cyan-300">
                            {totalIntercepts}
                          </strong>
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
                      {/* COMPACT INLINE 2-CARD GRID */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="flex items-center justify-between bg-zinc-900/80 border border-cyan-500/20 px-2.5 py-1 rounded shadow-inner">
                          <span className="text-[9px] text-zinc-300 uppercase tracking-wider">
                            THREATS
                          </span>
                          <span className="text-base font-bold text-pink-500 drop-shadow-[0_0_6px_#ff007f]">
                            {threats.length.toString().padStart(4, '0')}
                          </span>
                        </div>
                        <div
                          onClick={() => setShowLzModal(true)}
                          className="flex items-center justify-between bg-zinc-900/80 border border-cyan-500/20 hover:border-cyan-400/60 transition-colors cursor-pointer px-2.5 py-1 rounded shadow-inner group"
                          title="Click for LZ Novelty breakdown"
                        >
                          <span className="text-[9px] text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                            LZ NOVELTY
                            <HelpCircle className="w-2.5 h-2.5 text-cyan-500 group-hover:text-pink-500 transition-colors" />
                          </span>
                          <span
                            className={`text-base font-bold drop-shadow-[0_0_6px_#00f0ff] ${
                              lzNoveltyRate > 40
                                ? 'text-pink-500'
                                : 'text-cyan-300'
                            }`}
                          >
                            {lzNoveltyRate}%
                          </span>
                        </div>
                      </div>

                      {/* LZ NOVELTY EXPLANATION MODAL */}
                      {showLzModal && (
                        <div
                          onClick={() => setShowLzModal(false)}
                          className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-50 p-4 flex flex-col justify-between animate-fadeIn border-2 border-cyan-500/50"
                        >
                          <div className="space-y-3">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                              <span className="text-xs font-black text-pink-500 tracking-wider flex items-center gap-1.5 uppercase drop-shadow-[0_0_6px_#ff007f]">
                                <HelpCircle className="w-4 h-4 text-cyan-400" />{' '}
                                LZ NOVELTY ENGINE
                              </span>
                              <button
                                onClick={() => setShowLzModal(false)}
                                className="text-zinc-500 hover:text-pink-500 transition-colors p-0.5"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Modal Content */}
                            <div className="text-[11px] text-zinc-300 leading-relaxed space-y-2 font-mono">
                              <p>
                                Derived from{' '}
                                <strong className="text-cyan-300">
                                  Lempel-Ziv (LZ78)
                                </strong>{' '}
                                data compression theory[cite: 4].
                              </p>
                              <p className="text-zinc-400">
                                Your explicit top-level web navigation history
                                forms an in-memory{' '}
                                <strong className="text-zinc-200">
                                  dictionary
                                </strong>
                                [cite: 4].
                              </p>

                              <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded space-y-1 text-[10px]">
                                <div className="flex items-start gap-1.5">
                                  <span className="text-emerald-400 font-bold">
                                    ✓ HIT:
                                  </span>
                                  <span>
                                    Cookie set by a domain you explicitly
                                    visited[cite: 4].
                                  </span>
                                </div>
                                <div className="flex items-start gap-1.5 pt-1 border-t border-zinc-800">
                                  <span className="text-pink-500 font-bold">
                                    ⚠ MISS:
                                  </span>
                                  <span>
                                    Cookie set by an uninvited domain outside
                                    your dictionary[cite: 4].
                                  </span>
                                </div>
                              </div>

                              <p className="text-[10px] text-zinc-400 italic">
                                High rate (
                                <strong className="text-pink-400">
                                  &gt;40%
                                </strong>
                                ) indicates a large proportion of cookie drops
                                originate from uninvited third-party
                                novelties[cite: 4].
                              </p>
                            </div>
                          </div>

                          {/* Close Button */}
                          <button
                            onClick={() => setShowLzModal(false)}
                            className="w-full py-1.5 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold text-xs uppercase rounded transition-colors tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                          >
                            ACKNOWLEDGE
                          </button>
                        </div>
                      )}

                      {/* EVENT STREAM HEADER */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 uppercase">
                        <span className="flex items-center gap-1">
                          <Terminal className="w-3.5 h-3.5 text-cyan-400" />{' '}
                          Detected Stuffing
                        </span>
                        <button
                          onClick={() => setThreats([])}
                          className="hover:text-pink-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* EVENT STREAM LIST */}
                      <div className="h-[250px] overflow-y-auto space-y-2 pr-1 transition-all duration-300 scrollbar-thin scrollbar-thumb-cyan-500/40">
                        <AnimatePresence mode="wait">
                          {threats.length === 0 ? (
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
                                NO STUFFING DETECTED
                              </p>
                            </motion.div>
                          ) : (
                            threats.map((threat) => (
                              <div
                                key={threat.id}
                                onClick={() =>
                                  setSelectedThreatId(
                                    selectedThreatId === threat.id
                                      ? null
                                      : threat.id
                                  )
                                }
                                className="bg-zinc-900/90 border-l-2 border-pink-500 p-2 rounded text-xs space-y-1 hover:bg-zinc-900 transition-all shadow-[0_0_10px_rgba(255,0,127,0.1)] cursor-pointer"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-pink-400 flex items-center gap-1 truncate max-w-[200px]">
                                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />{' '}
                                    {threat.domain}
                                  </span>
                                  <span className="text-[10px] text-zinc-500">
                                    {new Date(
                                      threat.timestamp
                                    ).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate">
                                  TAG:{' '}
                                  <span className="text-cyan-300">
                                    {threat.cookieName}
                                  </span>
                                </div>
                                <AnimatePresence>
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
                                </AnimatePresence>
                              </div>
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* TAB 2: AFFILIATE MATRIX */}
            {activeTab === 'affiliates' && (
              <motion.div
                key="affiliates-tab"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-2 h-full"
              >
                <div className="transition-all duration-300 opacity-100 space-y-2">
                  {/* Search and Refresh Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-zinc-900/90 border border-cyan-500/30 rounded px-2 py-1 gap-1.5 text-xs">
                      <Search className="w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="FILTER AFFILIATES..."
                        value={affiliateSearch}
                        onChange={(e) => setAffiliateSearch(e.target.value)}
                        className="bg-transparent border-none text-cyan-300 placeholder-zinc-600 focus:outline-none w-full text-xs"
                      />
                    </div>
                    <button
                      onClick={fetchAffiliateCookies}
                      className="bg-zinc-900 border border-cyan-500/30 hover:border-cyan-400 p-1.5 rounded text-cyan-400 hover:text-cyan-300 transition-colors"
                      title="Refresh Cookie Feed"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isLoadingAffiliateCookies
                            ? 'animate-spin text-pink-500'
                            : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-zinc-900/80 border border-cyan-500/20 p-2.5 rounded shadow-inner">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                        Active Affiliates
                      </p>
                      <p className="text-xl font-bold text-pink-500 drop-shadow-[0_0_8px_#ff007f]">
                        {affiliateCookies.length.toString().padStart(4, '0')}
                      </p>
                    </div>
                    <div className="bg-zinc-900/80 border border-cyan-500/20 p-2.5 rounded shadow-inner">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                        Unique Networks
                      </p>
                      <p className="text-xl font-bold text-cyan-300 drop-shadow-[0_0_8px_#00f0ff]">
                        {uniqueNetworksCount.toString().padStart(2, '0')}
                      </p>
                    </div>
                  </div>

                  {/* Cookies Live Feed List */}
                  <div className="h-[230px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/40">
                    {filteredAffiliateCookies.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
                        NO ACTIVE AFFILIATE COOKIES
                      </div>
                    ) : (
                      filteredAffiliateCookies.map((cookie, index) => (
                        <div
                          key={`${cookie.domain}-${cookie.name}-${index}`}
                          className="bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/40 p-2 rounded text-[11px] space-y-1 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyan-300 truncate max-w-[210px] flex items-center gap-1">
                              <Key className="w-3 h-3 text-pink-500 flex-shrink-0" />
                              {cookie.name}
                            </span>
                            <button
                              onClick={() => deleteSingleCookie(cookie)}
                              title="Delete Cookie"
                              className="text-zinc-600 hover:text-pink-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 truncate">
                            <Globe className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                            <span>{cookie.domain}</span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] pt-0.5">
                            <span className="text-zinc-500 truncate max-w-[200px]">
                              VAL: {cookie.value}
                            </span>
                            <div className="flex items-center gap-1">
                              {cookie.secure && (
                                <span
                                  className="bg-cyan-950 text-cyan-400 px-1 py-0.2 rounded border border-cyan-800"
                                  title="HTTPS Secure"
                                >
                                  <Lock className="w-2.5 h-2.5 inline" /> SEC
                                </span>
                              )}
                              {cookie.httpOnly && (
                                <span
                                  className="bg-pink-950 text-pink-400 px-1 py-0.2 rounded border border-pink-800"
                                  title="HTTP Only"
                                >
                                  HTTP
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: LIVE COOKIE MATRIX */}
            {activeTab === 'cookies' && (
              <motion.div
                key="cookies-tab"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-2 h-full"
              >
                <div className="transition-all duration-300 opacity-100 space-y-2">
                  {/* Search and Refresh Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-zinc-900/90 border border-cyan-500/30 rounded px-2 py-1 gap-1.5 text-xs">
                      <Search className="w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="FILTER DOMAIN / NAME..."
                        value={cookieSearch}
                        onChange={(e) => setCookieSearch(e.target.value)}
                        className="bg-transparent border-none text-cyan-300 placeholder-zinc-600 focus:outline-none w-full text-xs"
                      />
                    </div>
                    <button
                      onClick={fetchLiveCookies}
                      className="bg-zinc-900 border border-cyan-500/30 hover:border-cyan-400 p-1.5 rounded text-cyan-400 hover:text-cyan-300 transition-colors"
                      title="Refresh Cookie Feed"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isLoadingCookies ? 'animate-spin text-pink-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Cookies Live Feed List */}
                  <div className="h-[310px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/40">
                    {filteredCookies.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
                        NO MATCHING COOKIES
                      </div>
                    ) : (
                      filteredCookies.map((cookie, index) => (
                        <div
                          key={`${cookie.domain}-${cookie.name}-${index}`}
                          className="bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/40 p-2 rounded text-[11px] space-y-1 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyan-300 truncate max-w-[210px] flex items-center gap-1">
                              <Key className="w-3 h-3 text-pink-500 flex-shrink-0" />
                              {cookie.name}
                            </span>
                            <button
                              onClick={() => deleteSingleCookie(cookie)}
                              title="Delete Cookie"
                              className="text-zinc-600 hover:text-pink-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 truncate">
                            <Globe className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                            <span>{cookie.domain}</span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] pt-0.5">
                            <span className="text-zinc-500 truncate max-w-[200px]">
                              VAL: {cookie.value}
                            </span>
                            <div className="flex items-center gap-1">
                              {cookie.secure && (
                                <span
                                  className="bg-cyan-950 text-cyan-400 px-1 py-0.2 rounded border border-cyan-800"
                                  title="HTTPS Secure"
                                >
                                  <Lock className="w-2.5 h-2.5 inline" /> SEC
                                </span>
                              )}
                              {cookie.httpOnly && (
                                <span
                                  className="bg-pink-950 text-pink-400 px-1 py-0.2 rounded border border-pink-800"
                                  title="HTTP Only"
                                >
                                  HTTP
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="border-t border-cyan-500/20 pt-2 flex items-center justify-between text-[9px] text-zinc-500 uppercase tracking-widest">
        <button
          onClick={() => setShowRulesModal(true)}
          className="text-cyan-600 hover:text-cyan-300 transition-colors flex items-center gap-1 uppercase text-[9px] tracking-widest"
        >
          <Globe className="w-3 h-3 inline" />
          <span>SCORING RULES</span>
        </button>
        <a
          href="https://huement.com/"
          target="_blank"
          rel="noreferrer"
          className="text-cyan-600 hover:text-cyan-300 transition-colors flex items-center gap-1"
        >
          <span>HUEMENT.COM</span>
        </a>
      </div>

      {/* SCORING RULES MODAL */}
      {showRulesModal && (
        <div
          onClick={() => setShowRulesModal(false)}
          className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 p-4 flex flex-col justify-between animate-fadeIn border-2 border-cyan-500/50"
        >
          <div className="space-y-2.5 overflow-hidden flex flex-col h-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 flex-shrink-0">
              <span className="text-xs font-black text-cyan-300 tracking-wider flex items-center gap-1.5 uppercase drop-shadow-[0_0_6px_#00f0ff]">
                <Globe className="w-4 h-4 text-pink-500" /> SCORING SPEC (v3.0)
              </span>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-zinc-500 hover:text-pink-500 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Rules Specification */}
            <div className="text-[10px] text-zinc-300 leading-relaxed space-y-2.5 font-mono overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/40 flex-1">
              {/* Stage 1 */}
              <div className="bg-zinc-900/90 border border-cyan-500/20 p-2 rounded space-y-1">
                <p className="font-bold text-pink-400 uppercase tracking-wider text-[9px]">
                  STAGE 1 // AFFILIATE IDENTIFICATION
                </p>
                <p className="text-zinc-400">
                  Cookie name markers, known affiliate network domains, or
                  tracking query parameters (
                  <code className="text-cyan-300">affid</code>,{' '}
                  <code className="text-cyan-300">utm_source</code>) must match.
                </p>
                <p className="text-[9px] text-yellow-400 italic pt-0.5">
                  * Programmatic DSP/SSP Ad-Tech syncs are automatically
                  suppressed.
                </p>
              </div>

              {/* Stage 2 */}
              <div className="bg-zinc-900/90 border border-cyan-500/20 p-2 rounded space-y-1.5">
                <p className="font-bold text-cyan-300 uppercase tracking-wider text-[9px]">
                  STAGE 2 // NORMALIZED SUSPICION ENGINE
                </p>

                <div className="space-y-1 text-zinc-400 text-[9px]">
                  <div className="flex justify-between border-b border-zinc-800 pb-0.5">
                    <span>1. Missing User Intent</span>
                    <strong className="text-cyan-300">30% Weight</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-0.5">
                    <span>2. Sub-Frame / XHR Delivery</span>
                    <strong className="text-cyan-300">20% Weight</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-0.5">
                    <span>3. LZ Novelty (Unvisited)</span>
                    <strong className="text-cyan-300">20% Weight</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-0.5">
                    <span>4. HTTP 302 Redirect Hop</span>
                    <strong className="text-cyan-300">15% Weight</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-0.5">
                    <span>5. Early Timing (&lt;500ms)</span>
                    <strong className="text-cyan-300">10% Weight</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>6. Third-Party Context</span>
                    <strong className="text-cyan-300">05% Weight</strong>
                  </div>
                </div>
              </div>

              {/* Adjustments & Boosts */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded space-y-1 text-[9px]">
                <p className="font-bold text-zinc-200 uppercase tracking-wider text-[9px]">
                  MODIFIERS & THRESHOLD
                </p>
                <p>
                  <strong className="text-pink-400">+25% Boost:</strong> Stealth
                  combination (Hidden iframe + No Intent + Novel Domain).
                </p>
                <p>
                  <strong className="text-emerald-400">-90% Discount:</strong>{' '}
                  Trusted infrastructure (Google, Meta, Cloudflare, Microsoft).
                </p>
                <p>
                  <strong className="text-emerald-400">-80% Discount:</strong>{' '}
                  Verified user click intent match on active tab.
                </p>
                <p className="pt-1 border-t border-zinc-800 font-bold text-cyan-300">
                  Threat Threshold: Normalized Score &ge; 45 / 100
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-1.5 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 font-bold text-xs uppercase rounded transition-colors tracking-widest shadow-[0_0_10px_rgba(0,240,255,0.2)] flex-shrink-0 mt-2"
            >
              ACKNOWLEDGE SPEC
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
