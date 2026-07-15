create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  brand_id uuid references public.brands (id) on delete set null,
  proposal_number varchar not null unique,
  title varchar not null,
  primary_objective varchar not null check (
    primary_objective in (
      'protect_family', 'build_savings', 'retirement', 'business_protection',
      'partners_protection', 'employee_retention', 'custom'
    )
  ),
  proposal_type varchar not null check (proposal_type in ('individual', 'corporate')),
  currency varchar not null check (currency in ('ARS', 'USD', 'EUR')),
  status varchar not null default 'draft' check (status in ('draft', 'completed', 'exported', 'archived')),
  version integer not null default 1,
  last_opened_at timestamptz not null default now(),
  last_exported_at timestamptz,
  expires_at timestamptz,
  share_token uuid not null unique default gen_random_uuid(),
  orientation varchar not null default 'portrait' check (orientation in ('portrait', 'landscape')),
  theme varchar not null default 'classic' check (theme in ('classic', 'modern', 'minimalist')),
  font_family varchar not null default 'Inter' check (font_family in ('Inter', 'Outfit', 'SF Pro')),
  pdf_format varchar not null default 'A4' check (pdf_format in ('A4', 'Letter')),
  margin_size varchar not null default 'medium' check (margin_size in ('small', 'medium', 'large')),
  show_cover boolean not null default true,
  show_summary boolean not null default true,
  show_footer boolean not null default true,
  show_page_numbers boolean not null default true,
  show_legal_note boolean not null default true,
  show_watermark boolean not null default false,
  watermark_text varchar,
  primary_color_override varchar,
  secondary_color_override varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_user_id_idx on public.proposals (user_id);
create index if not exists proposals_client_id_idx on public.proposals (client_id);
create index if not exists proposals_brand_id_idx on public.proposals (brand_id);
create index if not exists proposals_user_id_status_idx on public.proposals (user_id, status);

create trigger set_proposals_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();
