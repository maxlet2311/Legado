create table if not exists public.proposal_benefits (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title varchar not null,
  description text not null,
  icon varchar not null,
  category varchar not null check (
    category in ('family', 'retirement', 'tax', 'business', 'legal', 'financial', 'health', 'succession')
  ),
  display_order integer not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_benefits_proposal_id_idx on public.proposal_benefits (proposal_id);
create index if not exists proposal_benefits_user_id_idx on public.proposal_benefits (user_id);
create index if not exists proposal_benefits_proposal_id_display_order_idx
  on public.proposal_benefits (proposal_id, display_order);

create trigger set_proposal_benefits_updated_at
  before update on public.proposal_benefits
  for each row execute function public.set_updated_at();
