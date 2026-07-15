create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  version_number integer not null,
  content_json jsonb not null,
  render_json jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists proposal_versions_proposal_id_idx on public.proposal_versions (proposal_id);
create index if not exists proposal_versions_user_id_idx on public.proposal_versions (user_id);
