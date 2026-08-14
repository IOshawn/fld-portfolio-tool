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
import { normalizeTravelStatus, normalizeProjectStatus, normalizeProjectStage, normalizeProjectStageRecord } from "../types/models";
import type {
  PortfolioRepository,
  NewProjectUpdate,
  MilestoneInput,
  EngagementInput,
  ProjectEdit,
  ProjectInput,
  TravelEntryInput,
  QuarterlyMilestoneInput,
} from "./repository";
import type { QuarterlyMilestone, PortfolioArea } from "../types/quarterly";

const BASE = "/data-api/rest";

const dateOnly = (v: unknown): string => (v ? String(v).slice(0, 10) : "");
const splitDeps = (v: unknown): string[] =>
  String(v ?? "").split(";").map((d) => d.trim()).filter(Boolean);
const parseJsonField = <T>(v: unknown, fallback: T): T => {
  if (v == null || String(v).trim() === "") return fallback;
  try { return JSON.parse(String(v)) as T; } catch { return fallback; }
};

async function list<T>(entity: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${entity}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${entity} failed: ${res.status}`);
  const json = (await res.json()) as { value: T[] };
  return json.value ?? [];
}

async function create<T>(entity: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/${entity}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${entity} failed: ${res.status}`);
  const json = (await res.json()) as { value: T[] };
  return json.value[0];
}

async function patch(entity: string, id: string | number, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}/${entity}/id/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${entity}/${id} failed: ${res.status}`);
}

type Row = Record<string, unknown>;
const S = (v: unknown): string => (v == null ? "" : String(v));

function mapQM(i: Row): QuarterlyMilestone {
  return {
    id:                    S(i.id),
    portfolioArea:         S(i.portfolioArea) as PortfolioArea,
    subGroup:              S(i.subGroup)              || undefined,
    initiative:            S(i.initiative),
    initiativeDescription: S(i.initiativeDescription) || undefined,
    milestone:             S(i.milestone),
    targetDate:            dateOnly(i.targetDate),
    dateLabel:             S(i.dateLabel)             || undefined,
    notes:                 S(i.notes)                 || undefined,
  };
}

export class RestRepository implements PortfolioRepository {
  async getPortfolio(): Promise<PortfolioData> {
    const [pr, ms, en, up, te] = await Promise.all([
      list<Row>("Projects"),
      list<Row>("Milestones"),
      list<Row>("Engagements"),
      list<Row>("Updates"),
      list<Row>("TravelEntries"),
    ]);

    const projects: Project[] = pr.map((i) => ({
      id: S(i.id),
      title: S(i.title),
      abbrev: S(i.abbrev),
      portfolio: S(i.portfolio),
      productArea: S(i.productArea),
      owner: { name: S(i.owner), email: S(i.ownerEmail), corpId: S(i.ownerCorpId) },
      sponsor: { name: S(i.sponsor), email: S(i.sponsorEmail), corpId: S(i.sponsorCorpId) },
      stage: normalizeProjectStage(S(i.stage)),
      status: normalizeProjectStatus(S(i.status)),
      startDate: dateOnly(i.startDate),
      endDate: dateOnly(i.endDate),
      summary: S(i.summary),
      outcomeStatement: S(i.outcomeStatement),
      businessValue: S(i.businessValue),
      dependencies: splitDeps(i.dependencies),
      fundingSource: S(i.fundingSource),
      nOrPCode: S(i.nOrPCode ?? i.projectCode ?? ""),
      sites: splitDeps(i.sites) as Project["sites"],
      projectStages: parseJsonField<Project["projectStages"]>(i.projectStages, []).map(normalizeProjectStageRecord),
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
      submittedBy: { name: S(i.submittedBy), email: S(i.submittedByEmail), corpId: S(i.submittedByCorpId) },
    }));

    const travelEntries: TravelEntry[] = te.map((i) => ({
      id:             S(i.id),   // keep raw identity ID — no prefix in REST mode
      person:         { name: S(i.person), email: S(i.personEmail), corpId: S(i.personCorpId) },
      initiativeId:   S(i.initiativeId),
      site:           S(i.site) as TravelEntry["site"],
      workArea:       S(i.workArea) as TravelEntry["workArea"],
      team:           S(i.team),
      departureDate:  dateOnly(i.departureDate),
      returnDate:     dateOnly(i.returnDate),
      flightNumber:   i.flightNumber != null ? S(i.flightNumber) : undefined,
      description:    S(i.description),
      status:         normalizeTravelStatus(S(i.status)),
      associatedWith: splitDeps(i.associatedWith),
    }));

    return { projects, milestones, engagements, updates, travelEntries };
  }

  async createProject(input: ProjectInput): Promise<Project> {
    // `sites` and `projectStages` are not yet in the SQL schema — omitted from the
    // POST body until the schema migration in Task #42. `nOrPCode` is stored in the
    // existing `projectCode` column until the column is renamed.
    const today = new Date().toISOString().slice(0, 10);
    const row = await create<Row>("Projects", {
      title: input.title,
      abbrev: input.abbrev,
      portfolio: input.portfolio,
      productArea: input.productArea,
      owner:         input.owner.name,
      ownerEmail:    input.owner.email,
      ownerCorpId:   input.owner.corpId,
      sponsor:       input.sponsor.name,
      sponsorEmail:  input.sponsor.email,
      sponsorCorpId: input.sponsor.corpId,
      stage: input.stage,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      summary: input.summary,
      outcomeStatement: input.outcomeStatement,
      businessValue: input.businessValue,
      dependencies: input.dependencies.join(";"),
      fundingSource: input.fundingSource,
      nOrPCode: input.nOrPCode,
      projectCode: input.nOrPCode, // legacy compat column — keep in sync
      sites: input.sites.join(";"),
      projectStages: JSON.stringify(input.projectStages),
      lastUpdate: "",
      lastUpdated: today,
    });
    return {
      id: S(row.id),
      title: input.title,
      abbrev: input.abbrev,
      portfolio: input.portfolio,
      productArea: input.productArea,
      owner: input.owner,
      sponsor: input.sponsor,
      stage: input.stage,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      summary: input.summary,
      outcomeStatement: input.outcomeStatement,
      businessValue: input.businessValue,
      dependencies: input.dependencies,
      fundingSource: input.fundingSource,
      nOrPCode: input.nOrPCode,
      sites: input.sites,
      projectStages: input.projectStages.map((ps, idx) => ({
        ...ps,
        id: `ps-rest-${Date.now()}-${idx}`,
        projectId: S(row.id),
      })),
      lastUpdate: "",
      lastUpdated: today,
    };
  }

  async addProjectUpdate(input: NewProjectUpdate): Promise<{ update: ProjectUpdate; project: Project }> {
    const row = await create<Row>("Updates", {
      projectId:          input.projectId,
      date:               input.date,
      summary:            input.summary,
      risks:              input.risks,
      decisionsRequired:  input.decisionsRequired,
      submittedBy:        input.submittedBy.name,
      submittedByEmail:   input.submittedBy.email,
      submittedByCorpId:  input.submittedBy.corpId,
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

  async upsertTravelEntry(input: TravelEntryInput): Promise<TravelEntry> {
    // IDs in REST mode are raw numeric strings (no "t-" prefix).
    // associatedWith entries are also raw IDs — never add or pass through a prefix.
    const body = {
      person:         input.person.name,
      personEmail:    input.person.email,
      personCorpId:   input.person.corpId,
      initiativeId:   input.initiativeId,
      site:           input.site,
      workArea:       input.workArea,
      team:           input.team,
      departureDate:  input.departureDate,
      returnDate:     input.returnDate,
      flightNumber:   input.flightNumber,
      description:    input.description,
      status:         input.status,
      associatedWith: input.associatedWith.join(";"),
    };
    let id = input.id;
    if (input.id) {
      await patch("TravelEntries", input.id, body);
    } else {
      id = S((await create<Row>("TravelEntries", body)).id);
    }
    return {
      id: S(id),
      person:         input.person,   // full PersonRef — already typed correctly
      initiativeId:   input.initiativeId,
      site:           input.site,
      workArea:       input.workArea,
      team:           input.team,
      departureDate:  input.departureDate,
      returnDate:     input.returnDate,
      flightNumber:   input.flightNumber,
      description:    input.description,
      status:         input.status,
      associatedWith: input.associatedWith,
    };
  }

  async deleteTravelEntry(id: string): Promise<void> {
    // id is a raw numeric string; pass directly to the DAB REST endpoint.
    const res = await fetch(`${BASE}/TravelEntries/id/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE TravelEntries/${id} failed: ${res.status}`);
  }

  async updateProject(input: ProjectEdit): Promise<Project> {
    // Build the PATCH body, mapping model fields to SQL column names.
    const OMIT: Set<keyof ProjectEdit> = new Set(["id"]);
    const body: Record<string, unknown> = {};
    (Object.keys(input) as (keyof ProjectEdit)[]).forEach((k) => {
      if (OMIT.has(k) || input[k] === undefined) return;
      if (k === "dependencies") body.dependencies = (input.dependencies ?? []).join(";");
      else if (k === "sites") body.sites = (input.sites ?? []).join(";");
      else if (k === "projectStages") body.projectStages = JSON.stringify(input.projectStages ?? []);
      else if (k === "nOrPCode") {
        body.nOrPCode = input.nOrPCode;
        body.projectCode = input.nOrPCode; // keep legacy column in sync
      } else if (k === "owner" && input.owner) {
        body.owner         = input.owner.name;
        body.ownerEmail    = input.owner.email;
        body.ownerCorpId   = input.owner.corpId;
      } else if (k === "sponsor" && input.sponsor) {
        body.sponsor        = input.sponsor.name;
        body.sponsorEmail   = input.sponsor.email;
        body.sponsorCorpId  = input.sponsor.corpId;
      } else body[k] = input[k];
    });
    await patch("Projects", input.id, body);
    return (await this.getPortfolio()).projects.find((p) => p.id === input.id)!;
  }

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${BASE}/Projects/id/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE Projects/${id} failed: ${res.status}`);
  }

  async deleteEngagement(id: string): Promise<void> {
    const res = await fetch(`${BASE}/Engagements/id/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE Engagements/${id} failed: ${res.status}`);
  }

  async deleteMilestone(id: string): Promise<void> {
    const res = await fetch(`${BASE}/Milestones/id/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE Milestones/${id} failed: ${res.status}`);
  }

  // ── Quarterly Milestones (DAB path: phub.QuarterlyMilestones entity) ─────────

  async getQuarterlyMilestones(): Promise<QuarterlyMilestone[]> {
    const rows = await list<Row>("QuarterlyMilestones");
    return rows.map(mapQM);
  }

  async upsertQuarterlyMilestone(input: QuarterlyMilestoneInput): Promise<QuarterlyMilestone> {
    const body: Record<string, unknown> = {
      portfolioArea:         input.portfolioArea,
      subGroup:              input.subGroup              ?? null,
      initiative:            input.initiative,
      initiativeDescription: input.initiativeDescription ?? null,
      milestone:             input.milestone,
      targetDate:            input.targetDate            ?? null,
      dateLabel:             input.dateLabel             ?? null,
      notes:                 input.notes                 ?? null,
    };

    if (input.id) {
      // Update existing row via PATCH; DAB returns 204 so we reconstruct from the input.
      await patch("QuarterlyMilestones", input.id, body);
      return {
        id:                    input.id,
        portfolioArea:         input.portfolioArea,
        subGroup:              input.subGroup,
        initiative:            input.initiative,
        initiativeDescription: input.initiativeDescription,
        milestone:             input.milestone,
        targetDate:            input.targetDate            ?? "",
        dateLabel:             input.dateLabel,
        notes:                 input.notes,
      };
    }

    // Create: DAB doesn't auto-generate NVARCHAR PKs, so we generate the ID client-side.
    const slug = [input.portfolioArea, input.initiative, input.milestone]
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    const id = `qm-${slug}-${Date.now().toString(36)}`;

    const created = await create<Row>("QuarterlyMilestones", { ...body, id });
    return mapQM(created);
  }

  async deleteQuarterlyMilestone(id: string): Promise<void> {
    const res = await fetch(`${BASE}/QuarterlyMilestones/id/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE QuarterlyMilestones/${id} failed: ${res.status}`);
  }
}
