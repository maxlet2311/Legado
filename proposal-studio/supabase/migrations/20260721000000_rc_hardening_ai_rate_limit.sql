-- RC de Sprint 2: cierra una condición de carrera real en el rate limit de IA.
--
-- Antes: `checkAiRateLimit` (SELECT count) y `recordAiUsage` (INSERT) eran dos
-- round-trips separados desde la Server Action. Dos requests concurrentes del
-- mismo usuario podían pasar el chequeo antes de que cualquiera de las dos
-- registrara su uso (TOCTOU clásico), permitiendo superar el límite de 30/hora
-- por un margen pequeño bajo concurrencia real (doble clic, dos pestañas).
--
-- Se reemplaza por un único RPC atómico: toma un advisory lock transaccional
-- por usuario (serializa solo sus propias llamadas concurrentes, nunca bloquea
-- a otros usuarios), cuenta y reserva el uso en la misma transacción. La
-- Server Action ahora llama a este RPC ANTES de invocar al proveedor de IA
-- (reserva primero, genera después): si el proveedor falla luego, el usuario
-- "pierde" ese cupo de la hora, pero el sistema nunca queda inutilizable
-- (quedan el resto de los cupos) y el gate en sí no puede eludirse por carrera.
create or replace function public.check_and_record_ai_usage(p_proposal_id uuid, p_feature varchar)
returns table (allowed boolean)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select count(*) into v_count
  from public.proposal_events
  where user_id = v_user_id
    and event_type = 'ai_used'
    and created_at >= now() - interval '1 hour';

  if v_count >= 30 then
    return query select false;
    return;
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'ai_used', jsonb_build_object('feature', p_feature));

  return query select true;
end;
$$;

comment on function public.check_and_record_ai_usage(uuid, varchar) is
  'Chequeo + reserva atómica del rate limit de IA (30/hora por usuario). Nunca loguea prompts ni contenido generado, solo {feature}.';
