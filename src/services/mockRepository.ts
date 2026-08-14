/**
 * In-memory implementation of PortfolioRepository, seeded from the JSON fixtures.
 *
 * PERSISTENCE STRATEGY (MockRepository only — do NOT apply to FunctionsRepository):
 * Projects, milestones, engagements, and travelEntries are all persisted to
 * localStorage so that edits made in the admin bulk-edit console (and elsewhere)
 * survive page refreshes during a Replit preview session.
 * On initialisation the stored list (if any) fully replaces the JSON seed — there is
 * no merge. Updates (project status history) remain in-memory only.
 *
 * FunctionsRepository does NOT use localStorage — it writes directly to Azure SQL via
 * the Azure Functions API and therefore already has durable persistence.
 */
import type {
  PortfolioData,
  Project,
  Milestone,
  Engagement,
  ProjectUpdate,
  TravelEntry,
  PersonRef,
} from "../types/models";
import { normalizeTravelStatus, normalizeProjectStage, normalizeProjectStageRecord } from "../types/models";
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
import type { QuarterlyMilestone } from "../types/quarterly";

import projectsSeed from "../data/projects.json";
import milestonesSeed from "../data/milestones.json";
import engagementsSeed from "../data/engagements.json";
import updatesSeed from "../data/updates.json";
import travelSeed from "../data/travel.json";
import peopleSeed from "../data/people.json";
import quarterlyMilestonesSeed from "../data/quarterlyMilestones.json";

/** Simulated network latency so loading/saving states are exercised in the UI. */
const LATENCY_MS = 280;
const delay = <T>(value: T, ms = LATENCY_MS): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let counter = 1000;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

// ---------------------------------------------------------------------------
// Seed data normalisation
// ---------------------------------------------------------------------------

/** Look up a full PersonRef from the local directory, falling back to name-only. */
const PEOPLE_MAP = new Map<string, PersonRef>(
  (peopleSeed as Array<{ name: string; email: string; corpId: string }>).map(
    (p) => [p.name, { name: p.name, email: p.email, corpId: p.corpId }]
  )
);

function normalizePerson(v: unknown): PersonRef {
  if (v != null && typeof v === "object" && "name" in v) return v as PersonRef;
  const name = typeof v === "string" ? v.trim() : "";
  return PEOPLE_MAP.get(name) ?? { name, email: "", corpId: "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProject(raw: any): Project {
  return {
    ...raw,
    owner: normalizePerson(raw.owner),
    sponsor: normalizePerson(raw.sponsor),
    // Older localStorage snapshots may still carry the legacy 8-value stage
    // vocabulary (Idea … Complete); map it onto the current 4-stage ladder.
    stage: normalizeProjectStage(String(raw.stage ?? "")),
    projectStages: Array.isArray(raw.projectStages)
      ? raw.projectStages.map(normalizeProjectStageRecord)
      : [],
  } as Project;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUpdate(raw: any): ProjectUpdate {
  return {
    ...raw,
    submittedBy: normalizePerson(raw.submittedBy),
  } as ProjectUpdate;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTravelEntry(raw: any): TravelEntry {
  return {
    ...raw,
    person: normalizePerson(raw.person),
    status: normalizeTravelStatus(raw.status ?? ""),
  } as TravelEntry;
}

// ---------------------------------------------------------------------------
// localStorage helpers (MockRepository only)
// ---------------------------------------------------------------------------

const LS_TRAVEL_KEY                = "mock_travelEntries";
const LS_PROJECTS_KEY              = "mock_projects";
const LS_MILESTONES_KEY            = "mock_milestones";
const LS_ENGAGEMENTS_KEY           = "mock_engagements";
const LS_QUARTERLY_MILESTONES_KEY  = "mock_quarterlyMilestones";

function loadFromStorage<T>(key: string, normalize: (v: unknown) => T): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map(normalize);
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage unavailable — silently ignore.
  }
}

// Convenience wrappers keep call sites readable.
const loadTravelFromStorage    = () => loadFromStorage(LS_TRAVEL_KEY,      normalizeTravelEntry);
const saveTravelToStorage      = (v: TravelEntry[])  => saveToStorage(LS_TRAVEL_KEY,      v);
const loadProjectsFromStorage  = () => loadFromStorage(LS_PROJECTS_KEY,    normalizeProject);
const saveProjectsToStorage    = (v: Project[])      => saveToStorage(LS_PROJECTS_KEY,    v);
const loadMilestonesFromStorage = () => loadFromStorage(LS_MILESTONES_KEY, (x) => x as Milestone);
const saveMilestonesToStorage   = (v: Milestone[])   => saveToStorage(LS_MILESTONES_KEY,  v);
const loadEngagementsFromStorage = () => loadFromStorage(LS_ENGAGEMENTS_KEY, (x) => x as Engagement);
const saveEngagementsToStorage   = (v: Engagement[]) => saveToStorage(LS_ENGAGEMENTS_KEY, v);
const loadQuarterlyFromStorage  = () => loadFromStorage(LS_QUARTERLY_MILESTONES_KEY, (x) => x as QuarterlyMilestone);
const saveQuarterlyToStorage    = (v: QuarterlyMilestone[]) => saveToStorage(LS_QUARTERLY_MILESTONES_KEY, v);

export class MockRepository implements PortfolioRepository {
  private projects: Project[] =
    loadProjectsFromStorage() ?? clone(projectsSeed).map(normalizeProject);
  private milestones: Milestone[] =
    loadMilestonesFromStorage() ?? (clone(milestonesSeed) as Milestone[]);
  private engagements: Engagement[] =
    loadEngagementsFromStorage() ?? (clone(engagementsSeed) as Engagement[]);
  private updates: ProjectUpdate[] = clone(updatesSeed).map(normalizeUpdate);
  // TravelEntries: use localStorage if present, otherwise fall back to the JSON seed.
  private travelEntries: TravelEntry[] =
    loadTravelFromStorage() ?? clone(travelSeed).map(normalizeTravelEntry);
  // QuarterlyMilestones: use localStorage if present, otherwise fall back to the JSON seed.
  private quarterlyMilestones: QuarterlyMilestone[] =
    loadQuarterlyFromStorage() ?? (clone(quarterlyMilestonesSeed) as QuarterlyMilestone[]);

  getPortfolio(): Promise<PortfolioData> {
    return delay({
      projects: clone(this.projects),
      milestones: clone(this.milestones),
      engagements: clone(this.engagements),
      updates: clone(this.updates),
      travelEntries: clone(this.travelEntries),
    });
  }

  async addProjectUpdate(
    input: NewProjectUpdate
  ): Promise<{ update: ProjectUpdate; project: Project }> {
    const update: ProjectUpdate = {
      id: nextId("u"),
      projectId: input.projectId,
      date: input.date,
      summary: input.summary,
      risks: input.risks,
      decisionsRequired: input.decisionsRequired,
      submittedBy: input.submittedBy,
    };
    this.updates = [update, ...this.updates];

    const idx = this.projects.findIndex((p) => p.id === input.projectId);
    if (idx === -1) throw new Error(`Unknown project: ${input.projectId}`);
    const patched: Project = {
      ...this.projects[idx],
      lastUpdate: input.summary,
      lastUpdated: input.date,
      ...(input.newStatus ? { status: input.newStatus } : {}),
      ...(input.newStage ? { stage: input.newStage } : {}),
    };
    this.projects = this.projects.map((p) => (p.id === patched.id ? patched : p));
    saveProjectsToStorage(this.projects);

    return delay({ update: clone(update), project: clone(patched) });
  }

  upsertMilestone(input: MilestoneInput): Promise<Milestone> {
    const record: Milestone = {
      id: input.id ?? nextId("m"),
      projectId: input.projectId,
      name: input.name,
      date: input.date,
      status: input.status,
      notes: input.notes,
    };
    this.milestones = input.id
      ? this.milestones.map((m) => (m.id === input.id ? record : m))
      : [...this.milestones, record];
    saveMilestonesToStorage(this.milestones);
    return delay(clone(record));
  }

  upsertEngagement(input: EngagementInput): Promise<Engagement> {
    const portfolio =
      this.projects.find((p) => p.id === input.initiativeId)?.portfolio ?? "Unassigned";
    const record: Engagement = {
      id: input.id ?? nextId("g"),
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
    this.engagements = input.id
      ? this.engagements.map((e) => (e.id === input.id ? record : e))
      : [...this.engagements, record];
    saveEngagementsToStorage(this.engagements);
    return delay(clone(record));
  }

  upsertTravelEntry(input: TravelEntryInput): Promise<TravelEntry> {
    const record: TravelEntry = {
      id: input.id ?? nextId("t"),
      person: input.person,
      initiativeId: input.initiativeId,
      site: input.site,
      workArea: input.workArea,
      team: input.team,
      departureDate: input.departureDate,
      returnDate: input.returnDate,
      flightNumber: input.flightNumber,
      description: input.description,
      status: input.status,
      associatedWith: input.associatedWith,
    };
    this.travelEntries = input.id
      ? this.travelEntries.map((e) => (e.id === input.id ? record : e))
      : [...this.travelEntries, record];
    saveTravelToStorage(this.travelEntries);
    return delay(clone(record));
  }

  deleteTravelEntry(id: string): Promise<void> {
    this.travelEntries = this.travelEntries.filter((e) => e.id !== id);
    saveTravelToStorage(this.travelEntries);
    return delay(undefined as void);
  }

  deleteProject(id: string): Promise<void> {
    this.projects = this.projects.filter((p) => p.id !== id);
    saveProjectsToStorage(this.projects);
    return delay(undefined as void);
  }

  deleteEngagement(id: string): Promise<void> {
    this.engagements = this.engagements.filter((e) => e.id !== id);
    saveEngagementsToStorage(this.engagements);
    return delay(undefined as void);
  }

  deleteMilestone(id: string): Promise<void> {
    this.milestones = this.milestones.filter((m) => m.id !== id);
    saveMilestonesToStorage(this.milestones);
    return delay(undefined as void);
  }

  // ── Quarterly Milestones ───────────────────────────────────────────────────

  getQuarterlyMilestones(): Promise<QuarterlyMilestone[]> {
    return delay(clone(this.quarterlyMilestones));
  }

  upsertQuarterlyMilestone(input: QuarterlyMilestoneInput): Promise<QuarterlyMilestone> {
    const record: QuarterlyMilestone = {
      id:                    input.id ?? nextId("qm"),
      portfolioArea:         input.portfolioArea,
      subGroup:              input.subGroup,
      initiative:            input.initiative,
      initiativeDescription: input.initiativeDescription,
      milestone:             input.milestone,
      targetDate:            input.targetDate,
      dateLabel:             input.dateLabel,
      notes:                 input.notes,
    };
    this.quarterlyMilestones = input.id
      ? this.quarterlyMilestones.map((m) => (m.id === input.id ? record : m))
      : [...this.quarterlyMilestones, record];
    saveQuarterlyToStorage(this.quarterlyMilestones);
    return delay(clone(record));
  }

  deleteQuarterlyMilestone(id: string): Promise<void> {
    this.quarterlyMilestones = this.quarterlyMilestones.filter((m) => m.id !== id);
    saveQuarterlyToStorage(this.quarterlyMilestones);
    return delay(undefined as void);
  }

  createProject(input: ProjectInput): Promise<Project> {
    const id = nextId("p");
    const project: Project = {
      id,
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
      projectStages: input.projectStages.map((s) => ({
        ...s,
        id: nextId("ps"),
        projectId: id,
      })),
      lastUpdate: "",
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    this.projects = [...this.projects, project];
    saveProjectsToStorage(this.projects);
    return delay(clone(project));
  }

  updateProject(input: ProjectEdit): Promise<Project> {
    const idx = this.projects.findIndex((p) => p.id === input.id);
    if (idx === -1) throw new Error(`Unknown project: ${input.id}`);
    // Merge only the fields that were provided (ignore id + undefined values).
    const patch: Partial<Project> = {};
    (Object.keys(input) as (keyof ProjectEdit)[]).forEach((k) => {
      if (k !== "id" && input[k] !== undefined) {
        (patch as Record<string, unknown>)[k] = input[k];
      }
    });
    const updated: Project = { ...this.projects[idx], ...patch };
    this.projects = this.projects.map((p) => (p.id === updated.id ? updated : p));
    saveProjectsToStorage(this.projects);
    return delay(clone(updated));
  }
}
