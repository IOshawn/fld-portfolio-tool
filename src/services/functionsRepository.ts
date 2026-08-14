/**
 * Azure Functions implementation of PortfolioRepository.
 *
 * An alternative to RestRepository (Data API Builder) for deployments that
 * prefer an explicit Azure Functions backend over auto-generated DAB endpoints.
 * The Functions host exposes the same data model at `/api/...` routes.
 *
 * Activate by swapping the export in services/index.ts:
 *   export const repository: PortfolioRepository = new FunctionsRepository();
 *
 * The matching Azure Functions backend is in api/src/sqlRepository.ts.
 * API routes expected (all relative, no Azure hostname):
 *
 *   GET    /api/portfolio
 *   POST   /api/projects
 *   PATCH  /api/projects/{id}
 *   DELETE /api/projects/{id}
 *   POST   /api/project-updates
 *   POST   /api/milestones
 *   PATCH  /api/milestones/{id}
 *   DELETE /api/milestones/{id}
 *   POST   /api/engagements
 *   PATCH  /api/engagements/{id}
 *   DELETE /api/engagements/{id}
 *   POST   /api/travel-entries
 *   PATCH  /api/travel-entries/{id}
 *   DELETE /api/travel-entries/{id}
 */
import type {
  PortfolioData,
  Project,
  ProjectStage,
  Milestone,
  Engagement,
  ProjectUpdate,
  TravelEntry,
  PersonRef,
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

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const BASE = "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status}${text ? `: ${text}` : ""}`);
  }
  // 204 No Content (DELETE) and other body-less responses must not be JSON-parsed.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

const apiGet  = <T>(path: string) => apiFetch<T>(path);
const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
const apiPatch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
const apiDelete = (path: string) =>
  apiFetch<void>(path, { method: "DELETE" }).then(() => undefined);

// ---------------------------------------------------------------------------
// Field mappers  (raw JSON → domain types)
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;

const S = (v: unknown): string => (v == null ? "" : String(v));
const dateOnly = (v: unknown): string => (v ? S(v).slice(0, 10) : "");
const splitSemi = (v: unknown): string[] =>
  S(v).split(";").map((s) => s.trim()).filter(Boolean);

function parseJsonField<T>(v: unknown, fallback: T): T {
  if (v == null || S(v).trim() === "") return fallback;
  try { return JSON.parse(S(v)) as T; } catch { return fallback; }
}

/**
 * Build a PersonRef from a raw row.
 * Reads the name column plus the optional *Email and *CorpId columns.
 * Falls back to name-only for rows that pre-date the schema migration.
 */
function mapPersonRef(nameVal: unknown, emailVal: unknown, corpIdVal: unknown): PersonRef {
  return {
    name: S(nameVal),
    email: S(emailVal),
    corpId: S(corpIdVal),
  };
}

function mapProject(r: Raw): Project {
  return {
    id: S(r.id),
    title: S(r.title),
    abbrev: S(r.abbrev),
    portfolio: S(r.portfolio),
    productArea: S(r.productArea),
    owner: mapPersonRef(r.owner, r.ownerEmail, r.ownerCorpId),
    sponsor: mapPersonRef(r.sponsor, r.sponsorEmail, r.sponsorCorpId),
    stage: normalizeProjectStage(S(r.stage)),
    status: normalizeProjectStatus(S(r.status)),
    startDate: dateOnly(r.startDate),
    endDate: dateOnly(r.endDate),
    summary: S(r.summary),
    outcomeStatement: S(r.outcomeStatement),
    businessValue: S(r.businessValue),
    dependencies: splitSemi(r.dependencies),
    fundingSource: S(r.fundingSource),
    nOrPCode: S(r.nOrPCode),
    sites: splitSemi(r.sites) as Project["sites"],
    projectStages: parseJsonField<ProjectStage[]>(r.projectStages, []).map(normalizeProjectStageRecord),
    lastUpdate: S(r.lastUpdate),
    lastUpdated: dateOnly(r.lastUpdated),
  };
}

function mapMilestone(r: Raw): Milestone {
  return {
    id: S(r.id),
    projectId: S(r.projectId),
    name: S(r.name),
    date: dateOnly(r.date),
    status: S(r.status) as Milestone["status"],
    notes: S(r.notes),
  };
}

function mapEngagement(r: Raw): Engagement {
  return {
    id: S(r.id),
    initiativeId: S(r.initiativeId),
    portfolio: S(r.portfolio),
    site: S(r.site) as Engagement["site"],
    workArea: S(r.workArea) as Engagement["workArea"],
    team: S(r.team),
    stage: S(r.stage) as Engagement["stage"],
    status: S(r.status) as Engagement["status"],
    startDate: dateOnly(r.startDate),
    endDate: dateOnly(r.endDate),
    purpose: S(r.purpose),
    notes: S(r.notes),
  };
}

function mapUpdate(r: Raw): ProjectUpdate {
  return {
    id: S(r.id),
    projectId: S(r.projectId),
    date: dateOnly(r.date),
    summary: S(r.summary),
    risks: S(r.risks),
    decisionsRequired: S(r.decisionsRequired),
    submittedBy: mapPersonRef(r.submittedBy, r.submittedByEmail, r.submittedByCorpId),
  };
}

function mapTravelEntry(r: Raw): TravelEntry {
  return {
    id: S(r.id),
    person: mapPersonRef(r.person, r.personEmail, r.personCorpId),
    initiativeId: S(r.initiativeId),
    site: S(r.site) as TravelEntry["site"],
    workArea: S(r.workArea) as TravelEntry["workArea"],
    team: S(r.team),
    departureDate: dateOnly(r.departureDate),
    returnDate: dateOnly(r.returnDate),
    flightNumber: r.flightNumber != null ? S(r.flightNumber) : undefined,
    description: S(r.description),
    status: normalizeTravelStatus(S(r.status)),
    associatedWith: splitSemi(r.associatedWith),
  };
}

function mapQuarterlyMilestone(r: Raw): QuarterlyMilestone {
  return {
    id:                    S(r.id),
    portfolioArea:         S(r.portfolioArea) as PortfolioArea,
    subGroup:              S(r.subGroup) || undefined,
    initiative:            S(r.initiative),
    initiativeDescription: S(r.initiativeDescription) || undefined,
    milestone:             S(r.milestone),
    targetDate:            dateOnly(r.targetDate),
    dateLabel:             S(r.dateLabel) || undefined,
    notes:                 S(r.notes) || undefined,
  };
}

// ---------------------------------------------------------------------------
// FunctionsRepository
// ---------------------------------------------------------------------------

/** Response shape from GET /api/portfolio */
interface PortfolioResponse {
  projects: Raw[];
  milestones: Raw[];
  engagements: Raw[];
  updates: Raw[];
  travelEntries: Raw[];
}

export class FunctionsRepository implements PortfolioRepository {

  // ── Read ──────────────────────────────────────────────────────────────────

  async getPortfolio(): Promise<PortfolioData> {
    const data = await apiGet<PortfolioResponse>("/portfolio");
    return {
      projects:      (data.projects      ?? []).map(mapProject),
      milestones:    (data.milestones    ?? []).map(mapMilestone),
      engagements:   (data.engagements   ?? []).map(mapEngagement),
      updates:       (data.updates       ?? []).map(mapUpdate),
      travelEntries: (data.travelEntries ?? []).map(mapTravelEntry),
    };
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  async createProject(input: ProjectInput): Promise<Project> {
    const raw = await apiPost<Raw>("/projects", {
      title:            input.title,
      abbrev:           input.abbrev,
      portfolio:        input.portfolio,
      productArea:      input.productArea,
      owner:            input.owner.name,
      ownerEmail:       input.owner.email,
      ownerCorpId:      input.owner.corpId,
      sponsor:          input.sponsor.name,
      sponsorEmail:     input.sponsor.email,
      sponsorCorpId:    input.sponsor.corpId,
      stage:            input.stage,
      status:           input.status,
      startDate:        input.startDate,
      endDate:          input.endDate,
      summary:          input.summary,
      outcomeStatement: input.outcomeStatement,
      businessValue:    input.businessValue,
      dependencies:     input.dependencies,
      fundingSource:    input.fundingSource,
      nOrPCode:         input.nOrPCode,
      sites:            input.sites,
      projectStages:    input.projectStages,
    });
    return mapProject(raw);
  }

  async updateProject(input: ProjectEdit): Promise<Project> {
    const raw = await apiPatch<Raw>(`/projects/${encodeURIComponent(input.id)}`, {
      title:            input.title,
      abbrev:           input.abbrev,
      portfolio:        input.portfolio,
      productArea:      input.productArea,
      owner:            input.owner?.name,
      ownerEmail:       input.owner?.email,
      ownerCorpId:      input.owner?.corpId,
      sponsor:          input.sponsor?.name,
      sponsorEmail:     input.sponsor?.email,
      sponsorCorpId:    input.sponsor?.corpId,
      stage:            input.stage,
      status:           input.status,
      startDate:        input.startDate,
      endDate:          input.endDate,
      summary:          input.summary,
      outcomeStatement: input.outcomeStatement,
      businessValue:    input.businessValue,
      dependencies:     input.dependencies,
      fundingSource:    input.fundingSource,
      nOrPCode:         input.nOrPCode,
      sites:            input.sites,
      projectStages:    input.projectStages,
    });
    return mapProject(raw);
  }

  async deleteProject(id: string): Promise<void> {
    await apiDelete(`/projects/${encodeURIComponent(id)}`);
  }

  // ── Project Updates ───────────────────────────────────────────────────────

  async addProjectUpdate(
    input: NewProjectUpdate
  ): Promise<{ update: ProjectUpdate; project: Project }> {
    const raw = await apiPost<{ update: Raw; project: Raw }>("/project-updates", {
      ...input,
      submittedBy:      input.submittedBy.name,
      submittedByEmail: input.submittedBy.email,
      submittedByCorpId: input.submittedBy.corpId,
    });
    return {
      update:  mapUpdate(raw.update),
      project: mapProject(raw.project),
    };
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  async upsertMilestone(input: MilestoneInput): Promise<Milestone> {
    const body = {
      projectId: input.projectId,
      name:      input.name,
      date:      input.date,
      status:    input.status,
      notes:     input.notes,
    };
    const raw = input.id
      ? await apiPatch<Raw>(`/milestones/${encodeURIComponent(input.id)}`, body)
      : await apiPost<Raw>("/milestones", body);
    return mapMilestone(raw);
  }

  async deleteMilestone(id: string): Promise<void> {
    await apiDelete(`/milestones/${encodeURIComponent(id)}`);
  }

  // ── Engagements ───────────────────────────────────────────────────────────

  async upsertEngagement(input: EngagementInput): Promise<Engagement> {
    const body = {
      initiativeId: input.initiativeId,
      site:         input.site,
      workArea:     input.workArea,
      team:         input.team,
      stage:        input.stage,
      status:       input.status,
      startDate:    input.startDate,
      endDate:      input.endDate,
      purpose:      input.purpose,
      notes:        input.notes,
    };
    const raw = input.id
      ? await apiPatch<Raw>(`/engagements/${encodeURIComponent(input.id)}`, body)
      : await apiPost<Raw>("/engagements", body);
    return mapEngagement(raw);
  }

  async deleteEngagement(id: string): Promise<void> {
    await apiDelete(`/engagements/${encodeURIComponent(id)}`);
  }

  // ── Travel Entries ────────────────────────────────────────────────────────

  async upsertTravelEntry(input: TravelEntryInput): Promise<TravelEntry> {
    const body = {
      person:           input.person.name,
      personEmail:      input.person.email,
      personCorpId:     input.person.corpId,
      initiativeId:     input.initiativeId,
      site:             input.site,
      workArea:         input.workArea,
      team:             input.team,
      departureDate:    input.departureDate,
      returnDate:       input.returnDate,
      flightNumber:     input.flightNumber ?? null,
      description:      input.description,
      status:           input.status,
      associatedWith:   input.associatedWith,
    };
    const raw = input.id
      ? await apiPatch<Raw>(`/travel-entries/${encodeURIComponent(input.id)}`, body)
      : await apiPost<Raw>("/travel-entries", body);
    return mapTravelEntry(raw);
  }

  async deleteTravelEntry(id: string): Promise<void> {
    await apiDelete(`/travel-entries/${encodeURIComponent(id)}`);
  }

  // ── Quarterly Milestones ──────────────────────────────────────────────────

  async getQuarterlyMilestones(): Promise<QuarterlyMilestone[]> {
    return apiGet<QuarterlyMilestone[]>("/quarterly-milestones");
  }

  async upsertQuarterlyMilestone(input: QuarterlyMilestoneInput): Promise<QuarterlyMilestone> {
    const body = {
      portfolioArea:         input.portfolioArea as string,
      subGroup:              input.subGroup ?? "",
      initiative:            input.initiative,
      initiativeDescription: input.initiativeDescription ?? "",
      milestone:             input.milestone,
      targetDate:            input.targetDate,
      dateLabel:             input.dateLabel ?? "",
      notes:                 input.notes ?? "",
    };
    const raw = input.id
      ? await apiPatch<Record<string, unknown>>(`/quarterly-milestones/${encodeURIComponent(input.id)}`, body)
      : await apiPost<Record<string, unknown>>("/quarterly-milestones", body);
    return mapQuarterlyMilestone(raw);
  }

  async deleteQuarterlyMilestone(id: string): Promise<void> {
    await apiDelete(`/quarterly-milestones/${encodeURIComponent(id)}`);
  }
}
