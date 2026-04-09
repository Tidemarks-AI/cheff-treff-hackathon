# AGENTS.md

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
- `backend/src/lib/agents.ts`: OpenAI agent definition
- `backend/src/lib/supabase.ts`: Supabase client setup

## Working Notes For Agents

- Keep changes minimal and aligned with the existing TypeScript style.
- Preserve the current split between `frontend` and `backend`.
- Prefer updating existing components and routes over adding new abstractions.
- If backend schema or Supabase behavior changes, regenerate frontend DB types with `pnpm --prefix backend db:types`.
