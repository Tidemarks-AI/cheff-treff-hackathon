# Project
This is the project "Startup OS" which enables startups to do and help with all the business processes from the beginning with legal paperwork and requirements to the running company with funding rounds and financial forecasts and reporting for shareholders.

## Project Overview

This repository is a small full-stack TypeScript hackathon app with two workspaces:

- `frontend`: Vite + React 19 + TypeScript + TanStack Router + shadcn/ui + Tailwind CSS v4.
- `backend`: Express 5 + TypeScript + Supabase + OpenAI Agents SDK.

The frontend currently renders a dashboard-style home page with sidebar navigation and mock dashboard cards. The backend exposes health, test DB, chat, and agent endpoints.

## Common Commands

- Install everything: `pnpm install:all`
- Run full stack locally: `pnpm dev`
- Run frontend only: `pnpm dev:frontend`
- Run backend only: `pnpm dev:backend`
- Frontend build: `pnpm --prefix frontend build`
- Frontend lint: `pnpm --prefix frontend lint`
- Frontend typecheck: `pnpm --prefix frontend typecheck`
- Backend build: `pnpm --prefix backend build`

## Environment

Create `.env` from `.env.example`.

Important variables:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Important Paths

- `frontend/src/router.tsx`: app routing
- `frontend/src/pages/Home.tsx`: current main page
- `frontend/src/components/dashboard/*`: dashboard UI
- `backend/src/index.ts`: Express entrypoint and API routes
- `backend/src/lib/agents.ts`: OpenAI agent registry and dynamic loader
- `backend/src/lib/supabase.ts`: Supabase client setup
- `backend/tools.ts`: shared OpenAI Agents SDK tool registry
- `backend/agents/*/config.ts`: one folder per agent with a default-exported agent config

## Agent Structure

- Backend agents live in `backend/agents`
- Every agent must have its own folder, for example `backend/agents/startup-advisor`
- Each agent folder must contain a `config.ts` file with a default export matching the shared `AgentConfig` shape
- The config should define `id`, `name`, `description`, `systemprompt`, and `tools`
- A config may optionally define `model` to override the default
- The backend agent registry applies the default model `gpt-5.4-mini` when no override is set
- Shared allowed tools are defined in `backend/tools.ts`
- Agents are discovered automatically from `backend/agents/*/config.ts`, so no manual registration in `backend/src/lib/agents.ts` is needed

## Working Notes For Agents

- Keep changes minimal and aligned with the existing TypeScript style.
- Preserve the current split between `frontend` and `backend`.
- Prefer updating existing components and routes over adding new abstractions.
- If backend schema or Supabase behavior changes, regenerate frontend DB types with `pnpm --prefix backend db:types`.
