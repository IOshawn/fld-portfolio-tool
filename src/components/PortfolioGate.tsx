import type { ReactNode } from "react";
import type { PortfolioData } from "../types/models";
import { usePortfolio } from "../hooks/usePortfolio";
import { portfolioStore } from "../store/portfolioStore";
import { LoadingState, ErrorState } from "./states";

/**
 * Standard load/error boundary for pages. Renders children with loaded data;
 * keeps showing data during background refreshes; surfaces a retry on error.
 */
export function PortfolioGate({
  children,
}: {
  children: (data: PortfolioData) => ReactNode;
}): JSX.Element {
  const { phase, data, error } = usePortfolio();
  if (data) return <>{children(data)}</>;
  if (phase === "error") {
    return (
      <ErrorState
        message={error ?? "Unable to load the portfolio."}
        onRetry={() => void portfolioStore.reload()}
      />
    );
  }
  return <LoadingState />;
}
