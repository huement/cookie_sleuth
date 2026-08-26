import type { ThreatLog } from '../types';

// =================================================================
// HELPER FUNCTIONS
// Actions used in the remediation process. When a user clicks a cookie and wants
// it removed, we delete all cookies for that domain and remove it from the local
// storage. Alternatively, they can just remove ALL cookies at once as well.
// =================================================================

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
                if (updatedThreats.length === 0) {
                  chrome.action.setIcon({
                    path: { 16: '/icon16.png', 32: '/icon32.png' },
                  });
                  chrome.action.setBadgeText({ text: '' });
                } else {
                  chrome.action.setBadgeText({
                    text: String(updatedThreats.length),
                  });
                }
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
            if (filteredThreats.length === 0) {
              chrome.action.setIcon({
                path: { 16: '/icon16.png', 32: '/icon32.png' },
              });
              chrome.action.setBadgeText({ text: '' });
            } else {
              chrome.action.setBadgeText({
                text: String(filteredThreats.length),
              });
            }
          }
          resolve();
        }
      );
    });
  });
};
