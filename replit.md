# Frontline Digital · Portfolio Intelligence Hub

A React + TypeScript + Fluent UI v9 web app for the RTIO Frontline Digital team. Two pillars: **Initiative Management** and **Engagement Planning**.

## Running the app

```bash
npm run dev   # Vite dev server on port 5000
```

The **"Start application"** workflow runs `npm run dev` and serves the preview on port 5000.

Other scripts: `npm run build`, `npm run preview`, `npm run typecheck`.

## Stack

- React 18 · TypeScript (strict) · Vite · Fluent UI v9 · React Router 6
- Local dev: all data served from in-memory mock (`src/data/*.json`) via `MockRepository`
- Azure SWA build: `RestRepository` (Azure SQL via Data API Builder) — activated by `VITE_USE_API=true` in `build:app`

## Architecture

```
UI (pages/components)
   └── usePortfolio()  ──►  portfolioStore (reactive cache)
                                └── repository: PortfolioRepository   ← swap point
                                       ├── MockRepository      (Phase 1 — src/data/*.json)
                                       └── RestRepository      (Azure SQL — VITE_USE_API=true)
```

- `src/services/index.ts` — the single line that switches between mock and real data
- `src/services/repository.ts` — the `PortfolioRepository` interface
- `src/lib/selectors.ts` — all portfolio + engagement intelligence (matrix/heatmap builders)
- `src/data/` — mock JSON fixtures (projects, milestones, engagements, updates)

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_USE_API` | Set to `"true"` to use `RestRepository` (Azure SQL) instead of mock data |
| `SESSION_SECRET` | Available in secrets — for future auth/session use |

## User preferences

- Wiring to Azure SQL database (not SharePoint lists) for the real data layer
- Layout and behaviour changes planned after initial setup
