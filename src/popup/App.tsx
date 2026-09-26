import { ShieldAlert, Cookie, Users, Binary, Globe, X } from 'lucide-react';
import type { ThreatLog } from '../types';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AFFILIATE_COOKIE_MARKERS,
  KNOWN_AFFILIATE_NETWORKS,
} from '../constants/affiliate';
import ThreatsTab from '../components/tabs/ThreatsTab';
import AffiliatesTab from '../components/tabs/AffiliatesTab';
import CookiesTab from '../components/tabs/CookiesTab';

export const App = () => {
  const [activeTab, setActiveTab] = useState<
    'threats' | 'cookies' | 'affiliates'
  >('threats');
  const [threats, setThreats] = useState<ThreatLog[]>([]);
  const [totalIntercepts, setTotalIntercepts] = useState<number>(0);
  const [lzNoveltyRate, setLzNoveltyRate] = useState<number>(0);
  const [navDictSize, setNavDictSize] = useState<number>(0);
  const [rawCookies, setRawCookies] = useState<chrome.cookies.Cookie[]>([]);
  const [isLoadingCookies, setIsLoadingCookies] = useState(false);
  const [affiliateCookies, setAffiliateCookies] = useState<
    chrome.cookies.Cookie[]
  >([]);
  const [isLoadingAffiliateCookies, setIsLoadingAffiliateCookies] =
    useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Storage Listener & Initial Hydration
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
      const filteredAffiliates = (cookies || []).filter((cookie) => {
        const matchesMarker = AFFILIATE_COOKIE_MARKERS.some((marker) =>
          marker.pattern.test(cookie.name)
        );
        const matchesNetwork = KNOWN_AFFILIATE_NETWORKS.some((network) =>
          network.pattern.test(cookie.domain)
        );
        return matchesMarker || matchesNetwork;
      });

      setAffiliateCookies(filteredAffiliates);
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
  }, [activeTab]);

  const deleteSingleCookie = (cookie: chrome.cookies.Cookie) => {
    if (typeof chrome === 'undefined' || !chrome.cookies) return;
    const protocol = cookie.secure ? 'https:' : 'http:';
    const url = `${protocol}//${cookie.domain.replace(/^\./, '')}${cookie.path}`;

    chrome.cookies.remove({ url, name: cookie.name }, () => {
      fetchLiveCookies();
      fetchAffiliateCookies();
    });
  };

  const fetchState = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['threats'], (res) => {
        setThreats(Array.isArray(res.threats) ? res.threats : []);
      });
    }
  };

  return (
    <div className="w-[380px] h-[520px] bg-zinc-950 text-cyan-400 font-mono px-4 py-2 flex flex-col justify-between select-none border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.15)] relative overflow-hidden">
      {/* TOP SECTION WRAPPER */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-pink-500 animate-pulse drop-shadow-[0_0_8px_#ff007f]" />
            <h1 className="text-lg font-black tracking-wider text-cyan-300 uppercase drop-shadow-[0_0_5px_#00f0ff]">
              COOKIE SLEUTH
            </h1>
          </div>
          <AnimatePresence mode="wait">
            {isLoadingCookies || isLoadingAffiliateCookies ? (
              <motion.div
                key="status-loading"
                className="flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-500/50 px-2 rounded text-[10px] text-cyan-400 tracking-widest uppercase animate-pulse"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                LOADING
              </motion.div>
            ) : (
              <motion.div
                key="status-active"
                className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 px-2 rounded text-[10px] text-emerald-400 tracking-widest uppercase"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ACTIVE
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TAB NAVIGATION BUTTONS */}
        <div className="relative flex bg-zinc-900/90 border border-cyan-500/20 p-1 rounded mb-3 mt-2 text-xs flex-shrink-0">
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

        {/* ACTIVE TAB CONTENT DISPLAY */}
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'threats' && (
              <ThreatsTab
                threats={threats}
                totalIntercepts={totalIntercepts}
                lzNoveltyRate={lzNoveltyRate}
                navDictSize={navDictSize}
                fetchState={fetchState}
              />
            )}

            {activeTab === 'affiliates' && (
              <AffiliatesTab
                affiliateCookies={affiliateCookies}
                isLoadingAffiliateCookies={isLoadingAffiliateCookies}
                fetchAffiliateCookies={fetchAffiliateCookies}
                deleteSingleCookie={deleteSingleCookie}
                uniqueNetworksCount={uniqueNetworksCount}
              />
            )}

            {activeTab === 'cookies' && (
              <CookiesTab
                rawCookies={rawCookies}
                isLoadingCookies={isLoadingCookies}
                fetchLiveCookies={fetchLiveCookies}
                deleteSingleCookie={deleteSingleCookie}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="border-t border-cyan-500/20 pt-2 flex items-center justify-between text-[9px] text-zinc-500 uppercase tracking-widest flex-shrink-0">
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

      {/* SCORING SPEC MODAL OVERLAY */}
      {showRulesModal && (
        <div
          onClick={() => setShowRulesModal(false)}
          className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 p-4 flex flex-col justify-between animate-fadeIn border-2 border-cyan-500/50"
        >
          <div className="space-y-2.5 overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 flex-shrink-0">
              <span className="text-xs font-black text-cyan-300 tracking-wider flex items-center gap-1.5 uppercase drop-shadow-[0_0_6px_#00f0ff]">
                <Globe className="w-4 h-4 text-pink-500" /> SCORING SPEC (v3.2)
              </span>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-zinc-500 hover:text-pink-500 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] text-zinc-300 leading-relaxed space-y-2.5 font-mono overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/40 flex-1">
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
                <p className="text-[11px] text-yellow-400 italic pt-0.5">
                  * Programmatic DSP/SSP Ad-Tech syncs are automatically
                  suppressed.
                </p>
              </div>

              <div className="bg-zinc-900/90 border border-cyan-500/20 p-2 rounded space-y-1.5">
                <p className="font-bold text-cyan-300 uppercase tracking-wider text-[9px]">
                  STAGE 2 // NORMALIZED SUSPICION ENGINE
                </p>

                <div className="space-y-1 text-zinc-400 text-[11px]">
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

              <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded space-y-1 text-[11px]">
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
