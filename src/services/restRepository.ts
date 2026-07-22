/**
 * REST implementation of PortfolioRepository for the Azure Static Web Apps host.
 *
 * Talks to the auto-generated Data API Builder endpoints exposed by SWA
 * "Database Connections" at /data-api/rest/{Entity}. No backend code required —
 * the API is generated from swa-db-connections/staticwebapp.database.config.json
 * over the Azure SQL tables created by azure/sql/schema.sql.
 *
 * SQL columns are named to match the model fields 1:1, so mapping is minimal
 * (only `dependencies` (';'-joined) and date trimming need handling).
 *
 * Enabled at build time when VITE_USE_API=true (see services/index.ts); local
 * `npm run dev` stays on MockRepository.
 */
import type {
  PortfolioData,
  Project,
  Milestone,
  Engagement,
  ProjectUpdate,
  TravelEntry,
} from "../types/models";
import type {
  PortfolioRepository,
  NewProjectUpdate,
  MilestoneInput,
  EngagementInput,
  ProjectEdit,
  TravelEntryInput,
} from "./repository";

const BASE = "/data-api/rest";
const JSON_HEADERS = {
  Accept: "application/json",
  "X-MS-API-ROLE": "authenticated",
};

const dateOnly = (v: unknown): string => (v ? String(v).slice(0, 10) : "");
const splitDeps = (v: unknown): string[] =>
  String(v ?? "").split(";").map((d) => d.trim()).filter(Boolean);

async function list<T>(entity: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${entity}`, { headers: JSON_HEADERS });
  if (!res.ok) throw new Error(`GET ${entity} failed: ${res.status}`);
  const json = (await res.json()) as { value: T[] };
  return json.value ?? [];
}

async function create<T>(entity: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/${entity}`, {
    method: "POST",
    headers: { ...JSON_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${entity} failed: ${res.status}`);
  const json = (await res.json()) as { value: T[] };
  return json.value[0];
}

async function patch(entity: string, id: string | number, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}/${entity}/id/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { ...JSON_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${entity}/${id} failed: ${res.status}`);
}

type Row = Record<string, unknown>;
const S = (v: unknown): string => (v == null ? "" : String(v));

export class RestRepository implements PortfolioRepository {
  async getPortfolio(): Promise<PortfolioData> {
    const [pr, ms, en, up] = await Promise.all([
      list<Row>("Projects"),
      list<Row>("Milestones"),
      list<Row>("Engagements"),
      list<Row>("Updates"),
    ]);

    const projects: Project[] = pr.map((i) => ({
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
    }));

    const milestones: Milestone[] = ms.map((i) => ({
      id: S(i.id),
      projectId: S(i.projectId),
      name: S(i.name),
      date: dateOnly(i.date),
      status: S(i.status) as Milestone["status"],
      notes: S(i.notes),
    }));

    const engagements: Engagement[] = en.map((i) => ({
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
    }));

    const updates: ProjectUpdate[] = up.map((i) => ({
      id: S(i.id),
      projectId: S(i.projectId),
      date: dateOnly(i.date),
      summary: S(i.summary),
      risks: S(i.risks),
      decisionsRequired: S(i.decisionsRequired),
      submittedBy: S(i.submittedBy),
    }));

    return { projects, milestones, engagements, updates, travelEntries: [] };
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
    const projectPatch: Record<string, unknown> = { lastUpdate: input.summary, lastUpdated: input.date };
    if (input.newStatus) projectPatch.status = input.newStatus;
    if (input.newStage) projectPatch.stage = input.newStage;
    await patch("Projects", input.projectId, projectPatch);

    const project = (await this.getPortfolio()).projects.find((p) => p.id === input.projectId)!;
    const update: ProjectUpdate = {
      id: S(row.id),
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
    const body = {
      projectId: input.projectId,
      name: input.name,
      date: input.date,
      status: input.status,
      notes: input.notes,
    };
    let id = input.id;
    if (input.id) await patch("Milestones", input.id, body);
    else id = S((await create<Row>("Milestones", body)).id);
    return { id: S(id), projectId: input.projectId, name: input.name, date: input.date, status: input.status, notes: input.notes };
  }

  async upsertEngagement(input: EngagementInput): Promise<Engagement> {
    const portfolio =
      (await this.getPortfolio()).projects.find((p) => p.id === input.initiativeId)?.portfolio ?? "Unassigned";
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
    let id = input.id;
    if (input.id) await patch("Engagements", input.id, body);
    else id = S((await create<Row>("Engagements", body)).id);
    return {
      id: S(id), initiativeId: input.initiativeId, portfolio, site: input.site, workArea: input.workArea,
      team: input.team, stage: input.stage, status: input.status, startDate: input.startDate,
      endDate: input.endDate, purpose: input.purpose, notes: input.notes,
    };
  }

  async updateProject(input: ProjectEdit): Promise<Project> {
    const body: Record<string, unknown> = {};
    (Object.keys(input) as (keyof ProjectEdit)[]).forEach((k) => {
      if (k === "id" || input[k] === undefined) return;
      if (k === "dependencies") body.dependencies = (input.dependencies ?? []).join("; ");
      else body[k] = input[k];
    });
    await patch("Projects", input.id, body);
    return (await this.getPortfolio()).projects.find((p) => p.id === input.id)!;
  }

  async upsertTravelEntry(_input: TravelEntryInput): Promise<TravelEntry> {
    throw new Error("Travel entries are not supported by the retired REST repository.");
  }

  async deleteTravelEntry(_id: string): Promise<void> {
    throw new Error("Travel entries are not supported by the retired REST repository.");
  }

  async deleteProject(_id: string): Promise<void> {
    throw new Error("Project deletion is not supported by the retired REST repository.");
  }

  async deleteEngagement(_id: string): Promise<void> {
    throw new Error("Engagement deletion is not supported by the retired REST repository.");
  }

  async deleteMilestone(_id: string): Promise<void> {
    throw new Error("Milestone deletion is not supported by the retired REST repository.");
  }
}
