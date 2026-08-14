/**
 * Pure derivations over the portfolio + engagement data. Pages call these rather
 * than recomputing inline, so the hub's "intelligence" lives in one testable
 * place (and maps cleanly to the Phase 2 Copilot questions).
 */
import type {
  PortfolioData,
  Project,
  Milestone,
  Engagement,
  ProjectUpdate,
  Stage,
  Status,
  Site,
  WorkArea,
  EngagementStage,
} from "../types/models";
import { STAGES, STATUSES, SITES, WORK_AREAS } from "../types/models";
import { parseISO, today } from "./format";
import { engagementStageOrder } from "./theme";

const byDateAsc = (a: { date: string }, b: { date: string }) =>
  parseISO(a.date).getTime() - parseISO(b.date).getTime();
const byDateDesc = (a: { date: string }, b: { date: string }) =>
  parseISO(b.date).getTime() - parseISO(a.date).getTime();
const byStartAsc = (a: Engagement, b: Engagement) =>
  parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();

export function getProject(data: PortfolioData, id: string): Project | undefined {
  return data.projects.find((p) => p.id === id);
}

// --------------------------- Project aggregates ----------------------------

export function projectsByStage(projects: Project[]): { stage: Stage; count: number }[] {
  return STAGES.map((stage) => ({ stage, count: projects.filter((p) => p.stage === stage).length }));
}

export function projectsByStatus(projects: Project[]): { status: Status; count: number }[] {
  return STATUSES.map((status) => ({ status, count: projects.filter((p) => p.status === status).length }));
}

export function atRiskProjects(projects: Project[]): Project[] {
  const severity: Partial<Record<Status, number>> = { "At Risk": 0, "Off Track": 1, "On Hold": 2 };
  return projects
    .filter((p) => p.status === "At Risk" || p.status === "Off Track" || p.status === "On Hold")
    .sort((a, b) => (severity[a.status] ?? 9) - (severity[b.status] ?? 9));
}

export function recentlyUpdated(projects: Project[], limit = 5): Project[] {
  return [...projects]
    .sort((a, b) => parseISO(b.lastUpdated).getTime() - parseISO(a.lastUpdated).getTime())
    .slice(0, limit);
}

/** Initiatives needing attention: at-risk status, or any On-Hold engagement. */
export function initiativesRequiringAttention(
  projects: Project[],
  engagements: Engagement[]
): Project[] {
  const onHold = new Set(engagements.filter((e) => e.status === "On Hold").map((e) => e.initiativeId));
  const flagged = projects.filter(
    (p) => p.status === "At Risk" || p.status === "Off Track" || onHold.has(p.id)
  );
  const severity: Partial<Record<Status, number>> = { "At Risk": 0, "Off Track": 1, "On Hold": 2, "On Track": 3, Complete: 4 };
  return flagged.sort((a, b) => (severity[a.status] ?? 9) - (severity[b.status] ?? 9));
}

// ------------------------------- Milestones --------------------------------

export function upcomingMilestones(milestones: Milestone[], limit = 6): Milestone[] {
  const t = today().getTime();
  return milestones
    .filter((m) => m.status !== "Complete" && parseISO(m.date).getTime() >= t)
    .sort(byDateAsc)
    .slice(0, limit);
}

export function nextMilestone(milestones: Milestone[], projectId: string): Milestone | undefined {
  const t = today().getTime();
  const open = milestones
    .filter((m) => m.projectId === projectId && m.status !== "Complete")
    .sort(byDateAsc);
  return open.find((m) => parseISO(m.date).getTime() >= t) ?? open[0];
}

export function milestonesFor(milestones: Milestone[], projectId: string): Milestone[] {
  return milestones.filter((m) => m.projectId === projectId).sort(byDateAsc);
}

export function updatesFor(updates: ProjectUpdate[], projectId: string): ProjectUpdate[] {
  return updates.filter((u) => u.projectId === projectId).sort(byDateDesc);
}

// ------------------------------ Engagements --------------------------------

export function engagementsForInitiative(engagements: Engagement[], initiativeId: string): Engagement[] {
  return engagements.filter((e) => e.initiativeId === initiativeId).sort(byStartAsc);
}

export function engagementsForSite(engagements: Engagement[], site: Site): Engagement[] {
  return engagements.filter((e) => e.site === site).sort(byStartAsc);
}

/** Engagements starting on/after today, soonest first. */
export function upcomingEngagements(engagements: Engagement[], limit = 6): Engagement[] {
  const t = today().getTime();
  return engagements
    .filter((e) => parseISO(e.startDate).getTime() >= t && e.status !== "Complete")
    .sort(byStartAsc)
    .slice(0, limit);
}

/** Sites that appear in the data, in canonical SITES order. */
export function activeSites(engagements: Engagement[]): Site[] {
  const present = new Set(engagements.map((e) => e.site));
  return SITES.filter((s) => present.has(s));
}

/** Work areas that appear in the data, in canonical WORK_AREAS order. */
export function activeWorkAreas(engagements: Engagement[]): WorkArea[] {
  const present = new Set(engagements.map((e) => e.workArea));
  return WORK_AREAS.filter((w) => present.has(w));
}

export function initiativeIdsAtSite(engagements: Engagement[], site: Site): string[] {
  return [...new Set(engagements.filter((e) => e.site === site).map((e) => e.initiativeId))];
}

export function sitesForInitiative(engagements: Engagement[], initiativeId: string): Site[] {
  const present = new Set(
    engagements.filter((e) => e.initiativeId === initiativeId).map((e) => e.site)
  );
  return SITES.filter((s) => present.has(s));
}

export function workAreasForInitiative(engagements: Engagement[], initiativeId: string): WorkArea[] {
  const present = new Set(
    engagements.filter((e) => e.initiativeId === initiativeId).map((e) => e.workArea)
  );
  return WORK_AREAS.filter((w) => present.has(w));
}

/** Furthest-along stage among a set of engagements (for cell colouring). */
export function furthestStage(engagements: Engagement[]): EngagementStage | undefined {
  if (engagements.length === 0) return undefined;
  return [...engagements].sort(
    (a, b) => engagementStageOrder(b.stage) - engagementStageOrder(a.stage)
  )[0].stage;
}

export interface SiteActivity {
  site: Site;
  engagements: number;
  initiatives: number;
}

/** Sites ranked by engagement activity (count of engagements, then initiatives). */
export function sitesByActivity(engagements: Engagement[]): SiteActivity[] {
  return activeSites(engagements)
    .map((site) => {
      const at = engagements.filter((e) => e.site === site);
      return {
        site,
        engagements: at.length,
        initiatives: new Set(at.map((e) => e.initiativeId)).size,
      };
    })
    .sort((a, b) => b.engagements - a.engagements || b.initiatives - a.initiatives);
}

export const cellKey = (workArea: WorkArea, site: Site): string => `${workArea}__${site}`;

/** Group engagements into a Work Area × Site matrix (key = cellKey). */
export function buildMatrix(engagements: Engagement[]): Map<string, Engagement[]> {
  const map = new Map<string, Engagement[]>();
  for (const e of engagements) {
    const k = cellKey(e.workArea, e.site);
    const arr = map.get(k);
    if (arr) arr.push(e);
    else map.set(k, [e]);
  }
  return map;
}

// ------------------------------- Filtering ---------------------------------

export interface EngagementFilters {
  initiativeId: string;
  site: string;
  portfolio: string;
  workArea: string;
  status: string;
  stage: string;
}

export const EMPTY_ENGAGEMENT_FILTERS: EngagementFilters = {
  initiativeId: "",
  site: "",
  portfolio: "",
  workArea: "",
  status: "",
  stage: "",
};

export function applyEngagementFilters(
  engagements: Engagement[],
  f: EngagementFilters
): Engagement[] {
  return engagements.filter(
    (e) =>
      (f.initiativeId ? e.initiativeId === f.initiativeId : true) &&
      (f.site ? e.site === f.site : true) &&
      (f.portfolio ? e.portfolio === f.portfolio : true) &&
      (f.workArea ? e.workArea === f.workArea : true) &&
      (f.status ? e.status === f.status : true) &&
      (f.stage ? e.stage === f.stage : true)
  );
}

export function anyFilterActive(f: EngagementFilters): boolean {
  return Boolean(f.initiativeId || f.site || f.portfolio || f.workArea || f.status || f.stage);
}

// ------------------------------- Utilities ---------------------------------

export function distinctField(projects: Project[], key: keyof Project): string[] {
  return [...new Set(projects.map((p) => String(p[key])))].sort();
}
