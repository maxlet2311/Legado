create table if not exists public.proposal_sections (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  section_type varchar not null check (
    section_type in (
      'cover', 'executive_summary', 'diagnosis', 'strategy', 'alternatives',
      'comparison', 'benefits', 'legal_notes', 'call_to_action', 'custom'
    )
  ),
  title varchar not null,
  custom_content text,
  display_order integer not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_sections_proposal_id_idx on public.proposal_sections (proposal_id);
create index if not exists proposal_sections_user_id_idx on public.proposal_sections (user_id);
create index if not exists proposal_sections_proposal_id_display_order_idx
  on public.proposal_sections (proposal_id, display_order);

create trigger set_proposal_sections_updated_at
  before update on public.proposal_sections
  for each row execute function public.set_updated_at();
