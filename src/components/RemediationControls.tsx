// src/components/RemediationControls.tsx
import React, { useState } from 'react';
import { Trash2, Flame, ShieldCheck, RefreshCw } from 'lucide-react';
import type { ThreatLog } from '../types';

// =================================================================
// 1. HELPER FUNCTIONS
// =================================================================

/**
 * Removes all cookies from the browser associated with a specific threat domain
 * and syncs local extension storage.
 */
export const deleteCookiesForThreat = async (
  threat: ThreatLog
): Promise<number> => {
  if (typeof chrome === 'undefined' || !chrome.cookies) return 0;

  const cleanTd = threat.domain.replace(/^\./, '').toLowerCase();

  return new Promise((resolve) => {
    chrome.cookies.getAll({}, async (allCookies) => {
      const matches = (allCookies || []).filter((ck) => {
        const cleanCd = ck.domain.replace(/^\./, '').toLowerCase();
        return (
          cleanCd === cleanTd ||
          cleanCd.endsWith('.' + cleanTd) ||
          cleanTd.endsWith('.' + cleanCd)
        );
      });

      let removedCount = 0;
      for (const ck of matches) {
        const proto = ck.secure ? 'https' : 'http';
        const domain = ck.domain.replace(/^\./, '');
        const url = `${proto}://${domain}${ck.path || '/'}`;
        try {
          await chrome.cookies.remove({
            url,
            name: ck.name,
            storeId: ck.storeId,
          });
          removedCount++;
        } catch {
          // Ignore errors for locked cookies
        }
      }

      if (chrome.storage?.local) {
        chrome.storage.local.get(['threats'], (res) => {
          const currentThreats: ThreatLog[] = Array.isArray(res.threats)
            ? res.threats
            : [];
          const updatedThreats = currentThreats.filter(
            (t) => t.id !== threat.id
          );

          chrome.storage.local.set(
            {
              threats: updatedThreats,
              threatCount: updatedThreats.length,
            },
            () => {
              if (chrome.action) {
                chrome.action.setBadgeText({
                  text:
                    updatedThreats.length > 0
                      ? String(updatedThreats.length)
                      : '',
                });
              }
              resolve(removedCount);
            }
          );
        });
      } else {
        resolve(removedCount);
      }
    });
  });
};

/**
 * Nukes ALL active threat cookies across all logged threats and resets browser badge state.
 */
export const purgeAllThreatCookies = async (
  threats: ThreatLog[]
): Promise<number> => {
  let totalDeleted = 0;
  for (const threat of threats) {
    totalDeleted += await deleteCookiesForThreat(threat);
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ threats: [], threatCount: 0 }, () => {
      if (chrome.action) {
        chrome.action.setIcon({
          path: { 16: '/icon16.png', 32: '/icon32.png' },
        });
        chrome.action.setBadgeText({ text: '' });
      }
    });
  }
  return totalDeleted;
};

/**
 * Adds a domain to the local whitelist and purges existing threat alerts for it.
 */
export const trustDomain = async (domain: string): Promise<void> => {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const clean = domain
    .replace(/^\./, '')
    .replace(/^www\./, '')
    .toLowerCase();

  return new Promise((resolve) => {
    chrome.storage.local.get(['whitelistedDomains', 'threats'], (res) => {
      const currentWhitelist: string[] = Array.isArray(res.whitelistedDomains)
        ? res.whitelistedDomains
        : [];

      if (!currentWhitelist.includes(clean)) {
        currentWhitelist.push(clean);
      }

      const threats: ThreatLog[] = Array.isArray(res.threats)
        ? res.threats
        : [];
      const filteredThreats = threats.filter(
        (t) => !t.domain.toLowerCase().includes(clean)
      );

      chrome.storage.local.set(
        {
          whitelistedDomains: currentWhitelist,
          threats: filteredThreats,
          threatCount: filteredThreats.length,
        },
        () => {
          if (chrome.action) {
            chrome.action.setBadgeText({
              text:
                filteredThreats.length > 0
                  ? String(filteredThreats.length)
                  : '',
            });
          }
          resolve();
        }
      );
    });
  });
};

// =================================================================
// 2. EXPORTED UI BUTTON COMPONENTS
// =================================================================

interface ActionProps {
  onActionComplete?: () => void;
}

/**
 * Global "NUKE ALL" Button with full and inline compact variants.
 */
export const NukeAllButton: React.FC<
  ActionProps & { threats: ThreatLog[]; variant?: 'full' | 'inline' }
> = ({ threats, onActionComplete, variant = 'full' }) => {
  const [isNuking, setIsNuking] = useState(false);

  const handleNuke = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (threats.length === 0) return;
    setIsNuking(true);
    await purgeAllThreatCookies(threats);
    setIsNuking(false);
    if (onActionComplete) onActionComplete();
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={handleNuke}
        disabled={isNuking || threats.length === 0}
        title="Delete all active threat cookies"
        className={`px-2 py-0.5 rounded flex items-center gap-1 font-mono font-black text-[10px] uppercase tracking-wider transition-all border ${
          threats.length > 0
            ? 'bg-pink-950/80 border-pink-500/80 text-pink-400 hover:bg-pink-900/90 hover:border-pink-400 shadow-[0_0_8px_rgba(255,0,127,0.3)] active:scale-95 cursor-pointer'
            : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60'
        }`}
      >
        {isNuking ? (
          <>
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-pink-400" />
            <span>PURGING...</span>
          </>
        ) : (
          <>
            <Flame className="w-2.5 h-2.5 text-pink-500 animate-pulse" />
            <span>NUKE ALL</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleNuke}
      disabled={isNuking || threats.length === 0}
      className={`w-full py-1.5 px-3 rounded flex items-center justify-center gap-2 font-mono font-black text-xs uppercase tracking-wider transition-all border ${
        threats.length > 0
          ? 'bg-pink-950/80 border-pink-500/80 text-pink-400 hover:bg-pink-900 shadow-[0_0_12px_rgba(255,0,127,0.3)] active:scale-95 cursor-pointer'
          : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
      }`}
    >
      {isNuking ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
          <span>PURGING COOKIES...</span>
        </>
      ) : (
        <>
          <Flame className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
          <span>NUKE FRAUD COOKIES ({threats.length})</span>
        </>
      )}
    </button>
  );
};

export const PurgeThreatButton: React.FC<
  ActionProps & { threat: ThreatLog }
> = ({ threat, onActionComplete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    await deleteCookiesForThreat(threat);
    setIsDeleting(false);
    if (onActionComplete) onActionComplete();
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      title="Delete cookies for this threat domain"
      className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-pink-500/60 hover:text-pink-400 text-zinc-400 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
    >
      {isDeleting ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-500" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

export const TrustDomainButton: React.FC<ActionProps & { domain: string }> = ({
  domain,
  onActionComplete,
}) => {
  const [isTrusting, setIsTrusting] = useState(false);

  const handleTrust = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTrusting(true);
    await trustDomain(domain);
    setIsTrusting(false);
    if (onActionComplete) onActionComplete();
  };

  return (
    <button
      onClick={handleTrust}
      disabled={isTrusting}
      title="Trust domain and dismiss future threat alerts"
      className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-emerald-500 hover:text-emerald-400 text-zinc-400 rounded text-[10px] font-mono font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
    >
      <ShieldCheck className="w-3 h-3 text-emerald-500" />
      <span>{isTrusting ? 'TRUSTING...' : 'TRUST DOMAIN'}</span>
    </button>
  );
};

export const RemediationPanel: React.FC<
  ActionProps & { threats: ThreatLog[] }
> = ({ threats, onActionComplete }) => {
  return (
    <div className="p-2 bg-zinc-950/90 backdrop-blur border-t border-cyan-500/20 sticky bottom-0 z-10">
      <NukeAllButton threats={threats} onActionComplete={onActionComplete} />
    </div>
  );
};
