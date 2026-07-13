# Frontline Digital · Portfolio Intelligence Hub

A lightweight **Portfolio + Engagement Intelligence Hub** for the RTIO Frontline Digital team,
built as a modern **React + TypeScript + Fluent UI** web app.

The hub has **two equal pillars** (per the design addendum):

1. **Initiative Management** — what we deliver, why, and when.
2. **Engagement Planning** — where we deliver it, who we engage, which teams are impacted, and what
   stage each engagement is at.

This is the **Phase 1 prototype** running on mocked JSON, focused on UX and information architecture,
structured so the mock data layer can be swapped for **SharePoint Lists** (Phase 3) without touching
any page or component.

> **Sample data notice:** all initiatives, people, sites, milestones, engagements and updates in
> `src/data/` are **illustrative sample content** for UX validation. The engagement matrices are
> derived from the *Integrated Cadence Tools – Engagement Roadmap* pack; site code → full-name
> mappings are indicative and should be confirmed in Phase 3.

---

## Running it

```bash
cd frontline-portfolio-hub
npm install
npm run dev        # Vite on http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run typecheck`.

> **Build note:** this prototype was authored in a sandbox **without internet access**, so
> dependencies could not be installed and the TypeScript compiler could not be run there. The code is
> written and reviewed carefully against the Fluent UI v9 / React 18 APIs; the first
> `npm install && npm run dev` happens on your machine. The JSON data layer *was* validated in the
> sandbox (parse + referential integrity + enum checks all pass: 13 initiatives, 74 engagements).

---

## Navigation & pages

**Home · Portfolio Roadmap · Projects · Engagements · Sites · Updates**

| Page | What it does |
|------|--------------|
| **Home** | Answers "what is Frontline Digital working on?" — embedded portfolio roadmap, KPI stats, upcoming milestones & site engagements, **sites with highest activity**, **initiatives requiring attention**, recently updated. |
| **Portfolio Roadmap** | Executive 2026–2028 timeline, bars **generated from initiative dates**, with a "today" marker. Filters: Portfolio, **Site**, **Work Area**, Product Area, Stage. |
| **Projects** | Initiative card grid (owner, stage, status, portfolio, next milestone) with search + filters. |
| **Project detail** | Overview, outcome, **business value**, stage/status, owner/sponsor, timeline, milestones, risks, **dependencies**, and a full **engagement section** (footprint, status-by-site, deployment plan). |
| **Engagements** (the **Engagement Hub**) | First-class pillar with three views: **Matrix** (Work Area × Site, initiative chips coloured by stage), **Heatmap** (density, click to drill into a cell), and **By initiative** ("where has this reached?"). Global filters: Initiative, Site, Portfolio, Work Area, Status, Stage. |
| **Sites** | "What's happening at [site]?" — active initiatives, impacted teams/work areas, upcoming engagements, and the engagement timeline. |
| **Updates** | The "never touch a list" forms for **project updates, milestones, and site engagements** (new engagement fields: site, work area, stage, status, start/end, purpose, notes). |

---

## The engagement model (from the roadmap pack)

The *Integrated Cadence Tools – Engagement Roadmap* PowerPoint was used to understand the planning
model — **not** reproduced. Its structure is now an interactive experience:

- **Sites** (matrix columns): `MDO, WAN, YAN, GDI, GTP, BM4, GNAM, HD1, HD4, PBO, RV, PMO Control`.
- **Work Areas** (matrix rows): `OE/BI, Production, Drill & Blast, Development, Mine Water Management, MEM, Fixed Plant`.
- **Engagement Stage** — the deployment lifecycle shown in the pack's cells:
  `Discovery → Design → Development → Prototype → Readiness → Pilot → Engaged → Scale`.
  This is **configurable** (edit `ENGAGEMENT_STAGES` in `src/types/models.ts` and the colour ramp in
  `src/lib/theme.ts`).
- **Engagement Status** — a lightweight activity flag added for planning visibility:
  `Planned, Active, On Hold, Complete`.

The pack's per-initiative matrices (Shift Handover, Integrated Cadence Tool, Daily Performance
Insights — slides 3–5) are encoded verbatim into the engagement data; other initiatives have
representative engagements so the matrix and heatmap are complete.

**Decisions worth knowing:** the pack's cell values map to **Engagement Stage** (the visible,
coloured dimension). We kept a separate **Status** for activity, so a single record carries both the
"how far along" (stage) and "is it live" (status). The two "Pilot & Engaged" cells are represented as
`Engaged` with a note about continuing pilot scope.

---

## Architecture (why this maps cleanly to SharePoint)

Every page reads and writes through **one interface**, never a concrete data source:

```
UI (pages/components)
   └── usePortfolio()  ──►  portfolioStore (reactive cache, useSyncExternalStore)
                                └── repository: PortfolioRepository   ◄── the swap point
                                       ├── MockRepository      (Phase 1 — in-memory, src/data/*.json)
                                       └── SharePointRepository (Phase 3 — same interface, SPFx SPHttpClient)
```

- `src/services/repository.ts` — the `PortfolioRepository` interface.
- `src/services/index.ts` — **the single line you change in Phase 3.**
- `src/lib/selectors.ts` — all portfolio + engagement "intelligence" (matrix/heatmap builders,
  per-site / per-initiative / per-work-area joins, sites-by-activity, attention list). These map
  directly to the Phase 2 Copilot questions ("which initiatives are at a site?", "where has X reached?").

### Phase 3 — list → model mapping

| List | Columns | Model |
|------|---------|-------|
| Portfolio Projects | Title, Portfolio, Product Area, Owner, Sponsor, Stage, Status, Start/End Date, Summary, Outcome, **Business Value**, **Dependencies**, **Abbrev**, Funding Source, Project Code, Last Update, Last Updated | `Project` |
| Project Milestones | Project, Milestone Name, Date, Status, Notes | `Milestone` |
| **Site Engagements** | Initiative, Portfolio, **Site**, **Work Area**, Team, **Engagement Stage**, **Engagement Status**, Start Date, End Date, Purpose, Notes | `Engagement` (first-class) |
| Project Updates | Project, Update Date, Summary, Risks, Decisions Required, Submitted By | `ProjectUpdate` |

Add `SharePointRepository implements PortfolioRepository` (SPFx `SPHttpClient`), change one line in
`services/index.ts`, wrap the app in an SPFx web part. No page/component changes required.

---

## Phase 2 — Copilot Studio (later)

With SharePoint as the system of record, the selectors here are the reference logic for answers like
*what projects are engaging Yandi this quarter?*, *show all projects in Pilot stage*, *where has Shift
Handover reached?*, and *which initiatives are planned for a site?*.

---

## Tech

React 18 · TypeScript (strict) · Vite · Fluent UI v9 (`@fluentui/react-components`) · React Router 6.
Icons are dependency-free inline SVG. No external network calls anywhere.
