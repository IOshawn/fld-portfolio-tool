/**
 * Domain model for the Frontline Digital Portfolio Hub.
 *
 * The hub has TWO equal pillars (per the design addendum):
 *   1. Initiative Management — what we deliver, why, and when  (Project)
 *   2. Engagement Planning    — where, who, which teams, what phase  (Engagement)
 *
 * These interfaces mirror the SharePoint Lists. In Phase 1 they are populated
 * from mock JSON; in Phase 3 the SharePoint provider returns the same shapes so
 * UI code never changes.
 *
 * Dates are ISO `YYYY-MM-DD` strings (date-only) for stable, timezone-independent
 * rendering and roadmap maths.
 */

// ---------------------------------------------------------------------------
// Person identity
// ---------------------------------------------------------------------------

/**
 * Full person identity stored wherever a person is referenced.
 * corpId is the Azure AD / Entra ID login name (e.g. "brett.riley").
 */
export interface PersonRef {
  name: string;
  email: string;
  corpId: string;
}

/**
 * Create a minimal PersonRef from a bare name string.
 * Used to normalise legacy data that only stored a display name.
 */
export function personRefFromString(name: string): PersonRef {
  return { name: name.trim(), email: "", corpId: "" };
}

/**
 * Normalise a value that may be a full PersonRef or a legacy bare name string.
 */
export function toPersonRef(v: PersonRef | string | null | undefined): PersonRef {
  if (!v) return { name: "", email: "", corpId: "" };
  if (typeof v === "string") return personRefFromString(v);
  return v;
}

/**
 * Extract just the display name from a PersonRef or a bare name string.
 * Safe to call anywhere a person name should be rendered as plain text.
 */
export function personName(v: PersonRef | string | null | undefined): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.name;
}

// ---------------------------------------------------------------------------
// Project (initiative) enumerations
// ---------------------------------------------------------------------------

export const STAGES = [
  "Define",
  "Pre-Feasability",
  "Feasability",
  "Implementation",
] as const;
export type Stage = (typeof STAGES)[number];

/**
 * Map a legacy project lifecycle value (Idea … Complete) — which may still
 * exist in localStorage, live Azure SQL, or SharePoint rows — to the current
 * four-stage vocabulary. Current values pass through unchanged.
 * Note: applies to PROJECT stages only; engagement stages are a separate model.
 */
export function normalizeProjectStage(raw: string): Stage {
  switch (raw) {
    case "Idea":       return "Define";
    case "Discovery":  return "Pre-Feasability";
    case "Design":     return "Feasability";
    case "Build":
    case "Pilot":
    case "Scale":
    case "Sustain":
    case "Complete":   return "Implementation";
  }
  if ((STAGES as readonly string[]).includes(raw)) return raw as Stage;
  return "Define"; // safe fallback for unknown/empty values
}

/**
 * Labels that came from the retired lifecycle vocabulary (or the pre-
 * consolidation DIGBY custom breakdown). When a stored phase label is one of
 * these, it should be replaced with the canonical stage name; genuinely
 * custom labels are preserved.
 */
const LEGACY_PHASE_LABELS = new Set<string>([
  "Idea", "Discovery", "Design", "Build", "Pilot", "Scale", "Sustain", "Complete",
  "Prototype Build", "Operator Pilot", "Scale & Rollout",
]);

/**
 * Normalize an embedded project-stage (phase) record loaded from persisted
 * data (localStorage, Azure SQL, SharePoint): maps the stage to the canonical
 * four-value vocabulary and rewrites legacy lifecycle labels to the canonical
 * stage name, keeping genuinely custom labels intact.
 */
export function normalizeProjectStageRecord<T extends { stage?: unknown; label?: unknown }>(
  ps: T
): T & { stage: Stage; label: string } {
  const stage = normalizeProjectStage(String(ps.stage ?? ""));
  const rawLabel = String(ps.label ?? "").trim();
  const label = !rawLabel || LEGACY_PHASE_LABELS.has(rawLabel) ? stage : rawLabel;
  return { ...ps, stage, label };
}

export const STATUSES = ["On Track", "Off Track", "At Risk", "On Hold", "Complete"] as const;
export type Status = (typeof STATUSES)[number];

export const MILESTONE_STATUSES = [
  "Planned",
  "On Track",
  "At Risk",
  "Delayed",
  "Complete",
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

/**
 * Portfolio areas — the top-level groupings for projects.
 * Update this list when new portfolio areas are added.
 */
export const PORTFOLIOS = [
  "Maintenance & Work Management",
  "Operations & Decision Intelligence",
  "Workforce Safety",
  "Performance & Experience Enablement",
  "Frontline",
] as const;
export type Portfolio = (typeof PORTFOLIOS)[number];

/**
 * Short-form labels for each portfolio — used in space-constrained contexts such as
 * filter chips, card badges, column headers, dependency-picker options, and export slides.
 * The full name should be used in headings and section titles where space permits.
 */
export const PORTFOLIO_SHORT_NAMES: Record<Portfolio, string> = {
  "Maintenance & Work Management":    "Maintenance",
  "Operations & Decision Intelligence": "Operations",
  "Workforce Safety":                 "Safety",
  "Performance & Experience Enablement": "Experience",
  "Frontline":                        "Frontline",
};

/**
 * Product / functional areas within a portfolio.
 * Update this list when new product areas are added.
 */
export const PRODUCT_AREAS = [
  "Work Management",
  "Mobility",
  "Permit to Work",
  "Safety Analytics",
  "Performance Analytics",
  "Shift Operations",
  "Short Interval Control",
  "Platform",
  "Process Automation",
  "Generative AI",
  "Predictive Maintenance",
  "Haulage & Dewatering",
] as const;
export type ProductArea = (typeof PRODUCT_AREAS)[number];

// ---------------------------------------------------------------------------
// Engagement-planning vocabulary (sourced from the Engagement Roadmap pack)
// ---------------------------------------------------------------------------

/** Work areas — the matrix rows. */
export const WORK_AREAS = [
  "OE/BI",
  "Production",
  "Drill & Blast",
  "Development",
  "Mine Water Management",
  "MEM",
  "Fixed Plant",
] as const;
export type WorkArea = (typeof WORK_AREAS)[number];

/** Site codes — the matrix columns. Names are indicative (confirm in Phase 3). */
export const SITES = [
  "MDO",
  "WAN",
  "YAN",
  "GDI",
  "GTP",
  "BM4",
  "GNAM",
  "HD1",
  "HD4",
  "PBO",
  "RV",
  "PMO Control",
] as const;
export type Site = (typeof SITES)[number];

export const SITE_NAMES: Record<Site, string> = {
  MDO: "Mesa A",
  WAN: "West Angelas",
  YAN: "Yandicoogina",
  GDI: "Gudai-Darri",
  GTP: "Greater Tom Price",
  BM4: "Brockman 4",
  GNAM: "Greater Nammuldi",
  HD1: "Hope Downs 1",
  HD4: "Hope Downs 4",
  PBO: "Paraburdoo",
  RV: "Robe Valley",
  "PMO Control": "PMO / Control",
};

/**
 * Engagement Stage — the deployment lifecycle a team at a site moves through.
 * This is the value shown in the roadmap pack's matrix cells. Configurable:
 * edit this list (and STAGE_COLORS in lib/theme) to change the ladder.
 */
export const ENGAGEMENT_STAGES = [
  "Discovery",
  "Design",
  "Development",
  "Prototype",
  "Readiness",
  "Pilot",
  "Engaged",
  "Scale",
] as const;
export type EngagementStage = (typeof ENGAGEMENT_STAGES)[number];

/** Engagement activity status — is the engagement live, planned, paused or done. */
export const ENGAGEMENT_STATUSES = ["Planned", "Active", "On Hold", "Complete"] as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Project stage breakdown
// ---------------------------------------------------------------------------

/**
 * A named phase / stage within a project.
 * Projects that span multiple distinct phases can define these so the roadmap
 * and detail page render each phase as its own bar / row.
 */
export interface ProjectStage {
  id: string;
  projectId: string;
  /** Human-readable label, e.g. "Phase 1 — Pilot" or "Stage 2 — Scale". */
  label: string;
  stage: Stage;
  status: Status;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// List: Portfolio Projects (initiatives)
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  title: string;
  /** Short code shown in the engagement matrix, e.g. "SH", "ICT". */
  abbrev: string;
  portfolio: string;
  productArea: string;
  owner: PersonRef;
  sponsor: PersonRef;
  stage: Stage;
  status: Status;
  startDate: string;
  endDate: string;
  summary: string;
  outcomeStatement: string;
  businessValue: string;
  dependencies: string[];
  fundingSource: string;
  /** N or P code — free-text entry, e.g. "N12345". Not pre-populated. */
  nOrPCode: string;
  /** Sites directly associated with this project (multi-selected from SITES). */
  sites: Site[];
  /** Optional phase breakdown. When populated the roadmap renders one bar per phase. */
  projectStages: ProjectStage[];
  lastUpdate: string;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// List: Project Milestones
// ---------------------------------------------------------------------------

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  date: string;
  status: MilestoneStatus;
  notes: string;
}

// ---------------------------------------------------------------------------
// List: Site Engagements (first-class entity)
// ---------------------------------------------------------------------------

export interface Engagement {
  id: string;
  initiativeId: string; // FK -> Project.id
  portfolio: string; // denormalised from the initiative for fast filtering
  site: Site;
  workArea: WorkArea;
  team: string;
  stage: EngagementStage;
  status: EngagementStatus;
  startDate: string;
  endDate: string;
  purpose: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// List: Project Updates (append-only history)
// ---------------------------------------------------------------------------

export interface ProjectUpdate {
  id: string;
  projectId: string;
  date: string;
  summary: string;
  risks: string;
  decisionsRequired: string;
  submittedBy: PersonRef;
}

// ---------------------------------------------------------------------------
// Travel & Roster
// ---------------------------------------------------------------------------

export const TRAVEL_STATUSES = ["Planned", "Booked"] as const;
export type TravelStatus = (typeof TRAVEL_STATUSES)[number];

/** Normalise a legacy travel status value to the current two-value set. */
export function normalizeTravelStatus(raw: string): TravelStatus {
  if (raw === "Travelling" || raw === "Returned") return "Booked";
  if (raw === "Cancelled") return "Planned";
  if (raw === "Booked") return "Booked";
  return "Planned"; // default / unknown
}

/**
 * Normalise a legacy project status value to the current semantic-label set.
 * Maps old colour names that may still exist in live Azure SQL or SharePoint rows
 * before the database migration script has been run.
 *   Green → On Track
 *   Amber → Off Track
 *   Red   → At Risk
 */
export function normalizeProjectStatus(raw: string): Status {
  if (raw === "Green")  return "On Track";
  if (raw === "Amber")  return "Off Track";
  if (raw === "Red")    return "At Risk";
  if ((STATUSES as readonly string[]).includes(raw)) return raw as Status;
  return "On Track"; // safe fallback for unknown/empty values
}

export interface TravelEntry {
  id: string;
  /** Person travelling — full identity stored as PersonRef. */
  person: PersonRef;
  /** Optional FK to Project.id */
  initiativeId: string;
  site: Site;
  workArea: WorkArea;
  team: string;
  departureDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  /** Stored for display; live lookup is out of scope for this version. */
  flightNumber?: string;
  description: string;
  status: TravelStatus;
  /** IDs of other TravelEntry records travelling together with this person. */
  associatedWith: string[];
}

/** Aggregate snapshot of the whole portfolio held by the in-memory store. */
export interface PortfolioData {
  projects: Project[];
  milestones: Milestone[];
  engagements: Engagement[];
  updates: ProjectUpdate[];
  travelEntries: TravelEntry[];
}
