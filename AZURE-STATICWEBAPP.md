# Deploy to Azure Static Web Apps

> **Current production path:** pushes to `main` run
> `.github/workflows/azure-static-web-apps-ambitious-desert-090767500.yml`. The build uses
> `VITE_API_MODE=functions` and connects to the separate `fld-portfolio` Function App through
> relative `/api/*` routes. The direct SWA CLI approach below is a frontend-only fallback.

Host the app as a static site on Azure Static Web Apps (SWA). This deploys the **UI with the
built-in mock data** — a hosted, shareable, clickable prototype. (Live SharePoint data on SWA
needs a Microsoft Graph data layer — see the last section.)

Two packaging pieces are already in the project:
- `public/staticwebapp.config.json` — SPA routing fallback so deep links / refreshes work.
- `npm run build:app` — builds without the type-check gate (use `npm run build` for the full gated build).

---

## Step 1 — Build the static bundle (in VS Code terminal)

```bash
npm run build:app
```
This produces a **`dist/`** folder — that's the entire site (HTML/JS/CSS + your config). You can sanity-check it locally with `npm run preview`.

---

## Step 2 — Create the Static Web App with **Source = "Other"**

In the **Azure Portal**:
1. **Create a resource → Static Web App.**
2. Subscription / Resource group / **Name** (e.g. `frontline-portfolio-hub`), **Plan: Free**, pick a region.
3. **Deployment details → Source: `Other`.** ← this is the no-CI/CD option; it will **not** ask for GitHub or DevOps.
4. **Review + create → Create.**
5. When it's done, open the resource → **Overview → "Manage deployment token"** → copy the token (a long string). You'll paste it in Step 3.

---

## Step 3 — Deploy the `dist` folder with the SWA CLI

Install the CLI once, then deploy:
```bash
npm install -g @azure/static-web-apps-cli

swa deploy ./dist --env production --deployment-token <PASTE_TOKEN_HERE>
```
That uploads `dist/` straight to Azure — no repo, no pipeline. When it finishes it prints your live URL, e.g. `https://<name>.azurestaticapps.net`. Open it — that's the hosted app.

**To publish an update later:** `npm run build:app` again, then re-run the same `swa deploy` command. That's the whole loop.

> Tip: don't paste the token into any file you commit. Keep it in your password manager, or set it as an env var: `setx SWA_TOKEN "<token>"` (new terminal), then `swa deploy ./dist --env production --deployment-token %SWA_TOKEN%`.

---

## Alternative deploy options

- **VS Code extension** — install *Azure Static Web Apps* extension → sign in → right-click the app → *Deploy to Static Web App*. Convenient, but it nudges you toward a GitHub repo; the CLI path above is the cleanest for "no DevOps, no GitHub".
- **GitHub** (if you'd like auto-deploy on every push) — put the project in a GitHub repo, and when creating the SWA choose **Source: GitHub**. Azure writes a workflow for you; set **App location** `/`, **Output location** `dist`, build command `npm run build:app`. Every push then redeploys automatically.

---

## Optional — lock it to your organisation

By default the URL is public (unlisted). To require sign-in, add a route rule to
`public/staticwebapp.config.json` and rebuild:
```json
"routes": [
  { "route": "/*", "allowedRoles": ["authenticated"] }
],
"responseOverrides": {
  "401": { "statusCode": 302, "redirect": "/.auth/login/aad" }
}
```
This forces a Microsoft login. Restricting to **only Rio Tinto accounts** (not any Microsoft account)
requires configuring a **custom Entra ID provider** on the SWA — tell me and I'll add the exact config.

---

## Later — live SharePoint data on SWA

The `phase3/sharePointRepository.ts` is for the **SPFx/SharePoint** host and won't run on SWA (it needs
the SharePoint sign-in context). To read/write your real SharePoint Lists **from an Azure-hosted app**,
the app uses **Microsoft Graph via MSAL**:
1. Register an **Entra ID app** (SPA) with delegated `Sites.ReadWrite.All` (or scoped site permission).
2. Add a `GraphRepository` implementing the same `PortfolioRepository` interface (MSAL for tokens,
   Graph `/sites/{id}/lists/{list}/items` for data).
3. Swap it in `services/index.ts` — one line, same as every other provider.

I can build that `GraphRepository` + MSAL wiring when you want to move from prototype to live data.
Until then, the SWA deploy above ships the mock-data prototype.
