create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category varchar not null check (
    category in ('executive_summary', 'strategy', 'benefit', 'CTA', 'legal_note', 'proposal_section')
  ),
  title varchar not null,
  content text not null,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_items_user_id_idx on public.library_items (user_id);

create trigger set_library_items_updated_at
  before update on public.library_items
  for each row execute function public.set_updated_at();
