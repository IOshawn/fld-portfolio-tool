# Phase 3 — Stand up SharePoint & publish the web part

This is the runbook to take the prototype to a live SPFx web part backed by SharePoint
Lists. Everything below runs in **VS Code** (its integrated terminal) on a machine with
internet, plus one admin step in the SharePoint Admin Center.

**What you'll end with:** the same app you've been clicking, running inside a SharePoint
page, reading/writing four SharePoint Lists — with owners, portfolios, etc. editable
either directly in the list or via the app's **Updates → Edit initiative** form.

---

## 0. Prerequisites (one-time)

- A SharePoint **site** to host it (e.g. `.../sites/FrontlineDigital`) where you are an **Owner**.
- Someone with **SharePoint App Catalog** access for the final deploy (often a SharePoint admin). You only need them for step 5.
- A dev machine with:
  - **Node.js** — match your SPFx version (SPFx 1.20 → Node 18 LTS; SPFx 1.21 → Node 22). Use `nvm` to switch.
  - VS Code, and the global SPFx toolchain:
    ```bash
    npm install -g yo gulp-cli @microsoft/generator-sharepoint
    ```
  - **PnP.PowerShell** for provisioning:
    ```powershell
    Install-Module PnP.PowerShell -Scope CurrentUser
    ```

---

## 1. Provision the lists + seed the data  → editing works immediately

From the project root in the VS Code terminal (PowerShell):

```powershell
cd sharepoint
# First-time only, if interactive login needs an app registration:
#   Register-PnPEntraIDAppForInteractiveLogin -ApplicationName "FD Portfolio Hub Admin" -Tenant <tenant>.onmicrosoft.com
./Provision-PortfolioHub.ps1 -SiteUrl "https://<tenant>.sharepoint.com/sites/FrontlineDigital"
```

This creates the four lists (**Portfolio Projects, Project Milestones, Site Engagements,
Project Updates**) with the exact column internal names the app expects, and loads the
current sample data. **At this point you can already fix owners/portfolios** by editing
the *Portfolio Projects* list in the browser — no app needed. Re-run with `-SkipSeed` to
create lists without data, or re-run as-is to wipe + reload.

---

## 2. Scaffold the SPFx web part

```bash
# from a NEW folder (not inside this prototype)
md frontline-portfolio-spfx && cd frontline-portfolio-spfx
yo @microsoft/sharepoint
```
Answers: **solution name** `frontline-portfolio-hub`; **component type** WebPart;
**name** `PortfolioHub`; **framework** React. Then open the folder in VS Code.

Install the app's runtime deps:
```bash
npm install @fluentui/react-components react-router-dom @pnp/sp @pnp/core @pnp/queryable
```

> SPFx currently bundles **React 17**. Fluent UI v9 and react-router v6 both support React 17,
> and the app's data hook was written to avoid React-18-only APIs — so the components port
> unchanged. You may see peer-dependency warnings on install; they are safe.

---

## 3. Port the app into the web part

1. **Copy** these folders from the prototype's `src/` into the web part's source
   (e.g. `src/webparts/portfolioHub/app/`):
   `components/ pages/ lib/ services/ store/ hooks/ types/ data/`
2. **Copy** `phase3/sharePointRepository.ts` into `app/services/`.
3. **Wire the live repository** — edit `app/services/index.ts`:
   ```ts
   import type { PortfolioRepository } from "./repository";
   import { SharePointRepository } from "./sharePointRepository";
   // MockRepository import can stay for local testing.
   export function makeRepository(sp: import("@pnp/sp").SPFI): PortfolioRepository {
     return new SharePointRepository(sp);
   }
   ```
   (Or keep the simple `export const repository` and set it from the web part — see below.)
4. **Mount the app** in the web part's `render()` (`PortfolioHubWebPart.ts`):
   ```tsx
   import * as React from "react";
   import * as ReactDom from "react-dom";
   import { FluentProvider, webLightTheme } from "@fluentui/react-components";
   import { HashRouter } from "react-router-dom";
   import { spfi, SPFx } from "@pnp/sp";
   import App from "./app/App";

   // in render():
   const sp = spfi().using(SPFx(this.context));
   // make `sp` available to the repository (e.g. set a module singleton or context)
   ReactDom.render(
     React.createElement(FluentProvider, { theme: webLightTheme },
       React.createElement(HashRouter, null, React.createElement(App))),
     this.domElement
   );
   ```
   Use **`HashRouter`**, not `BrowserRouter` — the SharePoint page owns the URL.
5. The prototype's `main.tsx`, `index.html`, `vite.config.ts`, `tsconfig*.json` are **not**
   used in SPFx — leave them behind. The few global styles in `index.css` (full-height) can
   move into the web part's `.module.scss` container.
6. `data/*.json` is only used by `MockRepository`; the live app reads SharePoint. Keep it for
   local fallback or delete it.

---

## 4. Run it locally

```bash
gulp serve --nobrowser
```
Open the **hosted workbench** on your site:
`https://<tenant>.sharepoint.com/sites/FrontlineDigital/_layouts/15/workbench.aspx`,
add the **Portfolio Hub** web part. It now reads the lists you seeded in step 1.
Fix any PnPjs import/typing mismatches flagged by `gulp serve` (versions vary slightly).

---

## 5. Package & publish to the App Catalog

```bash
gulp bundle --ship
gulp package-solution --ship
```
This produces `sharepoint/solution/frontline-portfolio-hub.sppkg`.

Then (you, or your SharePoint admin):
1. Go to the **SharePoint Admin Center → More features → Apps**, or the tenant
   **App Catalog** site → *Apps for SharePoint*.
2. **Upload** the `.sppkg`, check *Make this solution available to all sites*, click **Deploy**.
3. On your site: **+ New → App** (or *Site Contents → Add an app*), add **Portfolio Hub**.
4. Edit a page → add the **Portfolio Hub** web part → publish.

It's now live on your SharePoint.

---

## 6. Editing data in production

- **Quick / admin:** edit the **Portfolio Projects** list directly (grid view is fastest for
  fixing owners/portfolios across many rows).
- **In-app (end users):** the app's **Updates → Edit initiative** tab edits Owner, Portfolio,
  Sponsor, Product Area, Stage, Status, dates, value, dependencies — already built and working.
  *Updates*, *Milestone* and *Site engagement* forms write to their lists too.

---

## Notes & gotchas

- **Field names are the contract.** `sharePointRepository.ts` (the `F` map) and
  `Provision-PortfolioHub.ps1` use the same internal names. If you add/rename a column, change both.
- **Owner/Sponsor are Text fields** in v1 (so seeding never fails on unmatched accounts). To make
  them real people, change those two columns to **Person** fields and map `i.Owner.Title` /
  set by email in the repository — a small, isolated change.
- **Child→parent link** is the `InitiativeKey` text (the slug, e.g. `shift-handover`), matching how
  the prototype joins. You can upgrade these to **Lookup** columns later for nicer list UX.
- **Permissions:** PnPjs runs as the signed-in user (`SPFx(this.context)`), so anyone who can use
  the site can read; editing requires list write access. No extra Graph/API permissions are needed
  for same-site list access.
- **Phase 2 (Copilot Studio):** once the lists are the system of record, point Copilot at them; the
  selectors in `lib/selectors.ts` are the reference logic for the example questions.
