create table if not exists public.proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event_type varchar not null check (
    event_type in ('created', 'updated', 'exported', 'viewed', 'status_changed', 'shared')
  ),
  payload jsonb not null default '{}',
  ip_address varchar,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists proposal_events_proposal_id_idx on public.proposal_events (proposal_id);
create index if not exists proposal_events_user_id_idx on public.proposal_events (user_id);
