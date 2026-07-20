# Deploy to Azure: Static Web App (from GitHub) + Azure SQL database

> **Current status (July 2026):** Azure Static Web Apps **Database Connections** is no longer
> available in this environment, so the portal may not show a **Database connection** setting and
> `/data-api/rest/...` will not work unless you replace it with a supported API layer. The production
> workflow currently builds against the mock repository so the app remains usable while a real Azure
> Functions/App Service API is added for SQL persistence.

The **best method** for this app now that you have a resource group + GitHub:

```
GitHub repo ──► Azure Static Web App (hosts the React app, CI/CD on push)
                      │  Database Connections (Data API Builder)
                      ▼
              Azure SQL Database  (in your resource group)   ← your "database"
```

Data API Builder auto‑generates a secure REST API from your SQL tables — **no backend code**.
The app calls it at `/data-api/rest/...` (already wired in `restRepository.ts`).

Everything you need is in this repo:
- `azure/sql/schema.sql` + `azure/sql/seed.sql` — creates + fills the database.
- `swa-db-connections/staticwebapp.database.config.json` — the auto‑API definition.
- `.github/workflows/azure-static-web-apps.yml` — the CI/CD build (sets `VITE_USE_API=true`).
- `public/staticwebapp.config.json` — SPA routing.

> **You already have the database** — no need to create one. Note these for the steps below:
> `RG`=the resource group, `SQLSERVER`=your existing server (`<name>.database.windows.net`),
> `SQLDB`=your existing database name, plus a login that can create tables in it.

> **Safe on a shared database:** everything goes into a dedicated **`phub`** schema
> (`phub.Projects`, `phub.Milestones`, …). Nothing already in the database is touched, and there
> are no table-name clashes with existing objects.

---

## 1. Point the firewall at Azure + your IP (existing server)
So Static Web Apps / Data API Builder can reach the DB, and so you can load the data:
```bash
# after: az login
az sql server firewall-rule create -g $RG -s $SQLSERVER -n AllowAzure --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
az sql server firewall-rule create -g $RG -s $SQLSERVER -n MyIP --start-ip-address <your.ip> --end-ip-address <your.ip>
```
(Or in the Portal: SQL server → **Networking** → tick *Allow Azure services…* and *Add your client IPv4*.)

## 2. Create the tables and load the data (into the `phub` schema)
Easiest: Portal → your database → **Query editor (preview)** → sign in → paste
`azure/sql/schema.sql`, **Run** → then `azure/sql/seed.sql`, **Run**.

Or from your machine (needs `sqlcmd`):
```bash
sqlcmd -S $SQLSERVER.database.windows.net -d $SQLDB -U <login> -P '<password>' -i azure/sql/schema.sql
sqlcmd -S $SQLSERVER.database.windows.net -d $SQLDB -U <login> -P '<password>' -i azure/sql/seed.sql
```
Check: `SELECT COUNT(*) FROM phub.Projects;` → 13. (To remove later: `DROP SCHEMA` after dropping the 4 tables — it never touches your other data.)

## 3. Put the code on GitHub
```bash
cd frontline-portfolio-hub
git init && git add . && git commit -m "Portfolio Hub"
git branch -M main
git remote add origin https://github.com/<you>/frontline-portfolio-hub.git
git push -u origin main
```

## 4. Create the Static Web App (connect GitHub)
Portal → your resource group → **Create → Static Web App**:
- Plan **Standard** (Database Connections needs Standard, not Free).
- **Deployment: GitHub** → authorise → pick your repo + `main`.
- Build presets: **Custom** → **App location** `/` · **Api location** *(blank)* · **Output location** `dist`.
- Create. Azure adds a workflow + the deploy‑token secret and runs the first build.
  (You can keep the workflow already in the repo instead — just make sure `VITE_USE_API=true` is set,
  which it is.)

## 5. Connect the database to the Static Web App
Portal → your Static Web App → **Settings → Database connection → Link existing database**:
- Type **Azure SQL**, pick your server/`portfoliohub`, auth **Connection string** (SQL admin).
- This reads `swa-db-connections/staticwebapp.database.config.json` from your repo and stands up the
  `/data-api/rest/...` endpoints. SWA stores the connection string as the `DATABASE_CONNECTION_STRING`
  app setting for you.

## 6. Done — test it
Open the SWA URL (`https://<name>.azurestaticapps.net`). The app now reads/writes Azure SQL. Try
**Updates → Edit initiative** → change an owner → it persists in the database. Every `git push`
redeploys automatically.

---

## Security (do this before sharing widely)
The API is currently **anonymous** (open) so the first deploy "just works". To lock it to your org:
1. In `swa-db-connections/staticwebapp.database.config.json`, change each entity's `"role": "anonymous"`
   to `"authenticated"`, commit, push.
2. In `public/staticwebapp.config.json`, add:
   ```json
   "routes": [{ "route": "/data-api/*", "allowedRoles": ["authenticated"] },
              { "route": "/*", "allowedRoles": ["authenticated"] }],
   "responseOverrides": { "401": { "statusCode": 302, "redirect": "/.auth/login/aad" } }
   ```
   That forces Microsoft sign‑in. (Restricting to *only* Rio Tinto accounts needs a custom Entra
   provider on the SWA — ask me and I'll add the config.)

## Cost
SWA **Standard** is a small monthly fee; Azure SQL **Serverless** with auto‑pause bills only when
active (a few AUD/month at this size). Both live in your resource group.

## Notes
- Local `npm run dev` stays on **mock data** (VITE_USE_API isn't set), so you can keep developing
  offline; only the Azure build talks to SQL.
- Field names are the contract: SQL columns (`schema.sql`) == the model fields, and `restRepository.ts`
  maps them 1:1. If you rename a column, update both.
