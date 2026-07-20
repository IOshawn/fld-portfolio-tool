/**
 * Active repository for the app.
 *
 * Local dev (`npm run dev`):        MockRepository — in-memory, seeded from src/data/*.json.
 * Azure SWA build (VITE_USE_API=true): RestRepository — the auto-generated Data API Builder
 *                                   REST API over your Azure SQL database.
 *
 * Nothing else in the UI changes — every page depends only on PortfolioRepository.
 * (For the in-SharePoint SPFx host, the SPFx project swaps in SharePointRepository instead.)
 */
import type { PortfolioRepository } from "./repository";
import { MockRepository } from "./mockRepository";
import { RestRepository } from "./restRepository";

const useApi = import.meta.env.VITE_USE_API === "true";

export const repository: PortfolioRepository = useApi
  ? new RestRepository()
  : new MockRepository();

export type { PortfolioRepository } from "./repository";
export type {
  NewProjectUpdate,
  MilestoneInput,
  EngagementInput,
  ProjectEdit,
} from "./repository";
