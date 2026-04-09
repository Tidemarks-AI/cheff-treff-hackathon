-- Companies table
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

-- People table
create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.people enable row level security;

-- Join table: which people work at which companies
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique (company_id, person_id)
);

create index idx_company_members_company_id on public.company_members(company_id);
create index idx_company_members_person_id on public.company_members(person_id);

alter table public.company_members enable row level security;
