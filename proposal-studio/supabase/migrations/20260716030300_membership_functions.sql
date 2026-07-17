-- Etapa 3: operaciones atómicas sobre memberships + membership_status_history.
--
-- Todas están `security definer` con `search_path` fijo, ejecución revocada
-- de `public`/`anon`/`authenticated` y otorgada únicamente a `service_role`
-- (excepto `has_active_membership`, pensada para `authenticated` — ver más
-- abajo). Nunca se invocan desde el navegador: `src/lib/memberships/` las
-- llama server-side con el cliente de service role.
--
-- La validación de qué transiciones de estado son válidas
-- (`canTransitionMembershipStatus`) vive en TypeScript
-- (`src/lib/memberships/access.ts`) y se ejecuta antes de invocar
-- `transition_membership_status`. Esta función no repite esa matriz — sería
-- lógica duplicada con el mismo riesgo de desincronización que
-- `access_status` — pero sí impone su propia guardia atómica:
-- `where status = p_expected_current_status`, que es la que realmente
-- importa a nivel de base de datos (evita la carrera de dos transiciones
-- concurrentes pisándose), independientemente de si el llamador validó bien
-- la matriz.

-- Crea una membresía y su fila inicial de historial (previous_status null)
-- en una única transacción. Usada tanto para `pending` (contratación
-- iniciada, ej. futura Etapa 4) como para `authorized` (autorización manual
-- de prueba, Etapa 3, ver acción administrativa en
-- `src/app/api/admin/memberships/route.ts`).
create or replace function public.create_membership(
  p_email varchar,
  p_plan_id uuid,
  p_status varchar,
  p_source varchar,
  p_user_id uuid default null,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_actor_user_id uuid default null,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.memberships
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_membership public.memberships;
begin
  insert into public.memberships (
    user_id, email, plan_id, status, current_period_start, current_period_end, activated_at, metadata
  ) values (
    p_user_id,
    lower(p_email),
    p_plan_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    case when p_status in ('authorized', 'active') then now() else null end,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_membership;

  insert into public.membership_status_history (
    membership_id, previous_status, new_status, reason, source, actor_user_id, metadata
  ) values (
    v_membership.id, null, p_status, p_reason, p_source, p_actor_user_id, coalesce(p_metadata, '{}'::jsonb)
  );

  return v_membership;
end;
$function$;

revoke all on function public.create_membership(
  varchar, uuid, varchar, varchar, uuid, timestamptz, timestamptz, uuid, text, jsonb
) from public, anon, authenticated;
grant execute on function public.create_membership(
  varchar, uuid, varchar, varchar, uuid, timestamptz, timestamptz, uuid, text, jsonb
) to service_role;

-- Transiciona el estado de una membresía existente y registra el historial
-- en una única transacción. `p_expected_current_status` es una guardia de
-- concurrencia optimista (mismo patrón que `PS409` en
-- `emit_proposal_version`/autosave): si la membresía ya no está en ese
-- estado (otra transición ganó la carrera), no actualiza nada y falla
-- explícito en vez de pisar un cambio concurrente.
create or replace function public.transition_membership_status(
  p_membership_id uuid,
  p_expected_current_status varchar,
  p_new_status varchar,
  p_source varchar,
  p_reason text default null,
  p_actor_user_id uuid default null,
  p_external_event_id varchar default null,
  p_metadata jsonb default '{}'::jsonb,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_grace_period_end timestamptz default null,
  p_provider_status varchar default null,
  p_last_payment_at timestamptz default null,
  p_canceled_at timestamptz default null,
  p_activated_at timestamptz default null,
  p_suspended_at timestamptz default null,
  p_cancel_at_period_end boolean default null
)
returns public.memberships
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_membership public.memberships;
begin
  update public.memberships
  set
    status = p_new_status,
    current_period_start = coalesce(p_current_period_start, current_period_start),
    current_period_end = coalesce(p_current_period_end, current_period_end),
    grace_period_end = coalesce(p_grace_period_end, grace_period_end),
    provider_status = coalesce(p_provider_status, provider_status),
    last_payment_at = coalesce(p_last_payment_at, last_payment_at),
    canceled_at = coalesce(p_canceled_at, canceled_at),
    activated_at = coalesce(p_activated_at, activated_at),
    suspended_at = coalesce(p_suspended_at, suspended_at),
    cancel_at_period_end = coalesce(p_cancel_at_period_end, cancel_at_period_end),
    metadata = coalesce(memberships.metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_membership_id
    and status = p_expected_current_status
  returning * into v_membership;

  if not found then
    raise exception
      'La membresía % no está en el estado esperado % (carrera concurrente o transición inválida).',
      p_membership_id, p_expected_current_status
      using errcode = 'PS409';
  end if;

  insert into public.membership_status_history (
    membership_id, previous_status, new_status, reason, source, actor_user_id, external_event_id, metadata
  ) values (
    v_membership.id, p_expected_current_status, p_new_status, p_reason, p_source,
    p_actor_user_id, p_external_event_id, coalesce(p_metadata, '{}'::jsonb)
  );

  return v_membership;
end;
$function$;

revoke all on function public.transition_membership_status(
  uuid, varchar, varchar, varchar, text, uuid, varchar, jsonb,
  timestamptz, timestamptz, timestamptz, varchar, timestamptz, timestamptz, timestamptz, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.transition_membership_status(
  uuid, varchar, varchar, varchar, text, uuid, varchar, jsonb,
  timestamptz, timestamptz, timestamptz, varchar, timestamptz, timestamptz, timestamptz, timestamptz, boolean
) to service_role;

-- Vincula una membresía a un usuario ya activado. Las tres condiciones de
-- seguridad (perfil existente, email coincidente, estado habilitado para
-- activación) se evalúan dentro de la misma sentencia atómica — no hay
-- ventana entre "chequear" y "actualizar" en la que otro proceso pueda
-- cambiar el estado por debajo. `user_id is null or user_id = p_user_id`
-- permite reintentos idempotentes del mismo usuario sin fallar.
create or replace function public.link_membership_to_user(
  p_membership_id uuid,
  p_user_id uuid,
  p_email varchar,
  p_source varchar default 'activation',
  p_actor_user_id uuid default null
)
returns public.memberships
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_membership public.memberships;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'No existe un perfil para el usuario %.', p_user_id using errcode = 'P0002';
  end if;

  update public.memberships
  set user_id = p_user_id, updated_at = now()
  where id = p_membership_id
    and email = lower(p_email)
    and status in ('authorized', 'active')
    and (user_id is null or user_id = p_user_id)
  returning * into v_membership;

  if not found then
    raise exception
      'La membresía % no está disponible para vincularse (estado inválido, email no coincide, o ya vinculada a otro usuario).',
      p_membership_id
      using errcode = 'P0001';
  end if;

  insert into public.membership_status_history (
    membership_id, previous_status, new_status, reason, source, actor_user_id, metadata
  ) values (
    v_membership.id, v_membership.status, v_membership.status,
    'Membresía vinculada al usuario activado.', p_source, p_actor_user_id, '{}'::jsonb
  );

  return v_membership;
end;
$function$;

revoke all on function public.link_membership_to_user(uuid, uuid, varchar, varchar, uuid) from public, anon, authenticated;
grant execute on function public.link_membership_to_user(uuid, uuid, varchar, varchar, uuid) to service_role;

-- Helper de acceso preparado para RLS futura (Etapa 4+): NO se usa todavía
-- para bloquear ninguna ruta ni policy. Ignora cualquier intento de
-- consultar la membresía de otro usuario: solo devuelve un resultado
-- significativo cuando `p_user_id = auth.uid()`, cualquier otro valor
-- devuelve `false` sin filtrar información. Espejo simplificado de
-- `evaluateMembershipAccess` (TS) — ver esa función para la versión
-- completa con razones detalladas; esta solo necesita el booleano.
create or replace function public.has_active_membership(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = p_user_id
      and auth.uid() = p_user_id
      and (
        (m.status in ('active', 'authorized') and (m.current_period_end is null or m.current_period_end > now()))
        or (m.status in ('past_due', 'grace_period') and m.grace_period_end is not null and m.grace_period_end > now())
      )
  );
$function$;

revoke all on function public.has_active_membership(uuid) from public, anon;
grant execute on function public.has_active_membership(uuid) to authenticated;
