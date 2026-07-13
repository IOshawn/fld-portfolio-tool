/**
 * Phase 3 — SharePoint implementation of PortfolioRepository (PnPjs v3).
 *
 * This file lives in `phase3/` (outside the prototype's compiled `src/`) so the
 * mock prototype keeps building without the @pnp/sp dependency. When you build
 * the SPFx web part, COPY this file to the SPFx project's `src/services/` and
 * wire it in `services/index.ts` — a one-line swap:
 *
 *     // import { MockRepository } from "./mockRepository";
 *     import { SharePointRepository } from "./sharePointRepository";
 *     import { spfi, SPFx } from "@pnp/sp";
 *     // ...inside the SPFx web part, where you have `this.context`:
 *     const sp = spfi().using(SPFx(this.context));
 *     export const repository: PortfolioRepository = new SharePointRepository(sp);
 *
 * Requires (in the SPFx project): npm i @pnp/sp @pnp/queryable @pnp/core, and
 *   import "@pnp/sp/webs"; "@pnp/sp/lists"; "@pnp/sp/items"; "@pnp/sp/fields";
 *
 * The four lists + field internal names are created by
 * sharepoint/Provision-PortfolioHub.ps1 — keep the F.* map below in sync with it.
 *
 * NOTE: authored offline against PnPjs v3 conventions; validate during the first
 * `gulp serve` and adjust the PnPjs import style to match your SPFx version.
 */
import type { SPFI } from "@pnp/sp";
import type {
  PortfolioData,
  Project,
  Milestone,
  Engagement,
  ProjectUpdate,
} from "../types/models";
import type {
  PortfolioRepository,
  NewProjectUpdate,
  MilestoneInput,
  EngagementInput,
  ProjectEdit,
} from "./repository";

/** List titles (display names). */
const LISTS = {
  projects: "Portfolio Projects",
  milestones: "Project Milestones",
  engagements: "Site Engagements",
  updates: "Project Updates",
} as const;

/** Field internal names — MUST match Provision-PortfolioHub.ps1. */
const F = {
  // Portfolio Projects
  initiativeKey: "InitiativeKey",
  portfolio: "Portfolio",
  productArea: "ProductArea",
  owner: "Owner",
  sponsor: "Sponsor",
  stage: "Stage",
  ragStatus: "RAGStatus",
  startDate: "StartDate",
  endDate: "EndDate",
  summary: "Summary",
  outcome: "OutcomeStatement",
  businessValue: "BusinessValue",
  dependencies: "Dependencies",
  funding: "FundingSource",
  projectCode: "ProjectCode",
  abbrev: "Abbrev",
  lastUpdate: "LastUpdate",
  lastUpdated: "LastUpdated",
  // Milestones
  mDate: "MilestoneDate",
  mStatus: "MilestoneStatus",
  mNotes: "MNotes",
  // Engagements
  eSite: "Site",
  eWorkArea: "WorkArea",
  eTeam: "Team",
  eStage: "EngStage",
  eStatus: "EngStatus",
  ePurpose: "Purpose",
  eNotes: "ENotes",
  // Updates
  uDate: "UpdateDate",
  uSummary: "USummary",
  uRisks: "Risks",
  uDecisions: "DecisionsRequired",
  uBy: "SubmittedBy",
} as const;

const dateOnly = (v: unknown): string => (v ? String(v).slice(0, 10) : "");
const splitDeps = (v: unknown): string[] =>
  String(v ?? "").split(";").map((d) => d.trim()).filter(Boolean);

export class SharePointRepository implements PortfolioRepository {
  constructor(private sp: SPFI) {}

  private list(title: string) {
    return this.sp.web.lists.getByTitle(title);
  }

  async getPortfolio(): Promise<PortfolioData> {
    const [projItems, msItems, engItems, updItems] = await Promise.all([
      this.list(LISTS.projects).items.top(5000)(),
      this.list(LISTS.milestones).items.top(5000)(),
      this.list(LISTS.engagements).items.top(5000)(),
      this.list(LISTS.updates).items.top(5000)(),
    ]);

    const projects: Project[] = projItems.map((i: Record<string, unknown>) => ({
      id: String(i[F.initiativeKey] ?? i.Title),
      title: String(i.Title ?? ""),
      abbrev: String(i[F.abbrev] ?? ""),
      portfolio: String(i[F.portfolio] ?? ""),
      productArea: String(i[F.productArea] ?? ""),
      owner: String(i[F.owner] ?? ""),
      sponsor: String(i[F.sponsor] ?? ""),
      stage: String(i[F.stage] ?? "Idea") as Project["stage"],
      status: String(i[F.ragStatus] ?? "Green") as Project["status"],
      startDate: dateOnly(i[F.startDate]),
      endDate: dateOnly(i[F.endDate]),
      summary: String(i[F.summary] ?? ""),
      outcomeStatement: String(i[F.outcome] ?? ""),
      businessValue: String(i[F.businessValue] ?? ""),
      dependencies: splitDeps(i[F.dependencies]),
      fundingSource: String(i[F.funding] ?? ""),
      projectCode: String(i[F.projectCode] ?? ""),
      lastUpdate: String(i[F.lastUpdate] ?? ""),
      lastUpdated: dateOnly(i[F.lastUpdated]),
    }));

    const milestones: Milestone[] = msItems.map((i: Record<string, unknown>) => ({
      id: "m-" + i.Id,
      projectId: String(i[F.initiativeKey] ?? ""),
      name: String(i.Title ?? ""),
      date: dateOnly(i[F.mDate]),
      status: String(i[F.mStatus] ?? "Planned") as Milestone["status"],
      notes: String(i[F.mNotes] ?? ""),
    }));

    const engagements: Engagement[] = engItems.map((i: Record<string, unknown>) => ({
      id: "g-" + i.Id,
      initiativeId: String(i[F.initiativeKey] ?? ""),
      portfolio: String(i[F.portfolio] ?? ""),
      site: String(i[F.eSite] ?? "") as Engagement["site"],
      workArea: String(i[F.eWorkArea] ?? "") as Engagement["workArea"],
      team: String(i[F.eTeam] ?? ""),
      stage: String(i[F.eStage] ?? "Discovery") as Engagement["stage"],
      status: String(i[F.eStatus] ?? "Planned") as Engagement["status"],
      startDate: dateOnly(i[F.startDate]),
      endDate: dateOnly(i[F.endDate]),
      purpose: String(i[F.ePurpose] ?? ""),
      notes: String(i[F.eNotes] ?? ""),
    }));

    const updates: ProjectUpdate[] = updItems.map((i: Record<string, unknown>) => ({
      id: "u-" + i.Id,
      projectId: String(i[F.initiativeKey] ?? ""),
      date: dateOnly(i[F.uDate]),
      summary: String(i[F.uSummary] ?? ""),
      risks: String(i[F.uRisks] ?? ""),
      decisionsRequired: String(i[F.uDecisions] ?? ""),
      submittedBy: String(i[F.uBy] ?? ""),
    }));

    return { projects, milestones, engagements, updates };
  }

  /** Resolve a project's SharePoint list item Id from its InitiativeKey (slug). */
  private async projectItemId(key: string): Promise<number> {
    const rows = await this.list(LISTS.projects).items
      .filter(`${F.initiativeKey} eq '${key.replace(/'/g, "''")}'`)
      .select("Id")
      .top(1)();
    if (!rows.length) throw new Error(`Initiative not found in SharePoint: ${key}`);
    return rows[0].Id as number;
  }

  async addProjectUpdate(input: NewProjectUpdate): Promise<{ update: ProjectUpdate; project: Project }> {
    const add = await this.list(LISTS.updates).items.add({
      Title: `${input.projectId} ${input.date}`,
      [F.initiativeKey]: input.projectId,
      [F.uDate]: input.date,
      [F.uSummary]: input.summary,
      [F.uRisks]: input.risks,
      [F.uDecisions]: input.decisionsRequired,
      [F.uBy]: input.submittedBy,
    });

    const itemId = await this.projectItemId(input.projectId);
    const patch: Record<string, unknown> = {
      [F.lastUpdate]: input.summary,
      [F.lastUpdated]: input.date,
    };
    if (input.newStatus) patch[F.ragStatus] = input.newStatus;
    if (input.newStage) patch[F.stage] = input.newStage;
    await this.list(LISTS.projects).items.getById(itemId).update(patch);

    const project = (await this.getPortfolio()).projects.find((p) => p.id === input.projectId)!;
    const update: ProjectUpdate = {
      id: "u-" + (add as { data?: { Id?: number } }).data?.Id,
      projectId: input.projectId,
      date: input.date,
      summary: input.summary,
      risks: input.risks,
      decisionsRequired: input.decisionsRequired,
      submittedBy: input.submittedBy,
    };
    return { update, project };
  }

  async upsertMilestone(input: MilestoneInput): Promise<Milestone> {
    const values: Record<string, unknown> = {
      Title: input.name,
      [F.initiativeKey]: input.projectId,
      [F.mDate]: input.date,
      [F.mStatus]: input.status,
      [F.mNotes]: input.notes,
    };
    let id = input.id;
    if (input.id && input.id.startsWith("m-")) {
      await this.list(LISTS.milestones).items.getById(Number(input.id.slice(2))).update(values);
    } else {
      const add = await this.list(LISTS.milestones).items.add(values);
      id = "m-" + (add as { data?: { Id?: number } }).data?.Id;
    }
    return { id: id!, projectId: input.projectId, name: input.name, date: input.date, status: input.status, notes: input.notes };
  }

  async upsertEngagement(input: EngagementInput): Promise<Engagement> {
    const portfolio =
      (await this.getPortfolio()).projects.find((p) => p.id === input.initiativeId)?.portfolio ?? "Unassigned";
    const values: Record<string, unknown> = {
      Title: `${input.site} - ${input.workArea}`,
      [F.initiativeKey]: input.initiativeId,
      [F.portfolio]: portfolio,
      [F.eSite]: input.site,
      [F.eWorkArea]: input.workArea,
      [F.eTeam]: input.team,
      [F.eStage]: input.stage,
      [F.eStatus]: input.status,
      [F.startDate]: input.startDate,
      [F.endDate]: input.endDate,
      [F.ePurpose]: input.purpose,
      [F.eNotes]: input.notes,
    };
    let id = input.id;
    if (input.id && input.id.startsWith("g-")) {
      await this.list(LISTS.engagements).items.getById(Number(input.id.slice(2))).update(values);
    } else {
      const add = await this.list(LISTS.engagements).items.add(values);
      id = "g-" + (add as { data?: { Id?: number } }).data?.Id;
    }
    return {
      id: id!, initiativeId: input.initiativeId, portfolio, site: input.site, workArea: input.workArea,
      team: input.team, stage: input.stage, status: input.status, startDate: input.startDate,
      endDate: input.endDate, purpose: input.purpose, notes: input.notes,
    };
  }

  async updateProject(input: ProjectEdit): Promise<Project> {
    const itemId = await this.projectItemId(input.id);
    const map: Record<string, string> = {
      title: "Title", abbrev: F.abbrev, portfolio: F.portfolio, productArea: F.productArea,
      owner: F.owner, sponsor: F.sponsor, stage: F.stage, status: F.ragStatus,
      startDate: F.startDate, endDate: F.endDate, summary: F.summary,
      outcomeStatement: F.outcome, businessValue: F.businessValue, fundingSource: F.funding,
      projectCode: F.projectCode,
    };
    const patch: Record<string, unknown> = {};
    (Object.keys(input) as (keyof ProjectEdit)[]).forEach((k) => {
      if (k === "id" || input[k] === undefined) return;
      if (k === "dependencies") patch[F.dependencies] = (input.dependencies ?? []).join("; ");
      else if (map[k]) patch[map[k]] = input[k];
    });
    await this.list(LISTS.projects).items.getById(itemId).update(patch);
    return (await this.getPortfolio()).projects.find((p) => p.id === input.id)!;
  }
}
