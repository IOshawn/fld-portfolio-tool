/**
 * Active repository for the app.
 *
 * PHASE 1 (now):   MockRepository — in-memory, seeded from src/data/*.json.
 * PHASE 3 (later): swap the line below for `new SharePointRepository(context)`
 *                  where `context` is the SPFx WebPartContext. Nothing else in
 *                  the UI changes — every page depends only on PortfolioRepository.
 */
import type { PortfolioRepository } from "./repository";
import { MockRepository } from "./mockRepository";

export const repository: PortfolioRepository = new MockRepository();

export type { PortfolioRepository } from "./repository";
export type {
  NewProjectUpdate,
  MilestoneInput,
  EngagementInput,
  ProjectEdit,
} from "./repository";
