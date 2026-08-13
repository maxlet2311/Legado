-- executive_summary y final_message ya existen en proposal_narratives desde
-- 20260715170006, pero upsert_proposal_narrative nunca los escribía: la UI del
-- wizard nunca los capturaba y por lo tanto quedaban NULL para siempre,
-- forzando el fallback hardcodeado en AdvisorSection. Este cambio solo toca
-- la función RPC (no hace falta ALTER TABLE, las columnas ya están).
drop function if exists public.upsert_proposal_narrative(uuid, text, text, text, text, text, text, integer);

create or replace function public.upsert_proposal_narrative(
  p_proposal_id uuid,
  p_current_situation text,
  p_detected_needs text,
  p_objectives text,
  p_detected_risks text,
  p_opportunities text,
  p_recommended_strategy text,
  p_executive_summary text,
  p_final_message text,
  p_expected_revision integer
)
returns table (id uuid, updated_at timestamptz, revision integer)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_updated_at timestamptz;
  v_current_revision integer;
  v_new_revision integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  select n.revision into v_current_revision
  from public.proposal_narratives n
  where n.proposal_id = p_proposal_id
  for update;

  if found and p_expected_revision is not null and v_current_revision != p_expected_revision then
    raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
  end if;

  if found and p_expected_revision is null then
    raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
  end if;

  insert into public.proposal_narratives (
    proposal_id, user_id, current_situation, detected_needs, objectives, detected_risks, opportunities,
    recommended_strategy, executive_summary, final_message
  )
  values (
    p_proposal_id, v_user_id, p_current_situation, p_detected_needs, p_objectives, p_detected_risks, p_opportunities,
    p_recommended_strategy, p_executive_summary, p_final_message
  )
  on conflict (proposal_id) do update
  set current_situation = excluded.current_situation,
      detected_needs = excluded.detected_needs,
      objectives = excluded.objectives,
      detected_risks = excluded.detected_risks,
      opportunities = excluded.opportunities,
      recommended_strategy = excluded.recommended_strategy,
      executive_summary = excluded.executive_summary,
      final_message = excluded.final_message
  returning proposal_narratives.id, proposal_narratives.updated_at, proposal_narratives.revision into v_id, v_updated_at, v_new_revision;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'narrative'));

  return query select v_id, v_updated_at, v_new_revision;
end;
$$;

revoke execute on function public.upsert_proposal_narrative(uuid, text, text, text, text, text, text, text, text, integer) from public;
revoke execute on function public.upsert_proposal_narrative(uuid, text, text, text, text, text, text, text, text, integer) from anon;
grant execute on function public.upsert_proposal_narrative(uuid, text, text, text, text, text, text, text, text, integer) to authenticated;
