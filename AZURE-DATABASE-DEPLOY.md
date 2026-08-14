# Production deployment: Static Web App + Function App + Azure SQL

## Current architecture

```text
GitHub main
  |- Azure Static Web Apps workflow -> FLD-Portfolio (React/Vite frontend)
  |- Azure Functions workflow -> fld-portfolio (HTTP API)
                                  |- Azure SQL: portfolio-projects / phub schema
```

The frontend uses `FunctionsRepository` in production (`VITE_API_MODE=functions`) and makes
relative `/api/*` calls. The Function App connects to Azure SQL using its `SQL_CONNECTION_STRING`
application setting. Static Web Apps Database Connections and `/data-api/rest/*` are retired paths;
do not configure new production work around them.

## Deployment

1. Apply reviewed schema changes in `azure/sql/schema.sql` to the target database before deploying
   code that relies on them. Apply `azure/sql/seed.sql` only when intentionally updating sample data.
2. Verify the Function App has the required non-secret settings, including `SQL_CONNECTION_STRING`.
3. Commit and push to `main`. The two workflows deploy the frontend and Function App independently.
4. Confirm both GitHub Actions runs succeed, then sign in to the Static Web App and verify:

   ```text
   GET /api/health
   GET /api/portfolio
   ```

## Security

- Never commit SQL connection strings, deployment tokens, client secrets, or publish profiles.
- The Static Web App requires Microsoft Entra sign-in. Keep `/api/*` protected in
  `public/staticwebapp.config.json`.
- Do not overwrite the Function App with the Replit package's custom-handler variant; production
  uses the Azure Functions Node v4 implementation in `api/src/functions/`.
