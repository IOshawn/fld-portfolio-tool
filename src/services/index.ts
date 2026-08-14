/**
 * Active repository for the app.
 *
 * Local dev (no env vars):            MockRepository — in-memory, seeded from src/data/*.json.
 * Azure SWA + Functions backend:      FunctionsRepository — explicit Azure Functions API.
 *   VITE_USE_API=true                 Calls relative /api/* routes served by api/ functions.
 *                                     Data persists in Azure SQL across page reloads.
 *
 * NOTE: RestRepository (Data API Builder, /data-api/*) is intentionally NOT used in
 * production. The swa-db-connections/ path is left in place but inactive. The correct
 * live path is FunctionsRepository → /api/* Azure Functions.
 *
 * Nothing else in the UI changes — every page depends only on PortfolioRepository.
 * (For the in-SharePoint SPFx host, the SPFx project swaps in SharePointRepository instead.)
 */
import type { PortfolioRepository } from "./repository";
import { MockRepository } from "./mockRepository";
import { FunctionsRepository } from "./functionsRepository";

const useApi = import.meta.env.VITE_USE_API === "true";

export const repository: PortfolioRepository = useApi
  ? new FunctionsRepository()
  : new MockRepository();

export type { PortfolioRepository } from "./repository";
export type {
  NewProjectUpdate,
  MilestoneInput,
  EngagementInput,
  ProjectEdit,
  ProjectInput,
  TravelEntryInput,
  QuarterlyMilestoneInput,
} from "./repository";
