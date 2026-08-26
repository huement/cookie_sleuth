document.addEventListener(
  'pointerdown',
  (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a');

    if (anchor && anchor.href && !anchor.href.startsWith('javascript:')) {
      // Guard against context invalidation during development reloads
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        try {
          chrome.runtime.sendMessage({
            type: 'REGISTER_USER_INTENT',
            targetUrl: anchor.href,
            timestamp: Date.now(),
          });
        } catch (e) {
          console.warn(
            '[Cookie Sleuth] Extension context invalidated. Refresh the page.'
          );
        }
      }
    }
  },
  true
);
