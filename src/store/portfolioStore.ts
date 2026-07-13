/**
 * Reactive client-side cache over the repository.
 *
 * Holds one copy of the loaded portfolio and notifies subscribers (see
 * hooks/usePortfolio). Write actions go through the repository, then patch the
 * local cache so the whole app (Home counts, Projects cards, detail page)
 * reflects the change immediately without a full reload.
 */
import type { PortfolioData, Milestone, Engagement, Project } from "../types/models";
import {
  repository,
  type NewProjectUpdate,
  type MilestoneInput,
  type EngagementInput,
  type ProjectEdit,
} from "../services";

export type LoadPhase = "loading" | "ready" | "error";

export interface PortfolioSnapshot {
  phase: LoadPhase;
  data: PortfolioData | null;
  error: string | null;
}

function upsertById<T extends { id: string }>(list: T[], record: T): T[] {
  return list.some((x) => x.id === record.id)
    ? list.map((x) => (x.id === record.id ? record : x))
    : [...list, record];
}

class PortfolioStore {
  private snapshot: PortfolioSnapshot = { phase: "loading", data: null, error: null };
  private listeners = new Set<() => void>();
  private loadStarted = false;

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = (): PortfolioSnapshot => this.snapshot;

  private emit(next: PortfolioSnapshot): void {
    this.snapshot = next;
    this.listeners.forEach((l) => l());
  }

  /** Kick off the initial load exactly once (safe under StrictMode double-mount). */
  ensureLoaded(): void {
    if (this.loadStarted) return;
    this.loadStarted = true;
    void this.reload();
  }

  async reload(): Promise<void> {
    this.emit({ phase: "loading", data: this.snapshot.data, error: null });
    try {
      const data = await repository.getPortfolio();
      this.emit({ phase: "ready", data, error: null });
    } catch (err) {
      this.emit({
        phase: "error",
        data: null,
        error: err instanceof Error ? err.message : "Failed to load portfolio data.",
      });
    }
  }

  private requireData(): PortfolioData {
    if (!this.snapshot.data) throw new Error("Portfolio data is not loaded yet.");
    return this.snapshot.data;
  }

  async submitProjectUpdate(input: NewProjectUpdate) {
    const { update, project } = await repository.addProjectUpdate(input);
    const data = this.requireData();
    this.emit({
      phase: "ready",
      error: null,
      data: {
        ...data,
        updates: [update, ...data.updates],
        projects: data.projects.map((p) => (p.id === project.id ? project : p)),
      },
    });
    return { update, project };
  }

  async saveMilestone(input: MilestoneInput): Promise<Milestone> {
    const record = await repository.upsertMilestone(input);
    const data = this.requireData();
    this.emit({
      phase: "ready",
      error: null,
      data: { ...data, milestones: upsertById(data.milestones, record) },
    });
    return record;
  }

  async updateProject(input: ProjectEdit): Promise<Project> {
    const project = await repository.updateProject(input);
    const data = this.requireData();
    this.emit({
      phase: "ready",
      error: null,
      data: { ...data, projects: data.projects.map((p) => (p.id === project.id ? project : p)) },
    });
    return project;
  }

  async saveEngagement(input: EngagementInput): Promise<Engagement> {
    const record = await repository.upsertEngagement(input);
    const data = this.requireData();
    this.emit({
      phase: "ready",
      error: null,
      data: { ...data, engagements: upsertById(data.engagements, record) },
    });
    return record;
  }
}

/** App-wide singleton. */
export const portfolioStore = new PortfolioStore();
