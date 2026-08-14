/**
 * Data-access seam for the Portfolio Hub.
 *
 * Every page reads and writes through a `PortfolioRepository`, never a concrete
 * data source. Phase 1 ships `MockRepository` (in-memory, seeded from JSON).
 * Phase 3 adds `SharePointRepository` implementing the SAME interface (SPFx
 * `SPHttpClient` against the four lists) and swaps it in `services/index.ts`.
 */
import type {
  PortfolioData,
  Project,
  ProjectStage,
  Milestone,
  Engagement,
  ProjectUpdate,
  TravelEntry,
  TravelStatus,
  Stage,
  Status,
  MilestoneStatus,
  Site,
  WorkArea,
  EngagementStage,
  EngagementStatus,
  PersonRef,
} from "../types/models";
import type { QuarterlyMilestone, PortfolioArea } from "../types/quarterly";

/** Payload for submitting a project update via the Update experience. */
export interface NewProjectUpdate {
  projectId: string;
  date: string;
  summary: string;
  risks: string;
  decisionsRequired: string;
  submittedBy: PersonRef;
  newStatus?: Status;
  newStage?: Stage;
}

/** Payload for creating or editing a milestone. */
export interface MilestoneInput {
  id?: string;
  projectId: string;
  name: string;
  date: string;
  status: MilestoneStatus;
  notes: string;
}

/** All fields required to create a new project / initiative. */
export interface ProjectInput {
  title: string;
  abbrev: string;
  portfolio: string;
  productArea: string;
  owner: PersonRef;
  sponsor: PersonRef;
  stage: Stage;
  status: Status;
  startDate: string;
  endDate: string;
  summary: string;
  outcomeStatement: string;
  businessValue: string;
  dependencies: string[];
  fundingSource: string;
  nOrPCode: string;
  sites: Site[];
  projectStages: Array<Omit<ProjectStage, "id" | "projectId">>;
}

/** Editable core fields of an initiative (all optional except id). */
export interface ProjectEdit {
  id: string;
  title?: string;
  abbrev?: string;
  portfolio?: string;
  productArea?: string;
  owner?: PersonRef;
  sponsor?: PersonRef;
  stage?: Stage;
  status?: Status;
  startDate?: string;
  endDate?: string;
  summary?: string;
  outcomeStatement?: string;
  businessValue?: string;
  dependencies?: string[];
  fundingSource?: string;
  nOrPCode?: string;
  sites?: Site[];
  projectStages?: ProjectStage[];
}

/** Payload for creating or editing an engagement (portfolio is derived). */
export interface EngagementInput {
  id?: string;
  initiativeId: string;
  site: Site;
  workArea: WorkArea;
  team: string;
  stage: EngagementStage;
  status: EngagementStatus;
  startDate: string;
  endDate: string;
  purpose: string;
  notes: string;
}

/** Payload for creating or editing a travel entry. */
export interface TravelEntryInput {
  id?: string;
  person: PersonRef;
  initiativeId: string;
  site: Site;
  workArea: WorkArea;
  team: string;
  departureDate: string;
  returnDate: string;
  flightNumber?: string;
  description: string;
  status: TravelStatus;
  associatedWith: string[];
}

/** Payload for creating or updating a quarterly milestone. */
export interface QuarterlyMilestoneInput {
  /** Omit (or pass undefined) to create; provide to update. */
  id?: string;
  portfolioArea: PortfolioArea;
  subGroup?: string;
  initiative: string;
  initiativeDescription?: string;
  milestone: string;
  /**
   * ISO YYYY-MM-DD sort key. For ranges / vague periods use the period's last day.
   */
  targetDate: string;
  /** Human-readable label that overrides the formatted date in chips. */
  dateLabel?: string;
  notes?: string;
}

export interface PortfolioRepository {
  /** Load the full portfolio (all four lists). */
  getPortfolio(): Promise<PortfolioData>;

  /**
   * Append a project-update history record AND patch the parent project's
   * Last Update / Last Updated (and optional Status/Stage). Mirrors the brief:
   * "Saving should update Portfolio Project records and create an update history record".
   */
  addProjectUpdate(
    input: NewProjectUpdate
  ): Promise<{ update: ProjectUpdate; project: Project }>;

  /** Create (no id) or update (with id) a milestone. */
  upsertMilestone(input: MilestoneInput): Promise<Milestone>;

  /** Create (no id) or update (with id) an engagement. */
  upsertEngagement(input: EngagementInput): Promise<Engagement>;

  /** Create a brand-new initiative and add it to the portfolio. */
  createProject(input: ProjectInput): Promise<Project>;

  /** Edit core fields of an existing initiative (owner, portfolio, etc.). */
  updateProject(input: ProjectEdit): Promise<Project>;

  /** Create (no id) or update (with id) a travel entry. */
  upsertTravelEntry(input: TravelEntryInput): Promise<TravelEntry>;

  /** Delete a travel entry by id. */
  deleteTravelEntry(id: string): Promise<void>;

  /** Delete a project by id. */
  deleteProject(id: string): Promise<void>;

  /** Delete an engagement by id. */
  deleteEngagement(id: string): Promise<void>;

  /** Delete a milestone by id. */
  deleteMilestone(id: string): Promise<void>;

  // ── Quarterly Milestones ──────────────────────────────────────────────────

  /** Return all quarterly milestone records (from seed JSON in mock, SQL in Functions). */
  getQuarterlyMilestones(): Promise<QuarterlyMilestone[]>;

  /** Create (no id) or update (with id) a quarterly milestone. */
  upsertQuarterlyMilestone(input: QuarterlyMilestoneInput): Promise<QuarterlyMilestone>;

  /** Delete a quarterly milestone by id. */
  deleteQuarterlyMilestone(id: string): Promise<void>;
}
