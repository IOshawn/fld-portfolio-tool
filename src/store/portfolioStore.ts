/**
 * Reactive client-side cache over the repository.
 *
 * Holds one copy of the loaded portfolio and notifies subscribers (see
 * hooks/usePortfolio). Write actions go through the repository, then patch the
 * local cache so the whole app (Home counts, Projects cards, detail page)
 * reflects the change immediately without a full reload.
 */
import type { PortfolioData, Milestone, Engagement, Project, TravelEntry } from "../types/models";
import {
  repository,
  type NewProjectUpdate,
  type MilestoneInput,
  type EngagementInput,
  type ProjectEdit,
  type ProjectInput,
  type TravelEntryInput,
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

  async createProject(input: ProjectInput): Promise<Project> {
    const project = await repository.createProject(input);
    const data = this.requireData();
    this.emit({
      phase: "ready",
      error: null,
      data: { ...data, projects: [...data.projects, project] },
    });
    return project;
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

  /**
   * Save a travel entry and synchronise bidirectional `associatedWith` links.
   *
   * When a user selects colleagues to travel with:
   *   - Newly linked entries have the current entry's ID added to their `associatedWith`.
   *   - Previously linked entries that were deselected have the current entry's ID removed.
   *
   * All reverse-link updates are fired concurrently after the primary save so the
   * UI stays consistent without requiring a full reload.
   */
  async saveTravelEntry(input: TravelEntryInput): Promise<TravelEntry> {
    const data = this.requireData();

    // 1. Save the primary entry
    const record = await repository.upsertTravelEntry(input);
    const savedId = record.id;
    const newLinks = new Set(input.associatedWith ?? []);

    // 2. Determine which entries previously held a reverse link to this entry
    //    (they either appeared in the old entry's associatedWith, or already reference
    //     this ID in their own associatedWith field).
    const oldEntry = data.travelEntries.find((e) => e.id === savedId);
    const previouslyLinkedIds = new Set<string>([
      ...(oldEntry?.associatedWith ?? []),
      // Also catch any entry that already references this id (data consistency)
      ...data.travelEntries
        .filter((e) => e.id !== savedId && e.associatedWith.includes(savedId))
        .map((e) => e.id),
    ]);

    // 3. Compute delta
    const toAdd    = [...newLinks].filter((id) => !previouslyLinkedIds.has(id));
    const toRemove = [...previouslyLinkedIds].filter((id) => !newLinks.has(id));

    // 4. Build updated copies of all affected entries
    const affectedEntries = new Map<string, TravelEntry>();

    for (const id of toAdd) {
      const e = data.travelEntries.find((x) => x.id === id);
      if (!e) continue;
      if (!e.associatedWith.includes(savedId)) {
        affectedEntries.set(id, { ...e, associatedWith: [...e.associatedWith, savedId] });
      }
    }

    for (const id of toRemove) {
      const e = data.travelEntries.find((x) => x.id === id);
      if (!e) continue;
      const updated = e.associatedWith.filter((x) => x !== savedId);
      affectedEntries.set(id, { ...e, associatedWith: updated });
    }

    // 5. Persist reverse-link updates concurrently (fire-and-forget errors are
    //    swallowed so the UI doesn't break if one entry can't be patched)
    const reverseUpdates = [...affectedEntries.values()].map((e) =>
      repository
        .upsertTravelEntry({
          id: e.id,
          person: e.person,
          initiativeId: e.initiativeId,
          site: e.site,
          workArea: e.workArea,
          team: e.team,
          departureDate: e.departureDate,
          returnDate: e.returnDate,
          flightNumber: e.flightNumber,
          description: e.description,
          status: e.status,
          associatedWith: e.associatedWith,
        })
        .then((updated) => ({ ok: true as const, updated }))
        .catch(() => ({ ok: false as const, entry: e }))
    );
    const results = await Promise.all(reverseUpdates);

    // 6. Patch local state — primary record + all successfully updated reverse links
    let entries = upsertById(data.travelEntries, record);
    for (const result of results) {
      if (result.ok) {
        entries = upsertById(entries, result.updated);
      } else {
        // Optimistically apply the local state change even if the API call failed
        entries = upsertById(entries, result.entry);
      }
    }

    this.emit({ phase: "ready", error: null, data: { ...data, travelEntries: entries } });
    return record;
  }

  async deleteTravelEntry(id: string): Promise<void> {
    await repository.deleteTravelEntry(id);
    const data = this.requireData();
    // Also remove the deleted ID from any reverse links in the local cache
    const entries = data.travelEntries
      .filter((e) => e.id !== id)
      .map((e) =>
        e.associatedWith.includes(id)
          ? { ...e, associatedWith: e.associatedWith.filter((x) => x !== id) }
          : e
      );
    this.emit({
      phase: "ready",
      error: null,
      data: { ...data, travelEntries: entries },
    });
  }

  async deleteProject(id: string): Promise<void> {
    await repository.deleteProject(id);
    const data = this.requireData();
    this.emit({
      phase: "ready",
      error: null,
      data: { ...data, projects: data.projects.filter((p) => p.id !== id) },
    });
  }

  async deleteEngagement(id: string): Promise<void> {
    await repository.deleteEngagement(id);
    const data = this.requireData();
    this.emit({
      phase: "ready",
      error: null,
      data: { ...data, engagements: data.engagements.filter((e) => e.id !== id) },
    });
  }

  async deleteMilestone(id: string): Promise<void> {
    await repository.deleteMilestone(id);
    const data = this.requireData();
    this.emit({
      phase: "ready",
      error: null,
      data: { ...data, milestones: data.milestones.filter((m) => m.id !== id) },
    });
  }
}

/** App-wide singleton. */
export const portfolioStore = new PortfolioStore();
