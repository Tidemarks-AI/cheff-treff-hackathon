-- =============================================================
-- Drop old domain tables (moving to SurrealDB)
-- Keep: pending_approvals, auth.users
-- Add: user_companies mapping table
-- =============================================================

-- Drop functions first (they reference the tables)
drop function if exists public.recompute_variance(uuid, text, date);
drop function if exists public.generate_fixed_costs(date);

-- Drop tables in dependency order (children first)
drop table if exists public.variances cascade;
drop table if exists public.actuals cascade;
drop table if exists public.budget_lines cascade;
drop table if exists public.fixed_costs cascade;
drop table if exists public.cost_centers cascade;
drop table if exists public.company_members cascade;
drop table if exists public.people cascade;
drop table if exists public.companies cascade;

-- =============================================================
-- user_companies: maps Supabase auth users to SurrealDB databases
-- =============================================================
create table public.user_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surreal_db text not null,
  company_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (user_id, surreal_db)
);

create index idx_user_companies_user_id on public.user_companies(user_id);

alter table public.user_companies enable row level security;

create policy "Users can read own company mappings"
  on public.user_companies for select to authenticated
  using (user_id = auth.uid());

create policy "Service role full access on user_companies"
  on public.user_companies for all to service_role
  using (true);
