-- Etapa 8 (reproducibilidad): RPCs atómicas usadas por Server Actions para
-- crear/renombrar/archivar una propuesta y registrar el evento
-- correspondiente en la misma transacción. Existen en remoto desde el inicio
-- del proyecto (dependen de generate_proposal_number, 20260718000004) pero
-- nunca quedaron versionadas.

create or replace function public.create_draft_proposal(
  p_client_id uuid,
  p_title character varying,
  p_proposal_type character varying,
  p_currency character varying,
  p_primary_objective character varying
)
returns table(id uuid, proposal_number character varying)
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_number varchar;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.clients c where c.id = p_client_id and c.user_id = v_user_id) then
    raise exception 'Cliente no encontrado o sin acceso' using errcode = '42501';
  end if;

  v_number := public.generate_proposal_number();

  insert into public.proposals (user_id, client_id, title, proposal_type, currency, primary_objective, proposal_number)
  values (v_user_id, p_client_id, p_title, p_proposal_type, p_currency, p_primary_objective, v_number)
  returning proposals.id into v_id;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (v_id, v_user_id, 'created', jsonb_build_object('source', 'quick_create'));

  return query select v_id, v_number;
end;
$function$;

create or replace function public.update_proposal_meta(p_id uuid, p_title character varying)
returns table(id uuid)
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  update public.proposals
  set title = p_title
  where proposals.id = p_id and proposals.user_id = v_user_id
  returning proposals.id into v_id;

  if v_id is null then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (v_id, v_user_id, 'updated', jsonb_build_object('field', 'title'));

  return query select v_id;
end;
$function$;

create or replace function public.archive_proposal(p_id uuid)
returns table(id uuid)
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  update public.proposals
  set status = 'archived'
  where proposals.id = p_id and proposals.user_id = v_user_id
  returning proposals.id into v_id;

  if v_id is null then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (v_id, v_user_id, 'status_changed', jsonb_build_object('status', 'archived'));

  return query select v_id;
end;
$function$;

revoke execute on function public.create_draft_proposal(uuid, character varying, character varying, character varying, character varying) from public;
grant execute on function public.create_draft_proposal(uuid, character varying, character varying, character varying, character varying) to authenticated;

revoke execute on function public.update_proposal_meta(uuid, character varying) from public;
grant execute on function public.update_proposal_meta(uuid, character varying) to authenticated;

revoke execute on function public.archive_proposal(uuid) from public;
grant execute on function public.archive_proposal(uuid) to authenticated;
