import { useEffect, useRef } from 'react';

// Re-runs a list's fetch when the page comes back into view, and every
// `intervalMs` while it stays visible.
//
// The app has no live updates: each list is a snapshot taken when its page
// opened. A demande d'accès created by a responsable did not appear on the
// admin's open "Demandes d'Accès" page until a manual reload, and every other
// list behaved the same way.
//
// The refresh is silent: it calls fetchFn({ silent: true }), and fetchers that
// show a loading spinner skip it in that case, so the list updates in place
// instead of flashing.
const MIN_GAP_MS = 2000; // focus and visibilitychange fire together on a tab switch

export default function useAutoRefresh(fetchFn, intervalMs = 30000) {
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn; // always call the latest closure

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - last < MIN_GAP_MS) return;
      last = now;
      fetchRef.current({ silent: true });
    };

    const timer = setInterval(refresh, intervalMs);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [intervalMs]);
}
