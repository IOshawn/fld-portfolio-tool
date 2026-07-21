/**
 * Types for the Q3 Quarterly Summary page.
 * Kept separate from models.ts so this curated view can evolve independently.
 */

export const QUARTERLY_PORTFOLIO_AREAS = [
  "Frontline Maintenance",
  "Operations & Decision Intelligence",
  "Frontline HSE",
  "Frontline People & AI",
] as const;

export type PortfolioArea = (typeof QUARTERLY_PORTFOLIO_AREAS)[number];

/** A single milestone entry for the quarterly summary view. */
export interface QuarterlyMilestone {
  id: string;
  portfolioArea: PortfolioArea;
  /** Optional sub-group label within a portfolio area (e.g. "Control Room Digital"). */
  subGroup?: string;
  initiative: string;
  /** Short description shown beneath the initiative name in the row. */
  initiativeDescription?: string;
  milestone: string;
  /**
   * ISO YYYY-MM-DD used for sorting. For date ranges this is the end date.
   * For vague targets (Q3, Q1 2027) use the last day of that period.
   */
  targetDate: string;
  /**
   * Human-readable label that overrides the formatted targetDate in chips.
   * Use for ranges ("Jul–Oct"), vague periods ("Q3", "Q1 2027"),
   * or relative labels ("By end of Q3").
   */
  dateLabel?: string;
  notes?: string;
}

/**
 * Timing bucket relative to today — drives chip colour.
 * Computed at render time from `targetDate`, not stored in JSON.
 */
export type MilestoneTiming =
  | "past"        // before today
  | "this-month"  // same calendar month as today
  | "next-month"  // following calendar month
  | "later-q3"    // within Q3 but beyond next month
  | "beyond-q3";  // after Q3
