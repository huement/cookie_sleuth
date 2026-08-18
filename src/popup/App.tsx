import {
  ShieldAlert,
  Terminal,
  Trash2,
  Cookie,
  Binary,
  Search,
  RefreshCw,
  Lock,
  Globe,
  Key,
} from 'lucide-react';
import type { ThreatLog } from '../types';
import React, { useEffect, useState } from 'react';
import hatLogo from '../assets/sleuth-lg.png';

const ThreatDetails = ({ threat }: { threat: ThreatLog }) => {
  const scorePercent = threat.score
    ? Math.min(Math.round((threat.score / 25) * 100), 100)
    : 0;

  const reasons = [
    { text: 'No matching user interaction', present: true },
    {
      text: 'Third-party affiliate domain',
      present: threat.context === 'third-party',
    },
    { text: `Affiliate identifier: ${threat.cookieName}`, present: true },
    {
      text: `Cookie set via ${threat.deliveryMechanism}`,
      present: !!threat.deliveryMechanism,
    },
  ];

  return (
    <div className="mt-2 p-2 bg-zinc-800/60 border border-zinc-700/80 rounded-sm text-xs animate-fadeIn">
      <p className="font-bold text-pink-400">
        {scorePercent}% likely cookie stuffing
      </p>
      <ul className="list-disc list-inside mt-1 space-y-1 text-zinc-300">
        {reasons
          .filter((r) => r.present)
          .map((r) => (
            <li key={r.text}>{r.text}</li>
          ))}
      </ul>
    </div>
  );
};

export const App = () => {
  const [activeTab, setActiveTab] = useState<'threats' | 'cookies'>('threats');
  const [threats, setThreats] = useState<ThreatLog[]>([]);
  const [totalIntercepts, setTotalIntercepts] = useState<number>(0);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);

  // Cookie Viewer State
  const [rawCookies, setRawCookies] = useState<chrome.cookies.Cookie[]>([]);
  const [cookieSearch, setCookieSearch] = useState('');
  const [isLoadingCookies, setIsLoadingCookies] = useState(false);

  // Load Threats & Storage Listeners
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      console.warn(
        '[COOKIE SLEUTH] Extension APIs not detected. Running in mock/standalone mode.'
      );
      return;
    }

    chrome.storage.local.get(['threats', 'threatCount'], (res) => {
      setThreats((res.threats as ThreatLog[]) || []);
      setTotalIntercepts((res.threatCount as number) || 0);
    });

    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.threats) {
        setThreats((changes.threats.newValue as ThreatLog[]) || []);
      }
      if (changes.threatCount) {
        setTotalIntercepts((changes.threatCount.newValue as number) || 0);
      }
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

  useEffect(() => {
    if (activeTab === 'cookies') {
      fetchLiveCookies();
    }
  }, [activeTab]);

  const clearLogs = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ threats: [] });
      if (chrome.action) {
        chrome.action.setIcon({
          path: {
            16: '/icon16.png',
            32: '/icon32.png',
          },
        });
        chrome.action.setBadgeText({ text: '' });
      }
    }
    setThreats([]);
  };

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
          <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] text-emerald-400 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            ACTIVE
          </div>
        </div>

        {/* CYBERPUNK TAB NAVIGATION */}
        <div className="relative flex bg-zinc-900/90 border border-cyan-500/20 p-1 rounded my-3 text-xs">
          {/* Animated Active Background Indicator */}
          <div
            className={`absolute top-1 bottom-1 transition-all duration-300 rounded bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)] ${
              activeTab === 'threats'
                ? 'left-1 w-[calc(50%-4px)]'
                : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'
            }`}
          />

          <button
            onClick={() => setActiveTab('threats')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 z-10 transition-colors font-bold ${
              activeTab === 'threats'
                ? 'text-cyan-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>THREAT STREAM</span>
            {threats.length > 0 && (
              <span className="px-1.5 py-0.2 bg-pink-500/30 text-pink-400 rounded-full text-[9px] font-bold border border-pink-500/40">
                {threats.length}
              </span>
            )}
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
            <span>COOKIE MATRIX</span>
          </button>
        </div>

        {/* TAB 1: THREAT STREAM */}
        {activeTab === 'threats' && (
          <div className="transition-all duration-300 opacity-100">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-zinc-900/80 border border-cyan-500/20 p-2.5 rounded shadow-inner">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Intercepts
                </p>
                <p className="text-xl font-bold text-pink-500 drop-shadow-[0_0_8px_#ff007f]">
                  {totalIntercepts.toString().padStart(4, '0')}
                </p>
              </div>
              <div className="bg-zinc-900/80 border border-cyan-500/20 p-2.5 rounded shadow-inner">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Threat Level
                </p>
                <p className="text-xl font-bold text-cyan-300 drop-shadow-[0_0_8px_#00f0ff]">
                  {threats.length > 0 ? 'ELEVATED' : 'NOMINAL'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 uppercase">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Detected
                Stuffing
              </span>
              <button
                onClick={clearLogs}
                title="Clear Event Stream"
                className="hover:text-pink-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-[240px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/40">
              {threats.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                  <img
                    src={hatLogo}
                    alt="Cookie Icon"
                    className="w-[100px] h-[100px] opacity-80"
                  />
                  <p className="text-[11px] tracking-widest">
                    NO STUFFING DETECTED
                  </p>
                </div>
              ) : (
                threats.map((threat) => (
                  <div
                    key={threat.id}
                    onClick={() =>
                      setSelectedThreatId(
                        selectedThreatId === threat.id ? null : threat.id
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
                        {new Date(threat.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      TAG:{' '}
                      <span className="text-cyan-300">{threat.cookieName}</span>
                    </div>
                    {selectedThreatId === threat.id && (
                      <ThreatDetails threat={threat} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE COOKIE MATRIX */}
        {activeTab === 'cookies' && (
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
        )}
      </div>

      {/* FOOTER BAR */}
      <div className="border-t border-cyan-500/20 pt-2 flex items-center justify-between text-[9px] text-zinc-500 uppercase tracking-widest">
        <a
          href="https://github.com/huement/"
          target="_blank"
          rel="noreferrer"
          className="hover:text-cyan-400 transition-colors flex items-center gap-1"
        >
          <span>DOCS // SCORING RULES ↗</span>
        </a>
        <span>MV3 ENGINE</span>
      </div>
    </div>
  );
};
