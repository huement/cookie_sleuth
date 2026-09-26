import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Trash2, Key, Globe, Lock } from 'lucide-react';

interface CookiesTabProps {
  rawCookies: chrome.cookies.Cookie[];
  isLoadingCookies: boolean;
  fetchLiveCookies: () => void;
  deleteSingleCookie: (cookie: chrome.cookies.Cookie) => void;
}

const CookiesTab: React.FC<CookiesTabProps> = ({
  rawCookies,
  isLoadingCookies,
  fetchLiveCookies,
  deleteSingleCookie,
}) => {
  const [cookieSearch, setCookieSearch] = useState('');

  const filteredCookies = rawCookies.filter(
    (c) =>
      c.name.toLowerCase().includes(cookieSearch.toLowerCase()) ||
      c.domain.toLowerCase().includes(cookieSearch.toLowerCase())
  );

  return (
    <motion.div
      key="cookies-tab"
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 15 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-2 h-full flex flex-col justify-between"
    >
      {/* Search and Refresh Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-zinc-900/90 border border-cyan-500/30 rounded px-2 py-1 gap-1.5 text-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
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
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs tracking-wider">
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
                  className="text-zinc-600 hover:text-pink-500 transition-colors p-0.5"
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
    </motion.div>
  );
};

export default CookiesTab;
