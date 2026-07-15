create table if not exists public.proposal_templates (
  id uuid primary key default gen_random_uuid(),
  title varchar not null,
  description text,
  proposal_type varchar not null check (proposal_type in ('individual', 'corporate')),
  preview_image text,
  template_json jsonb not null,
  category varchar not null check (category in ('family', 'savings', 'retirement', 'business')),
  is_system boolean not null default false,
  user_id uuid references public.profiles (id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_templates_user_id_idx on public.proposal_templates (user_id);

create trigger set_proposal_templates_updated_at
  before update on public.proposal_templates
  for each row execute function public.set_updated_at();
