-- finalize_proposal (20260721010000_harden_proposals_state_writes.sql) lee
-- proposal_narratives sin bloquear la fila. Si el asesor tipea en el paso de
-- diagnóstico/recomendación y navega rápido al resumen, el autosave con
-- debounce (2s, use-autosave.ts) puede seguir en vuelo -- su propia
-- transacción en upsert_proposal_narrative sí toma `for update` sobre esa
-- fila -- mientras finalize_proposal ya está corriendo. Sin lock, finalize
-- puede leer el valor previo a esa escritura (o rechazar con "Falta
-- completar..." aunque el texto ya se haya tipeado) en vez de esperar a que
-- el autosave en curso termine de commitear.
--
-- Solución mínima a nivel DB (no depende de que el frontend dispare saveNow
-- a tiempo, que no es garantizable desde el paso Resumen: para cuando se
-- monta, el hook de autosave del paso anterior ya se desmontó): finalize_proposal
-- toma el mismo `for update` sobre proposal_narratives, serializando contra
-- cualquier upsert_proposal_narrative en vuelo para la misma propuesta.
--
-- De paso, se agrega idempotencia: un doble-click antes de que el primer
-- request deshabilite el botón dispara dos llamadas a finalize_proposal; sin
-- corte temprano, cada una re-inserta un evento 'status_changed' duplicado en
-- el log de auditoría.
create or replace function public.finalize_proposal(p_id uuid)
returns table (id uuid, status varchar)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal record;
  v_narrative record;
  v_alternatives_count integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select * into v_proposal from public.proposals p
  where p.id = p_id and p.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  if v_proposal.status = 'completed' then
    return query select v_proposal.id, v_proposal.status;
    return;
  end if;

  if not v_proposal.duplication_reviewed then
    raise exception 'Revisá los datos heredados de la duplicación antes de emitir' using errcode = 'P0001';
  end if;

  if v_proposal.title is null or length(trim(v_proposal.title)) = 0 then
    raise exception 'Falta el título de la propuesta' using errcode = 'P0001';
  end if;

  select * into v_narrative from public.proposal_narratives n
  where n.proposal_id = p_id
  for update;

  if not found
     or coalesce(length(trim(v_narrative.current_situation)), 0) = 0
     or coalesce(length(trim(v_narrative.recommended_strategy)), 0) = 0 then
    raise exception 'Falta completar el diagnóstico o la recomendación' using errcode = 'P0001';
  end if;

  select count(*) into v_alternatives_count
  from public.proposal_alternatives a
  where a.proposal_id = p_id;

  if v_alternatives_count = 0 then
    raise exception 'La propuesta necesita al menos una alternativa' using errcode = 'P0001';
  end if;

  update public.proposals
  set status = 'completed'
  where proposals.id = p_id
  returning proposals.id, proposals.status into v_proposal;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_id, v_user_id, 'status_changed', jsonb_build_object('status', 'completed'));

  return query select v_proposal.id, v_proposal.status;
end;
$$;

revoke execute on function public.finalize_proposal(uuid) from public;
grant execute on function public.finalize_proposal(uuid) to authenticated;
