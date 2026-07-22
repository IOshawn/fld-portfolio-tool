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
// Project (initiative) enumerations
// ---------------------------------------------------------------------------

export const STAGES = [
  "Idea",
  "Discovery",
  "Design",
  "Build",
  "Pilot",
  "Scale",
  "Sustain",
  "Complete",
] as const;
export type Stage = (typeof STAGES)[number];

export const STATUSES = ["Green", "Amber", "Red", "On Hold", "Complete"] as const;
export type Status = (typeof STATUSES)[number];

export const MILESTONE_STATUSES = [
  "Planned",
  "On Track",
  "At Risk",
  "Delayed",
  "Complete",
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

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
// List: Portfolio Projects (initiatives)
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  title: string;
  abbrev: string; // short code shown in the engagement matrix (e.g. "SH", "ICT")
  portfolio: string;
  productArea: string;
  owner: string;
  sponsor: string;
  stage: Stage;
  status: Status;
  startDate: string;
  endDate: string;
  summary: string;
  outcomeStatement: string;
  businessValue: string;
  dependencies: string[];
  fundingSource: string;
  projectCode: string;
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
  submittedBy: string;
}

// ---------------------------------------------------------------------------
// Travel & Roster
// ---------------------------------------------------------------------------

export const TRAVEL_STATUSES = ["Planned", "Travelling", "Returned", "Cancelled"] as const;
export type TravelStatus = (typeof TRAVEL_STATUSES)[number];

export interface TravelEntry {
  id: string;
  /** Person travelling — free text; future Task #6 will link to the directory. */
  person: string;
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
