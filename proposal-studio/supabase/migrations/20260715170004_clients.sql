create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  full_name varchar not null,
  company_name varchar,
  client_type varchar not null check (client_type in ('individual', 'company')),
  email varchar not null,
  phone varchar,
  birth_date date,
  occupation varchar,
  notes text,
  external_reference varchar,
  status varchar not null default 'active' check (status in ('active', 'inactive')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients (user_id);
create index if not exists clients_external_reference_idx on public.clients (external_reference);
create index if not exists clients_user_id_full_name_idx on public.clients (user_id, full_name);

create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();
