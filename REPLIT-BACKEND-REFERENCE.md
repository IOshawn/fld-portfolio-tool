# Replit Backend Reference

Use this file as the backend contract when doing design iterations in Replit. The app can look like anything in the UI, but these connection points must be preserved so exports can be merged back into the Azure-connected repo cleanly.

## Production Backend

- GitHub repo: `IOshawn/fld-portfolio-tool`
- Frontend host: Azure Static Web App
- Frontend backend path: `/api/*`
- Backend resource: Azure Function App `fld-portfolio`
- SQL server: `fld-portfolio.database.windows.net`
- SQL database: `portfolio-projects`
- SQL schema: `phub`
- Function source folder: `api/`
- Function local health route: `/api/health`

The Static Web App is linked to the Function App, so browser code should call relative URLs such as `/api/Projects`, not the Function App hostname directly.

## Frontend Repository Switch

The UI must use the repository abstraction in `src/services`.

Important files:

- `src/services/repository.ts`: TypeScript interface for all frontend data operations.
- `src/services/index.ts`: Chooses the active repository.
- `src/services/mockRepository.ts`: Replit/local mock data implementation.
- `src/services/functionsRepository.ts`: Production Azure Functions implementation.
- `src/services/restRepository.ts`: Retired Static Web Apps Database Connections path. Keep it compiling, but do not build new work around it.

Production Static Web App builds with:

```text
VITE_API_MODE=functions
```

Do not remove `FunctionsRepository` or the `VITE_API_MODE === "functions"` branch in `src/services/index.ts`.

Current selection logic:

```ts
const useApi = import.meta.env.VITE_USE_API === "true";
const apiMode = import.meta.env.VITE_API_MODE;

export const repository: PortfolioRepository = useApi
  ? new RestRepository()
  : apiMode === "functions"
    ? new FunctionsRepository()
    : new MockRepository();
```

For Replit design work, mock mode is fine. Production will use Functions mode.

## API Routes

Generic entity routes are implemented by Azure Functions:

```text
GET    /api/{entity}
POST   /api/{entity}
PATCH  /api/{entity}/{id}
DELETE /api/{entity}/{id}
GET    /api/health
```

Supported entities:

```text
Projects
Milestones
Engagements
Updates
TravelEntries
```

Examples:

```text
GET /api/Projects
GET /api/TravelEntries
POST /api/Updates
PATCH /api/Projects/trueview
DELETE /api/Milestones/12
```

`Projects.id` is a string. The other current entity ids are SQL identity integers.

## SQL Tables

The source of truth for table shape is `azure/sql/schema.sql`.

Current production tables:

```text
phub.Projects
phub.Milestones
phub.Engagements
phub.Updates
phub.TravelEntries
```

The Functions API table mapping lives in:

```text
api/src/sqlRepository.ts
```

If Replit adds a new persistent data type, update all of these together:

```text
src/types/models.ts
src/services/repository.ts
src/services/mockRepository.ts
src/services/functionsRepository.ts
api/src/sqlRepository.ts
azure/sql/schema.sql
```

If it is a new route/page, also update:

```text
src/App.tsx
src/components/AppShell.tsx
src/components/Icon.tsx
```

## Data Contracts

Keep UI code using these TypeScript models from `src/types/models.ts` and repository methods from `src/services/repository.ts`.

Do not fetch directly from page components unless the repository interface is intentionally being changed.

Core aggregate returned by `repository.getPortfolio()`:

```ts
interface PortfolioData {
  projects: Project[];
  milestones: Milestone[];
  engagements: Engagement[];
  updates: ProjectUpdate[];
  travelEntries: TravelEntry[];
}
```

Current writable operations:

```ts
addProjectUpdate(input)
upsertMilestone(input)
upsertEngagement(input)
updateProject(input)
upsertTravelEntry(input)
deleteTravelEntry(id)
deleteProject(id)
deleteEngagement(id)
deleteMilestone(id)
```

## Replit Merge Rules

When iterating in Replit:

- Keep mock JSON data in `src/data/*.json` for Replit previews.
- Keep pages and components pure UI where possible.
- Preserve `src/services/functionsRepository.ts`.
- Preserve `api/` unless intentionally changing backend behavior.
- Preserve `.github/workflows/*`; production deploy depends on those.
- Preserve `public/staticwebapp.config.json`; it secures `/api/*` and app routes.
- Do not reintroduce Static Web Apps Database Connections or `/data-api` as the primary backend.
- Do not hard-code Azure hostnames in React components. Use repository methods or relative `/api/*`.

## Quick Validation After Importing Back

Run these before pushing:

```bash
npm run typecheck
npm run build
cd api
npm run build
```

Expected deployed checks:

```text
/api/health       -> {"ok":true,"service":"frontline-portfolio-hub-api"}
/api/Projects     -> JSON array
/api/TravelEntries -> JSON array, once phub.TravelEntries exists
```

If `/api/health` works but an entity returns `500`, the Function App is reachable and the issue is likely SQL schema, SQL permissions, or the entity mapping in `api/src/sqlRepository.ts`.
