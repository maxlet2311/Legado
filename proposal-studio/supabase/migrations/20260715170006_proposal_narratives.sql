create table if not exists public.proposal_narratives (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid unique references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  executive_summary text,
  current_situation text,
  detected_risks text,
  opportunities text,
  objectives text,
  recommended_strategy text,
  expected_result text,
  final_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_narratives_proposal_id_idx on public.proposal_narratives (proposal_id);
create index if not exists proposal_narratives_user_id_idx on public.proposal_narratives (user_id);

create trigger set_proposal_narratives_updated_at
  before update on public.proposal_narratives
  for each row execute function public.set_updated_at();
