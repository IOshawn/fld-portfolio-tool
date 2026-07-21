# Deployment Plan

Status: Local Functions scaffold generated

## Objective

Add an Azure Functions HTTP API backend for the Frontline Portfolio Hub so the Static Web App can read and write Azure SQL through supported `/api/*` endpoints instead of retired Static Web Apps Database Connections.

## Current State

- Frontend: React + TypeScript + Vite hosted by Azure Static Web Apps.
- Current production fallback: mock data repository.
- Existing SQL artifacts: `azure/sql/schema.sql` and `azure/sql/seed.sql`.
- Retired path to avoid: Static Web Apps Database Connections and `/data-api/rest/*`.

## Proposed Architecture

- Static Web App hosts the React frontend.
- Azure Functions app exposes HTTP endpoints under `/api`.
- Azure Functions connects to Azure SQL using either managed identity in Azure or a SQL connection string for local development.
- Frontend can later switch from `MockRepository` to a new Functions-backed repository.

## Planned Local Artifacts

- `api/` Azure Functions TypeScript project. Complete.
- Shared SQL helper for connecting with `mssql`. Complete.
- HTTP endpoints for Projects, Milestones, Engagements, and Updates. Complete.
- Local settings template documenting required environment variables. Complete.
- Documentation for local run and Azure portal setup. Complete.

## Validation

- TypeScript build for the Functions project.
- Existing frontend production build remains passing.
- No Azure deployment commands will be run from this setup step.

## Open Decisions

- Azure subscription, resource group, region, and Function App name are not selected here.
- Final Azure SQL authentication mode should be managed identity in Azure, with local development using a development connection string.
