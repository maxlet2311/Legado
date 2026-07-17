-- Etapa 4: `create_membership` necesita poder guardar, en la misma
-- transacción de creación, los campos de proveedor de pago
-- (`provider`, `provider_customer_id`, `provider_subscription_id`,
-- `provider_status`) que hasta ahora quedaban siempre en null (Etapa 3 solo
-- creaba membresías `pending`/`authorized` sin proveedor real).
--
-- También acepta un `p_id` explícito (opcional): el checkout de Mercado Pago
-- (`src/lib/payments/checkout.ts`) necesita conocer el id de la membresía
-- *antes* de crear la suscripción en Mercado Pago, para poder enviarlo como
-- `external_reference` en esa misma llamada — de lo contrario habría que
-- crear la membresía primero y luego actualizarla con los datos del
-- proveedor en un segundo paso, sin una transición de estado real de por
-- medio (no encaja en `transition_membership_status`, pensada para cambios
-- de `status`). Cuando `p_id` es null (todos los llamadores de la Etapa 3),
-- se comporta exactamente igual que antes (`gen_random_uuid()` por default
-- de la tabla).
--
-- Se sigue la
-- convención del proyecto de nunca editar una migración ya escrita: esto
-- reemplaza la función completa (mismo nombre) agregando los parámetros
-- nuevos al final, todos con default null para no romper los call sites
-- existentes de la Etapa 3.
--
-- Postgres trata una lista de parámetros distinta como un overload nuevo, no
-- un reemplazo: se dropea explícitamente la firma vieja de 10 parámetros para
-- que solo exista una versión de la función (evita ambigüedad si algún
-- llamador invoca con un subconjunto de argumentos nombrados).

drop function if exists public.create_membership(
  varchar, uuid, varchar, varchar, uuid, timestamptz, timestamptz, uuid, text, jsonb
);

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
  p_metadata jsonb default '{}'::jsonb,
  p_provider varchar default null,
  p_provider_customer_id varchar default null,
  p_provider_subscription_id varchar default null,
  p_provider_status varchar default null,
  p_id uuid default null
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
    id, user_id, email, plan_id, status, current_period_start, current_period_end, activated_at, metadata,
    provider, provider_customer_id, provider_subscription_id, provider_status
  ) values (
    coalesce(p_id, gen_random_uuid()),
    p_user_id,
    lower(p_email),
    p_plan_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    case when p_status in ('authorized', 'active') then now() else null end,
    coalesce(p_metadata, '{}'::jsonb),
    p_provider,
    p_provider_customer_id,
    p_provider_subscription_id,
    p_provider_status
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
  varchar, uuid, varchar, varchar, uuid, timestamptz, timestamptz, uuid, text, jsonb,
  varchar, varchar, varchar, varchar, uuid
) from public, anon, authenticated;
grant execute on function public.create_membership(
  varchar, uuid, varchar, varchar, uuid, timestamptz, timestamptz, uuid, text, jsonb,
  varchar, varchar, varchar, varchar, uuid
) to service_role;
