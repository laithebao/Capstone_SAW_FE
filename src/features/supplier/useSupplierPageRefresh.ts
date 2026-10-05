import { useEffect, useRef } from 'react';

export function useSupplierPageRefresh(refresh: () => void | Promise<void>, enabled = true) {
  const lastRefresh = useRef(0);
  useEffect(() => {
    const resume = () => {
      if (!enabled || document.visibilityState !== 'visible') return;
      const now = Date.now();
      // Browsers can emit visibilitychange and focus for the same tab switch.
      if (now - lastRefresh.current < 500) return;
      lastRefresh.current = now;
      void refresh();
    };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) resume(); };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', restore);
    return () => {
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', restore);
    };
  }, [refresh, enabled]);
}
