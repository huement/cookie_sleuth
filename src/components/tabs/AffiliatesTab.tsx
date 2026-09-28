import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Trash2, Key, Globe, Lock } from 'lucide-react';

interface AffiliatesTabProps {
  affiliateCookies: chrome.cookies.Cookie[];
  isLoadingAffiliateCookies: boolean;
  fetchAffiliateCookies: () => void;
  deleteSingleCookie: (cookie: chrome.cookies.Cookie) => void;
  uniqueNetworksCount: number;
}

const AffiliatesTab: React.FC<AffiliatesTabProps> = ({
  affiliateCookies,
  isLoadingAffiliateCookies,
  fetchAffiliateCookies,
  deleteSingleCookie,
  uniqueNetworksCount,
}) => {
  const [affiliateSearch, setAffiliateSearch] = useState('');

  const filteredAffiliateCookies = affiliateCookies.filter(
    (c) =>
      c.name.toLowerCase().includes(affiliateSearch.toLowerCase()) ||
      c.domain.toLowerCase().includes(affiliateSearch.toLowerCase())
  );

  return (
    <motion.div
      key="affiliates-tab"
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 15 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-1 h-full flex flex-col justify-between"
    >
      {/* Search and Refresh Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-zinc-900/90 border border-cyan-500/30 rounded px-2 py-1 gap-1.5 text-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
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
              isLoadingAffiliateCookies ? 'animate-spin text-pink-500' : ''
            }`}
          />
        </button>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 gap-3 mb-1">
        <div className="bg-zinc-900/80 border border-cyan-500/20 py-1 px-2 rounded shadow-inner flex items-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest w-1/2">
            Active Affiliates
          </p>
          <p className="text-lg font-bold text-pink-500 drop-shadow-[0_0_8px_#ff007f] w-1/2 text-right">
            {affiliateCookies.length.toString().padStart(4, '0')}
          </p>
        </div>
        <div className="bg-zinc-900/80 border border-cyan-500/20 py-1 px-2 rounded shadow-inner flex items-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest w-1/2">
            Unique Networks
          </p>
          <p className="text-lg font-bold text-cyan-300 drop-shadow-[0_0_8px_#00f0ff] w-1/2 text-right">
            {uniqueNetworksCount.toString().padStart(4, '0')}
          </p>
        </div>
      </div>

      {/* Cookies Live Feed List */}
      <div className="h-[310px] overflow-y-auto space-y-1.5 pr-1 pb-2 scrollbar-thin scrollbar-thumb-cyan-500/40">
        {filteredAffiliateCookies.length === 0 ? (
          <div
            key="no-affiliates"
            className="h-full flex items-center justify-center text-zinc-600 text-xs tracking-wider"
          >
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

export default AffiliatesTab;
