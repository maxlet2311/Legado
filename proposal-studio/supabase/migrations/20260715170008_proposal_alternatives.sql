create table if not exists public.proposal_alternatives (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title varchar not null,
  category varchar not null check (
    category in ('protection', 'savings', 'life_with_savings', 'retirement', 'business')
  ),
  quotation_number varchar,
  insurance_company varchar not null,
  product_name varchar not null,
  currency varchar not null check (currency in ('ARS', 'USD', 'EUR')),
  monthly_premium numeric(12, 2),
  annual_premium numeric(12, 2),
  insured_amount numeric(12, 2),
  is_recommended boolean not null default false,
  recommended_reason text,
  financial_details jsonb not null default '{}',
  description text,
  highlight_label varchar,
  is_visible boolean not null default true,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_alternatives_proposal_id_idx on public.proposal_alternatives (proposal_id);
create index if not exists proposal_alternatives_user_id_idx on public.proposal_alternatives (user_id);
create index if not exists proposal_alternatives_proposal_id_display_order_idx
  on public.proposal_alternatives (proposal_id, display_order);

create trigger set_proposal_alternatives_updated_at
  before update on public.proposal_alternatives
  for each row execute function public.set_updated_at();
