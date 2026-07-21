/**
 * REST implementation for the Azure Functions API.
 *
 * The Function App exposes `/api/{Entity}` endpoints backed by Azure SQL.
 * Enable this repository with `VITE_API_MODE=functions` after the Function App
 * is deployed and linked to the Static Web App.
 */
import type {
  Engagement,
  Milestone,
  PortfolioData,
  Project,
  ProjectUpdate,
} from "../types/models";
import type {
  EngagementInput,
  MilestoneInput,
  NewProjectUpdate,
  PortfolioRepository,
  ProjectEdit,
} from "./repository";

const BASE = "/api";

const dateOnly = (v: unknown): string => (v ? String(v).slice(0, 10) : "");
const splitDeps = (v: unknown): string[] =>
  String(v ?? "").split(";").map((d) => d.trim()).filter(Boolean);
const S = (v: unknown): string => (v == null ? "" : String(v));
type Row = Record<string, unknown>;

async function list<T>(entity: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${entity}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${entity} failed: ${res.status}`);
  return (await res.json()) as T[];
}

async function create<T>(entity: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/${entity}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${entity} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function patch<T>(
  entity: string,
  id: string | number,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${BASE}/${entity}/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${entity}/${id} failed: ${res.status}`);
  return (await res.json()) as T;
}

function projectFromRow(i: Row): Project {
  return {
    id: S(i.id),
    title: S(i.title),
    abbrev: S(i.abbrev),
    portfolio: S(i.portfolio),
    productArea: S(i.productArea),
    owner: S(i.owner),
    sponsor: S(i.sponsor),
    stage: S(i.stage) as Project["stage"],
    status: S(i.status) as Project["status"],
    startDate: dateOnly(i.startDate),
    endDate: dateOnly(i.endDate),
    summary: S(i.summary),
    outcomeStatement: S(i.outcomeStatement),
    businessValue: S(i.businessValue),
    dependencies: splitDeps(i.dependencies),
    fundingSource: S(i.fundingSource),
    projectCode: S(i.projectCode),
    lastUpdate: S(i.lastUpdate),
    lastUpdated: dateOnly(i.lastUpdated),
  };
}

function milestoneFromRow(i: Row): Milestone {
  return {
    id: S(i.id),
    projectId: S(i.projectId),
    name: S(i.name),
    date: dateOnly(i.date),
    status: S(i.status) as Milestone["status"],
    notes: S(i.notes),
  };
}

function engagementFromRow(i: Row): Engagement {
  return {
    id: S(i.id),
    initiativeId: S(i.initiativeId),
    portfolio: S(i.portfolio),
    site: S(i.site) as Engagement["site"],
    workArea: S(i.workArea) as Engagement["workArea"],
    team: S(i.team),
    stage: S(i.stage) as Engagement["stage"],
    status: S(i.status) as Engagement["status"],
    startDate: dateOnly(i.startDate),
    endDate: dateOnly(i.endDate),
    purpose: S(i.purpose),
    notes: S(i.notes),
  };
}

function updateFromRow(i: Row): ProjectUpdate {
  return {
    id: S(i.id),
    projectId: S(i.projectId),
    date: dateOnly(i.date),
    summary: S(i.summary),
    risks: S(i.risks),
    decisionsRequired: S(i.decisionsRequired),
    submittedBy: S(i.submittedBy),
  };
}

export class FunctionsRepository implements PortfolioRepository {
  async getPortfolio(): Promise<PortfolioData> {
    const [pr, ms, en, up] = await Promise.all([
      list<Row>("Projects"),
      list<Row>("Milestones"),
      list<Row>("Engagements"),
      list<Row>("Updates"),
    ]);

    return {
      projects: pr.map(projectFromRow),
      milestones: ms.map(milestoneFromRow),
      engagements: en.map(engagementFromRow),
      updates: up.map(updateFromRow),
    };
  }

  async addProjectUpdate(input: NewProjectUpdate): Promise<{ update: ProjectUpdate; project: Project }> {
    const row = await create<Row>("Updates", {
      projectId: input.projectId,
      date: input.date,
      summary: input.summary,
      risks: input.risks,
      decisionsRequired: input.decisionsRequired,
      submittedBy: input.submittedBy,
    });

    const projectPatch: Record<string, unknown> = {
      lastUpdate: input.summary,
      lastUpdated: input.date,
    };
    if (input.newStatus) projectPatch.status = input.newStatus;
    if (input.newStage) projectPatch.stage = input.newStage;

    const projectRow = await patch<Row>("Projects", input.projectId, projectPatch);
    return { update: updateFromRow(row), project: projectFromRow(projectRow) };
  }

  async upsertMilestone(input: MilestoneInput): Promise<Milestone> {
    const body = {
      projectId: input.projectId,
      name: input.name,
      date: input.date,
      status: input.status,
      notes: input.notes,
    };
    const row = input.id
      ? await patch<Row>("Milestones", input.id, body)
      : await create<Row>("Milestones", body);
    return milestoneFromRow(row);
  }

  async upsertEngagement(input: EngagementInput): Promise<Engagement> {
    const portfolio =
      (await this.getPortfolio()).projects.find((p) => p.id === input.initiativeId)?.portfolio ??
      "Unassigned";
    const body = {
      initiativeId: input.initiativeId,
      portfolio,
      site: input.site,
      workArea: input.workArea,
      team: input.team,
      stage: input.stage,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      purpose: input.purpose,
      notes: input.notes,
    };
    const row = input.id
      ? await patch<Row>("Engagements", input.id, body)
      : await create<Row>("Engagements", body);
    return engagementFromRow(row);
  }

  async updateProject(input: ProjectEdit): Promise<Project> {
    const body: Record<string, unknown> = {};
    (Object.keys(input) as (keyof ProjectEdit)[]).forEach((k) => {
      if (k === "id" || input[k] === undefined) return;
      if (k === "dependencies") body.dependencies = (input.dependencies ?? []).join("; ");
      else body[k] = input[k];
    });
    return projectFromRow(await patch<Row>("Projects", input.id, body));
  }
}
