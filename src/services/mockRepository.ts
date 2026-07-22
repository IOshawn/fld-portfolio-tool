/**
 * In-memory implementation of PortfolioRepository, seeded from the JSON fixtures.
 * Mutations persist for the life of the browser session only (no backend) and
 * are deep-cloned from the seed so reloading the module restores fixtures.
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

import projectsSeed from "../data/projects.json";
import milestonesSeed from "../data/milestones.json";
import engagementsSeed from "../data/engagements.json";
import updatesSeed from "../data/updates.json";
import travelSeed from "../data/travel.json";

/** Simulated network latency so loading/saving states are exercised in the UI. */
const LATENCY_MS = 280;
const delay = <T>(value: T, ms = LATENCY_MS): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let counter = 1000;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

export class MockRepository implements PortfolioRepository {
  private projects: Project[] = clone(projectsSeed) as Project[];
  private milestones: Milestone[] = clone(milestonesSeed) as Milestone[];
  private engagements: Engagement[] = clone(engagementsSeed) as Engagement[];
  private updates: ProjectUpdate[] = clone(updatesSeed) as ProjectUpdate[];
  private travelEntries: TravelEntry[] = clone(travelSeed) as TravelEntry[];

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
    return delay(clone(record));
  }

  deleteTravelEntry(id: string): Promise<void> {
    this.travelEntries = this.travelEntries.filter((e) => e.id !== id);
    return delay(undefined as void);
  }

  deleteProject(id: string): Promise<void> {
    this.projects = this.projects.filter((p) => p.id !== id);
    return delay(undefined as void);
  }

  deleteEngagement(id: string): Promise<void> {
    this.engagements = this.engagements.filter((e) => e.id !== id);
    return delay(undefined as void);
  }

  deleteMilestone(id: string): Promise<void> {
    this.milestones = this.milestones.filter((m) => m.id !== id);
    return delay(undefined as void);
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
    return delay(clone(updated));
  }
}
