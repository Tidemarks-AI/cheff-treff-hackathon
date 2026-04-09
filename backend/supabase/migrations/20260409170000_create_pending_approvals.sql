create table public.pending_approvals (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  tool_name text not null,
  parameters jsonb not null default '{}',
  description text not null default '',
  call_id text not null,
  run_state text not null,
  discord_message_id text,
  discord_channel_id text,
  discord_guild_id text,
  status text not null default 'pending',
  resolved_by text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_pending_approvals_status on public.pending_approvals(status);
create index idx_pending_approvals_discord_message_id on public.pending_approvals(discord_message_id);

alter table public.pending_approvals enable row level security;

create policy "Service role full access to pending_approvals"
  on public.pending_approvals for all to service_role using (true) with check (true);
