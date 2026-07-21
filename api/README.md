# Frontline Portfolio Hub API

Azure Functions TypeScript API for the Frontline Portfolio Hub.

## VS Code Setup

When the Azure Functions extension asks for project settings, use:

- Language: TypeScript
- Programming model: Model v4
- Trigger type: HTTP trigger
- Authorization level: Anonymous
- Runtime: Node.js

The functions are already defined in `src/functions/entities.ts`.

## Local Setup

1. Install Azure Functions Core Tools v4.
2. Copy `local.settings.json.example` to `local.settings.json`.
3. Set `SQL_CONNECTION_STRING` for your Azure SQL database.
4. Install and run:

```bash
npm install
npm start
```

Local endpoints:

- `GET http://localhost:7071/api/Projects`
- `GET http://localhost:7071/api/Milestones`
- `GET http://localhost:7071/api/Engagements`
- `GET http://localhost:7071/api/Updates`
- `POST http://localhost:7071/api/Updates`
- `PATCH http://localhost:7071/api/Projects/{id}`

## SQL Setup

Run these scripts against the target database before starting the API:

```bash
../azure/sql/schema.sql
../azure/sql/seed.sql
```

For Azure hosting, prefer managed identity and grant the Function App identity database access:

```sql
CREATE USER [<function-app-name>] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [<function-app-name>];
ALTER ROLE db_datawriter ADD MEMBER [<function-app-name>];
```
