document.addEventListener(
  'pointerdown',
  (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a');

    if (anchor && anchor.href && !anchor.href.startsWith('javascript:')) {
      chrome.runtime.sendMessage({
        type: 'REGISTER_USER_INTENT',
        targetUrl: anchor.href,
        timestamp: Date.now(),
      });
    }
  },
  true
);
