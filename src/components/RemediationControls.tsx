import React, { useState } from 'react';
import { Trash2, Flame, ShieldCheck, RefreshCw } from 'lucide-react';
import type { ThreatLog } from '../types';
import {
  deleteCookiesForThreat,
  purgeAllThreatCookies,
  trustDomain,
} from '../utils/remediation';

interface ActionProps {
  onActionComplete?: () => void;
}

export const NukeAllButton: React.FC<
  ActionProps & { threats: ThreatLog[]; variant?: 'full' | 'inline' | 'bottom' }
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

  if (variant === 'bottom') {
    return (
      <button
        onClick={handleNuke}
        disabled={isNuking || threats.length === 0}
        title="Delete all active threat cookies"
        className={`absolute bottom-2 right-2 z-20 px-2.5 py-1 rounded flex items-center gap-1 font-mono font-black text-[10px] uppercase tracking-wider transition-all border backdrop-blur-md shadow-lg ${
          threats.length > 0
            ? 'bg-pink-950/90 border-pink-500/80 text-pink-400 hover:bg-pink-900 hover:border-pink-400 shadow-[0_0_10px_rgba(255,0,127,0.4)] active:scale-95 cursor-pointer'
            : 'bg-zinc-900/90 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60'
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
      className="h-7 px-2.5 border bg-pink-950/40 border-pink-400/60 hover:border-pink-300 hover:bg-pink-950/80 text-zinc-300 hover:text-pink-300 rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-sm group flex-shrink-0"
    >
      {isDeleting ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin text-pink-400" />
          <span>PURGING...</span>
        </>
      ) : (
        <>
          <Trash2 className="w-3 h-3 text-zinc-400 group-hover:text-pink-400 transition-colors" />
        </>
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
      className="h-7 px-2.5 bg-emerald-950/40 border border-emerald-500/80 hover:border-emerald-400 hover:bg-emerald-950/80 text-emerald-400 rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-[0_0_8px_rgba(16,185,129,0.2)] group flex-shrink-0"
    >
      <ShieldCheck className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
      <span>{isTrusting ? 'TRUSTING...' : 'TRUST'}</span>
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
