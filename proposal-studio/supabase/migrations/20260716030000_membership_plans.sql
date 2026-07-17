-- Etapa 3: fuente de verdad para planes de membresía. Independiente de
-- cualquier proveedor de pagos (Mercado Pago llega en la Etapa 4): `provider`
-- y `provider_plan_id` quedan nullable para representar, más adelante, el
-- plan equivalente del lado del proveedor.

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code varchar not null,
  name varchar not null,
  description text,
  price numeric(12, 2) not null default 0,
  currency varchar not null default 'ARS',
  billing_interval varchar not null check (billing_interval in ('month', 'year')),
  billing_interval_count integer not null default 1 check (billing_interval_count > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  features jsonb not null default '{}'::jsonb,
  provider varchar,
  provider_plan_id varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_plans_code_normalized check (code = lower(code) and code ~ '^[a-z0-9_-]+$'),
  constraint membership_plans_currency_normalized check (currency = upper(currency) and length(currency) = 3),
  constraint membership_plans_price_non_negative check (price >= 0)
);

comment on table public.membership_plans is
  'Fuente de verdad de planes de membresía. No borrar planes con membresías históricas (bloqueado por FK memberships.plan_id sin ON DELETE CASCADE) — desactivar con is_active en su lugar.';

create unique index membership_plans_code_idx on public.membership_plans (code);

-- Único por (provider, provider_plan_id) solo cuando ambos existen: distintos
-- planes locales sin proveedor asignado todavía no deben chocar entre sí.
create unique index membership_plans_provider_plan_idx
  on public.membership_plans (provider, provider_plan_id)
  where provider is not null and provider_plan_id is not null;

create index membership_plans_is_active_idx on public.membership_plans (is_active);

create trigger set_membership_plans_updated_at
  before update on public.membership_plans
  for each row execute function public.set_updated_at();
