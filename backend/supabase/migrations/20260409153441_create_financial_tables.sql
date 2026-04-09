-- =============================================================
-- Financial domain tables: cost_centers, fixed_costs, budget_lines, actuals, variances
-- =============================================================

-- 1. Cost Centers
create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  owner_email text,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create index idx_cost_centers_company_id on public.cost_centers(company_id);

alter table public.cost_centers enable row level security;

-- 2. Fixed Costs
create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  cost_center_id uuid not null references public.cost_centers(id) on delete cascade,
  category text not null,
  name text not null,
  amount numeric(12,2) not null,
  currency text not null default 'EUR',
  start_date date not null,
  end_date date,
  source text,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fixed_costs_cost_center_id on public.fixed_costs(cost_center_id);

alter table public.fixed_costs enable row level security;

-- 3. Budget Lines
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  cost_center_id uuid not null references public.cost_centers(id) on delete cascade,
  category text not null,
  month date not null,
  planned_amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  unique (cost_center_id, category, month)
);

create index idx_budget_lines_cost_center_id on public.budget_lines(cost_center_id);

alter table public.budget_lines enable row level security;

-- 4. Actuals
create table public.actuals (
  id uuid primary key default gen_random_uuid(),
  cost_center_id uuid not null references public.cost_centers(id) on delete cascade,
  category text not null,
  month date not null,
  actual_amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  source text not null default 'manual',
  source_ref text,
  description text,
  created_at timestamptz not null default now()
);

create index idx_actuals_cost_center_id on public.actuals(cost_center_id);
create index idx_actuals_cost_center_month on public.actuals(cost_center_id, month);

alter table public.actuals enable row level security;

-- 5. Variances
create table public.variances (
  id uuid primary key default gen_random_uuid(),
  cost_center_id uuid not null references public.cost_centers(id) on delete cascade,
  category text not null,
  month date not null,
  planned_amount numeric(12,2) not null default 0,
  actual_amount numeric(12,2) not null default 0,
  variance_amount numeric(12,2) generated always as (actual_amount - planned_amount) stored,
  variance_pct numeric(8,4) generated always as (
    case when planned_amount = 0 then null
         else (actual_amount - planned_amount) / planned_amount
    end
  ) stored,
  status text not null default 'ok',
  explanation text,
  explained_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (cost_center_id, category, month)
);

create index idx_variances_cost_center_id on public.variances(cost_center_id);

alter table public.variances enable row level security;

-- =============================================================
-- Functions
-- =============================================================

-- Recompute a single variance cell from budget_lines + actuals
create or replace function public.recompute_variance(
  p_cost_center_id uuid,
  p_category text,
  p_month date
)
returns void language sql as $$
  insert into public.variances (cost_center_id, category, month, planned_amount, actual_amount, status)
  select
    p_cost_center_id, p_category, p_month,
    coalesce(bl.planned_amount, 0),
    coalesce(act.total_actual, 0),
    case
      when coalesce(bl.planned_amount, 0) = 0 then 'ok'
      when abs(coalesce(act.total_actual, 0) - coalesce(bl.planned_amount, 0))
           > coalesce(bl.planned_amount, 0) * 0.10
      then 'flagged'
      else 'ok'
    end
  from
    (select planned_amount from public.budget_lines
     where cost_center_id = p_cost_center_id and category = p_category and month = p_month) bl
  full outer join
    (select sum(actual_amount) as total_actual from public.actuals
     where cost_center_id = p_cost_center_id and category = p_category and month = p_month) act
  on true
  on conflict (cost_center_id, category, month) do update set
    planned_amount = excluded.planned_amount,
    actual_amount = excluded.actual_amount,
    status = case
      when variances.status in ('explained', 'accepted') then variances.status
      else excluded.status
    end,
    updated_at = now();
$$;

-- Generate budget_lines + actuals from active fixed_costs for a given month
create or replace function public.generate_fixed_costs(p_month date)
returns void language plpgsql as $$
declare
  fc record;
begin
  for fc in
    select * from public.fixed_costs
    where start_date <= p_month
      and (end_date is null or end_date >= p_month)
  loop
    -- Upsert into budget_lines (accumulates if multiple fixed costs share category)
    insert into public.budget_lines (cost_center_id, category, month, planned_amount, currency, notes)
    values (fc.cost_center_id, fc.category, p_month, fc.amount, fc.currency, 'Auto: ' || fc.name)
    on conflict (cost_center_id, category, month)
    do update set
      planned_amount = budget_lines.planned_amount + excluded.planned_amount,
      notes = budget_lines.notes || '; ' || excluded.notes;

    -- Insert into actuals (one row per fixed cost)
    insert into public.actuals (cost_center_id, category, month, actual_amount, currency, source, source_ref, description)
    values (fc.cost_center_id, fc.category, p_month, fc.amount, fc.currency, 'fixed_cost', fc.id::text, fc.name);

    -- Recompute variance for this cell
    perform public.recompute_variance(fc.cost_center_id, fc.category, p_month);
  end loop;
end;
$$;
