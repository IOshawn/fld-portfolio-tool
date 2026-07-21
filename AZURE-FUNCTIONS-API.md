# Azure Functions API Setup

Use this path instead of retired Static Web Apps Database Connections.

## Architecture

```text
Azure Static Web App -> /api/* -> Azure Function App -> Azure SQL
```

The React app remains on mock data until the workflow is updated with:

```yaml
env:
  VITE_API_MODE: "functions"
```

## Local Project

The Functions project is in `api/`.

VS Code selections:

- Language: TypeScript
- Programming model: Model v4
- Runtime: Node.js
- Template: HTTP trigger
- Authorization level: Anonymous

Install and run locally:

```bash
cd api
npm install
copy local.settings.json.example local.settings.json
npm start
```

Set `SQL_CONNECTION_STRING` in `api/local.settings.json`.

## Database

Run the existing schema and seed scripts against Azure SQL:

```text
azure/sql/schema.sql
azure/sql/seed.sql
```

Expected tables:

```sql
SELECT COUNT(*) FROM phub.Projects;
SELECT COUNT(*) FROM phub.Milestones;
SELECT COUNT(*) FROM phub.Engagements;
SELECT COUNT(*) FROM phub.Updates;
```

## Azure Function App

1. Create a Function App in Azure.
2. Runtime stack: Node.js.
3. Turn on system-assigned managed identity.
4. Add the `SQL_CONNECTION_STRING` app setting.
5. Link the Function App to the Static Web App under **Settings -> APIs**.

For managed identity, run this in the database:

```sql
CREATE USER [<function-app-name>] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [<function-app-name>];
ALTER ROLE db_datawriter ADD MEMBER [<function-app-name>];
```

## Endpoints

- `GET /api/Projects`
- `GET /api/Milestones`
- `GET /api/Engagements`
- `GET /api/Updates`
- `POST /api/Updates`
- `POST /api/Milestones`
- `POST /api/Engagements`
- `PATCH /api/Projects/{id}`
- `PATCH /api/Milestones/{id}`
- `PATCH /api/Engagements/{id}`

## Turn On In Frontend

After the Function App is deployed, linked, and tested, set the Static Web App build env var:

```yaml
env:
  VITE_API_MODE: "functions"
```

Do not use `VITE_USE_API=true`; that points to the retired `/data-api/rest/*` path.
