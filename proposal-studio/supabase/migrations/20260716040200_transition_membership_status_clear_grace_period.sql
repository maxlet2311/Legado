-- Etapa 4: `transition_membership_status` usa `coalesce(p_x, x)` para todos
-- sus campos opcionales, lo que significa que pasar `null` nunca borra un
-- valor existente — sirve para "no tocar este campo", no para "vaciarlo".
-- Eso es un problema real para `grace_period_end`: cuando un pago en mora se
-- regulariza (`past_due` → `active`, Etapa 4 sección 17), hay que poder
-- vaciarlo explícitamente, no solo dejarlo con la fecha vieja. Se agrega un
-- flag explícito `p_clear_grace_period_end` en vez de sobrecargar el
-- significado de `null` para no romper ningún llamador existente de la
-- Etapa 3 (todos siguen pasando `false`/omitiendo el parámetro, mismo
-- comportamiento que antes).

drop function if exists public.transition_membership_status(
  uuid, varchar, varchar, varchar, text, uuid, varchar, jsonb,
  timestamptz, timestamptz, timestamptz, varchar, timestamptz, timestamptz, timestamptz, timestamptz, boolean
);

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
  p_cancel_at_period_end boolean default null,
  p_clear_grace_period_end boolean default false
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
    grace_period_end = case when p_clear_grace_period_end then null else coalesce(p_grace_period_end, grace_period_end) end,
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
  timestamptz, timestamptz, timestamptz, varchar, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.transition_membership_status(
  uuid, varchar, varchar, varchar, text, uuid, varchar, jsonb,
  timestamptz, timestamptz, timestamptz, varchar, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean
) to service_role;
