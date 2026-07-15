create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  commercial_name varchar not null,
  advisor_name varchar not null,
  license_number varchar,
  logo_url text,
  primary_color varchar not null default '#596B4D',
  secondary_color varchar not null default '#F6F2E9',
  accent_color varchar not null default '#C49752',
  email varchar not null,
  phone varchar,
  whatsapp varchar,
  website varchar,
  address text,
  footer_text text,
  signature_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brands_user_id_idx on public.brands (user_id);

create trigger set_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();
