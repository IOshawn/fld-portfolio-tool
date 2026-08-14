# Deployment Plan

Status: Validated

## Scope

Assess and integrate the supplied Replit design revision while preserving the Azure Static Web App + Azure Functions deployment architecture. Validate the reconciled app, then seek approval before publishing the resulting Git commit to production.

## Reconciliation Plan

### Architecture retained

- React/Vite frontend is deployed to the existing `FLD-Portfolio` Azure Static Web App by `.github/workflows/azure-static-web-apps-ambitious-desert-090767500.yml`.
- The production frontend uses `VITE_API_MODE=functions` and calls relative `/api/*` endpoints through `FunctionsRepository`.
- The existing `fld-portfolio` Azure Function App is deployed independently by `.github/workflows/main_fld-portfolio.yml` and uses the Azure Functions Node v4 programming model.
- Azure SQL remains the data store, using `azure/sql/schema.sql` and the Function App's `SQL_CONNECTION_STRING` setting.

### Findings

- The supplied Replit package's `src/` design revision is already reflected in the current working tree, including the new travel, quarterly, notification, person, and admin UI work.
- The package includes an alternative Azure Functions custom-handler implementation and an SWA-managed API deployment workflow. Do not import those files: they would replace the deployed Function App's supported Node v4 model and duplicate its deployment path.
- The current Function API already supports the frontend contract: `/api/portfolio`, projects, milestones, engagements, project updates, travel entries, and quarterly milestones.

### Proposed execution

1. Preserve the existing local Replit UI changes and Function App architecture; import only any safe, missing static assets or non-conflicting design files after a final file-level check.
2. Ensure deployment documentation and configuration consistently describe the separate Function App architecture, not the package's custom-handler alternative.
3. Run frontend type-check and production build, then Function API build and tests.
4. Review the Git diff for credentials and generated artifacts, commit the reconciled revision to `main`, and push it.
5. Confirm both GitHub Actions deployments succeed and verify the authenticated Static Web App and `/api/health` endpoint.

## Azure Context

- Subscription: `RioTinto-Global-Sandbox` (`547c69a4-604a-4694-a642-5216196011d9`)
- Resource group: `arg-rt-sbx-trueview2-sb`
- Static Web App: `FLD-Portfolio` (East Asia)
- Function App: `fld-portfolio` (Australia East)

## Risk Controls

- No secrets, connection strings, deployment tokens, or publish profiles will be added to Git.
- No SQL schema or seed script will be applied to production without separate confirmation.
- The existing user changes will not be discarded or overwritten by the ZIP.

## Preparation Evidence

- 2026-08-14: Compared the supplied Replit package with the workspace. The design revision is already present; its custom-handler API was intentionally excluded because the deployed Azure Functions Node v4 API already fulfills the same frontend contract.
- 2026-08-14: `npm run typecheck` passed.
- 2026-08-14: `npm run build` passed.
- 2026-08-14: `cd api && npm run build` passed.

## Validation Proof

- 2026-08-14: `npm run typecheck` passed.
- 2026-08-14: `npm run build` passed.
- 2026-08-14: `cd api && npm run build` passed.
- 2026-08-14: `git diff --check` passed.
- 2026-08-14: parsed `public/staticwebapp.config.json`; `/api/*` requires the `authenticated` role.
- 2026-08-14: reviewed both workflows; the UI builds with `VITE_API_MODE=functions`, the Function App workflow targets `fld-portfolio`, and the package custom-handler workflow is excluded.
- 2026-08-14: scanned changed files for credential-like values; no values were found.
- 2026-08-14: with explicit approval, applied `azure/sql/schema.sql` to `portfolio-projects`; verified the required API columns, `phub.QuarterlyMilestones`, and its three seeded milestones. The temporary single-IP SQL firewall rule used for the migration was removed afterward.

## Role Assignment Verification

- Status: Not applicable to source-defined infrastructure.
- The repository has no Bicep or Terraform role-assignment resources to review. The live Function App uses the existing `SQL_CONNECTION_STRING` application setting; no RBAC or SQL-permission change is included in this release.

## Objective

Add an Azure Functions HTTP API backend for the Frontline Portfolio Hub so the Static Web App can read and write Azure SQL through supported `/api/*` endpoints instead of retired Static Web Apps Database Connections.

## Current State

- Frontend: React + TypeScript + Vite hosted by Azure Static Web Apps.
- Current production fallback: mock data repository.
- Existing SQL artifacts: `azure/sql/schema.sql` and `azure/sql/seed.sql`.
- Retired path to avoid: Static Web Apps Database Connections and `/data-api/rest/*`.

## Proposed Architecture

- Static Web App hosts the React frontend.
- Azure Functions app exposes HTTP endpoints under `/api`.
- Azure Functions connects to Azure SQL using either managed identity in Azure or a SQL connection string for local development.
- Frontend can later switch from `MockRepository` to a new Functions-backed repository.

## Planned Local Artifacts

- `api/` Azure Functions TypeScript project. Complete.
- Shared SQL helper for connecting with `mssql`. Complete.
- HTTP endpoints for health, Projects, Milestones, Engagements, and Updates. Complete.
- Local settings template documenting required environment variables. Complete.
- Documentation for local run and Azure portal setup. Complete.

## Validation

- TypeScript build for the Functions project.
- Existing frontend production build remains passing.
- No Azure deployment commands will be run from this setup step.

## Open Decisions

- Azure subscription, resource group, region, and Function App name are not selected here.
- Final Azure SQL authentication mode should be managed identity in Azure, with local development using a development connection string.
