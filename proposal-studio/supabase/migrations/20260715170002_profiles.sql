create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name varchar not null,
  role varchar not null default 'advisor' check (role in ('admin', 'advisor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea automáticamente el perfil del asesor al registrarse un usuario en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, user_id, full_name)
  values (new.id, new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
