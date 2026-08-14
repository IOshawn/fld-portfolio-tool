# Frontline Digital Portfolio Intelligence Hub

A React, TypeScript, Vite, and Fluent UI v9 application for the RTIO Frontline Digital team.

## Local development

```bash
npm run dev
```

The local and Replit experience uses the mock repository backed by `src/data/*.json`.

## Production architecture

```text
React UI -> PortfolioRepository -> FunctionsRepository -> /api/* -> fld-portfolio Function App -> Azure SQL
```

`src/services/index.ts` selects the active repository. The GitHub Actions production build sets
`VITE_API_MODE=functions`, so production code must preserve `FunctionsRepository` and use relative
`/api/*` routes. `RestRepository` and `VITE_USE_API` are legacy database-connection paths and are
not used in production.

## Commands

```bash
npm run typecheck
npm run build
cd api && npm run build
```

## Security

Keep credentials, SQL connection strings, deployment tokens, and publish profiles out of source
control. See `REPLIT-BACKEND-REFERENCE.md` and `AZURE-FUNCTIONS-API.md` for the current API contract.
