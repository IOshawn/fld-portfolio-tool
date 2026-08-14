/**
 * Central mapping from domain values to visual tokens, so RAG colours and the
 * engagement-stage ramp stay consistent across every badge, matrix and chart.
 */
import type {
  Status,
  MilestoneStatus,
  Stage,
  EngagementStage,
  EngagementStatus,
} from "../types/models";
import { ENGAGEMENT_STAGES } from "../types/models";

export type BadgeColor =
  | "brand"
  | "danger"
  | "important"
  | "informative"
  | "severe"
  | "subtle"
  | "success"
  | "warning";

/** RAG colour for a project status. */
export function statusColor(status: Status): BadgeColor {
  switch (status) {
    case "On Track":
      return "success";
    case "Off Track":
      return "warning";
    case "At Risk":
      return "danger";
    case "On Hold":
      return "informative";
    case "Complete":
      return "brand";
    default:
      return "subtle";
  }
}

/** Hex accent used for roadmap bars (kept off the pure-saturated end). */
export function statusBarColor(status: Status): string {
  switch (status) {
    case "On Track":
      return "#3d8a4f";
    case "Off Track":
      return "#c08a1e";
    case "At Risk":
      return "#bc3b3b";
    case "On Hold":
      return "#5b6b8c";
    case "Complete":
      return "#5a6470";
    default:
      return "#7a7a7a";
  }
}

export function milestoneColor(status: MilestoneStatus): BadgeColor {
  switch (status) {
    case "Complete":
      return "brand";
    case "On Track":
      return "success";
    case "Planned":
      return "informative";
    case "At Risk":
      return "warning";
    case "Delayed":
      return "danger";
    default:
      return "subtle";
  }
}

/** Ordinal position of a project stage (Define -> Implementation). */
export const STAGE_ORDER: Record<Stage, number> = {
  "Define": 0,
  "Pre-Feasability": 1,
  "Feasability": 2,
  "Implementation": 3,
};

// ---------------------------------------------------------------------------
// Engagement stage ramp (Discovery -> Scale). The single source of truth for
// every matrix cell, chip and legend. Tells a visual story: slate/indigo early,
// amber at readiness, teal/green once live.
// ---------------------------------------------------------------------------

export const ENGAGEMENT_STAGE_COLORS: Record<EngagementStage, string> = {
  Discovery: "#8c94a3",
  Design: "#5f76b5",
  Development: "#4566bf",
  Prototype: "#5a8fb0",
  Readiness: "#c2902a",
  Pilot: "#2f9e8f",
  Engaged: "#3d8a4f",
  Scale: "#2f6b3e",
};

export function stageColor(stage: EngagementStage): string {
  return ENGAGEMENT_STAGE_COLORS[stage] ?? "#7a7a7a";
}

/** Ordinal position of an engagement stage (Discovery=0 ... Scale=7). */
export function engagementStageOrder(stage: EngagementStage): number {
  const i = ENGAGEMENT_STAGES.indexOf(stage);
  return i === -1 ? 99 : i;
}

/** Activity status colour for an engagement. */
export function engagementStatusColor(status: EngagementStatus): BadgeColor {
  switch (status) {
    case "Active":
      return "success";
    case "Planned":
      return "informative";
    case "On Hold":
      return "warning";
    case "Complete":
      return "brand";
    default:
      return "subtle";
  }
}
