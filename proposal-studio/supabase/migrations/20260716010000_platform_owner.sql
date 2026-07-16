-- Platform owner: separa el rol operativo (`role`) de la propiedad máxima de
-- la plataforma (`is_platform_owner`). Ver docs/AUTH_AND_ROLES.md.

alter table public.profiles
  add column if not exists is_platform_owner boolean not null default false;

comment on column public.profiles.is_platform_owner is
  'Propiedad máxima de la plataforma (no es un rol operativo). Como máximo una fila puede tener valor true (ver profiles_single_platform_owner_idx). Nunca debe poder asignarse desde raw_user_meta_data ni desde una actualización de perfil hecha por el propio usuario — solo vía migración/SQL administrativo o el procedimiento de transferencia documentado.';

-- Defensa en profundidad: si en algún momento anterior a esta migración ya
-- existiera más de un owner (no debería, la columna se acaba de crear con
-- default false), frenamos acá en vez de aplicar un índice único que fallaría
-- de forma menos clara más abajo.
do $$
declare
  v_existing_owners int;
begin
  select count(*) into v_existing_owners
  from public.profiles
  where is_platform_owner = true;

  if v_existing_owners > 1 then
    raise exception
      'Se detectaron % perfiles con is_platform_owner = true antes de asignar el owner. Revisar manualmente antes de continuar.',
      v_existing_owners;
  end if;
end;
$$;

-- Asignación del propietario de la plataforma. Falla explícito si el perfil
-- no existe, para no dejar la migración a medio aplicar.
do $$
begin
  update public.profiles
  set
    role = 'admin',
    is_platform_owner = true,
    is_active = true,
    updated_at = now()
  where user_id = '98a388bb-5385-42e2-98d5-9db0b716af82';

  if not found then
    raise exception
      'Platform owner profile not found for user_id %',
      '98a388bb-5385-42e2-98d5-9db0b716af82';
  end if;
end;
$$;

-- Regla de único owner: a lo sumo una fila con is_platform_owner = true.
-- Índice parcial (no indexa las filas false, que son la mayoría) — no es un
-- índice de performance, es la restricción de unicidad en sí misma.
create unique index if not exists profiles_single_platform_owner_idx
  on public.profiles (is_platform_owner)
  where is_platform_owner = true;

-- Alta de usuarios nuevos: valores operativos explícitos, nunca tomados de
-- raw_user_meta_data salvo full_name. is_platform_owner siempre nace en
-- false — la propiedad de la plataforma no puede autoasignarse ni venir de
-- metadata controlada por el cliente durante el signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  insert into public.profiles (id, user_id, full_name, role, is_active, is_platform_owner)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'advisor',
    true,
    false
  );
  return new;
end;
$function$;

-- Prevención de escalada de privilegios: un usuario ya NO puede actualizar su
-- propia fila de `profiles` vía la API de tabla directa (esto incluía, sin
-- restricción de columnas, `role`, `is_active`, `is_platform_owner` y
-- `user_id`). RLS no puede acotar columnas dentro de una misma policy de
-- UPDATE de forma simple, así que en vez de eso: se revoca el acceso amplio y
-- se deja preparada una RPC estrecha para cuando exista edición de perfil
-- desde el frontend (hoy no existe ningún `.update()` sobre `profiles` en la
-- app: no se pierde funcionalidad).
drop policy if exists profiles_update_own on public.profiles;

-- RPC de autoservicio: únicamente permite tocar `full_name`. Nunca expone
-- `role`, `is_active`, `is_platform_owner` ni `user_id` como parámetros.
create or replace function public.update_own_profile(p_full_name varchar)
returns public.profiles
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  update public.profiles
  set full_name = p_full_name, updated_at = now()
  where id = auth.uid()
  returning * into v_profile;

  if not found then
    raise exception 'Perfil no encontrado.' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$function$;

revoke all on function public.update_own_profile(varchar) from public, anon;
grant execute on function public.update_own_profile(varchar) to authenticated;
