import { useEffect, useState } from "react";
import { portfolioStore, type PortfolioSnapshot } from "../store/portfolioStore";

/**
 * Subscribe to the portfolio cache. Triggers the initial load on first use and
 * re-renders whenever the cache changes (loads, updates, milestone/engagement saves).
 *
 * Uses a useState + subscribe pattern (rather than useSyncExternalStore) so it
 * runs unchanged on both React 18 (the Vite prototype) and React 17 (SPFx).
 */
export function usePortfolio(): PortfolioSnapshot {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(portfolioStore.getSnapshot());
  useEffect(() => {
    portfolioStore.ensureLoaded();
    setSnapshot(portfolioStore.getSnapshot());
    return portfolioStore.subscribe(() => setSnapshot(portfolioStore.getSnapshot()));
  }, []);
  return snapshot;
}

/** The store singleton, for components that fire write actions. */
export function usePortfolioActions() {
  return portfolioStore;
}
