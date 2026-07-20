-- Hardening de cierre de Sprint 2: `proposals_all_own` (FOR ALL) dejaba UPDATE
-- directo abierto a cualquier columna, incluidas las de estado (`status`,
-- `duplication_reviewed`) que ya tienen su propia regla de negocio en RPCs
-- (`finalize_proposal`, `mark_duplication_reviewed`, `archive_proposal`). Un
-- cliente autenticado podía hacer
--   supabase.from('proposals').update({ status: 'completed' }).eq('id', ...)
-- y saltarse esas reglas por completo.
--
-- Único UPDATE directo real en el código de la app (duplicateProposalAction)
-- escribía duplicated_from_id/duplication_reviewed después de crear el
-- borrador; se resuelve moviendo esa marca a create_draft_proposal (atómico
-- con la creación) en vez de mantenerla como excepción a la regla.
--
-- Solución: se retira la policy de UPDATE general y las escrituras de
-- proposals pasan a depender exclusivamente de RPCs `security definer` que ya
-- reimplementan la misma condición de ownership (`user_id = auth.uid()`)
-- puertas adentro, con search_path fijo (patrón ya usado en
-- membership_functions). SELECT/INSERT/DELETE por ownership se preservan tal
-- cual estaban.

-- 1. Reemplazo de la policy FOR ALL por policies separadas sin UPDATE directo.
drop policy if exists "proposals_all_own" on public.proposals;

create policy "proposals_select_own" on public.proposals
  for select to authenticated using (user_id = (select auth.uid()));

create policy "proposals_insert_own" on public.proposals
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "proposals_delete_own" on public.proposals
  for delete to authenticated using (user_id = (select auth.uid()));

-- 2. create_draft_proposal: agrega p_duplicated_from_id opcional para que la
--    duplicación nazca ya marcada (atómico), eliminando el UPDATE directo que
--    hacía duplicateProposalAction desde el cliente.
drop function if exists public.create_draft_proposal(uuid, character varying, character varying, character varying, character varying);

create or replace function public.create_draft_proposal(
  p_client_id uuid,
  p_title character varying,
  p_proposal_type character varying,
  p_currency character varying,
  p_primary_objective character varying,
  p_duplicated_from_id uuid default null
)
returns table(id uuid, proposal_number character varying)
language plpgsql
security definer
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

  if p_duplicated_from_id is not null
     and not exists (select 1 from public.proposals p where p.id = p_duplicated_from_id and p.user_id = v_user_id) then
    raise exception 'Propuesta de origen no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  v_number := public.generate_proposal_number();

  insert into public.proposals (
    user_id, client_id, title, proposal_type, currency, primary_objective, proposal_number,
    duplicated_from_id, duplication_reviewed
  )
  values (
    v_user_id, p_client_id, p_title, p_proposal_type, p_currency, p_primary_objective, v_number,
    p_duplicated_from_id, p_duplicated_from_id is null
  )
  returning proposals.id into v_id;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (
    v_id, v_user_id, 'created',
    case when p_duplicated_from_id is null
      then jsonb_build_object('source', 'quick_create')
      else jsonb_build_object('source', 'duplicate', 'duplicated_from_id', p_duplicated_from_id)
    end
  );

  return query select v_id, v_number;
end;
$function$;

revoke execute on function public.create_draft_proposal(uuid, character varying, character varying, character varying, character varying, uuid) from public;
grant execute on function public.create_draft_proposal(uuid, character varying, character varying, character varying, character varying, uuid) to authenticated;

-- 3. RPCs que hacen UPDATE directo sobre proposals: pasan a security definer
--    (ya validaban ownership adentro; ahora también necesitan bypassear RLS
--    porque ya no existe policy de UPDATE para authenticated).
create or replace function public.update_proposal_details(
  p_id uuid,
  p_client_id uuid,
  p_title varchar,
  p_proposal_type varchar,
  p_primary_objective varchar,
  p_product varchar,
  p_currency varchar,
  p_internal_notes text,
  p_expected_revision integer
)
returns table (id uuid, updated_at timestamptz, revision integer)
language plpgsql
security definer
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

  if not exists (select 1 from public.clients c where c.id = p_client_id and c.user_id = v_user_id) then
    raise exception 'Cliente no encontrado o sin acceso' using errcode = '42501';
  end if;

  select p.revision into v_current_revision
  from public.proposals p
  where p.id = p_id and p.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  if v_current_revision != p_expected_revision then
    raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
  end if;

  update public.proposals
  set client_id = p_client_id,
      title = p_title,
      proposal_type = p_proposal_type,
      primary_objective = p_primary_objective,
      product = p_product,
      currency = p_currency,
      internal_notes = p_internal_notes
  where proposals.id = p_id and proposals.user_id = v_user_id
  returning proposals.id, proposals.updated_at, proposals.revision into v_id, v_updated_at, v_new_revision;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (v_id, v_user_id, 'updated', jsonb_build_object('step', 'info'));

  return query select v_id, v_updated_at, v_new_revision;
end;
$$;

revoke execute on function public.update_proposal_details(uuid, uuid, varchar, varchar, varchar, varchar, varchar, text, integer) from public;
grant execute on function public.update_proposal_details(uuid, uuid, varchar, varchar, varchar, varchar, varchar, text, integer) to authenticated;

create or replace function public.update_proposal_meta(p_id uuid, p_title character varying)
returns table(id uuid)
language plpgsql
security definer
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

revoke execute on function public.update_proposal_meta(uuid, character varying) from public;
grant execute on function public.update_proposal_meta(uuid, character varying) to authenticated;

create or replace function public.archive_proposal(p_id uuid)
returns table(id uuid)
language plpgsql
security definer
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

revoke execute on function public.archive_proposal(uuid) from public;
grant execute on function public.archive_proposal(uuid) to authenticated;

create or replace function public.mark_duplication_reviewed(p_id uuid)
returns table (id uuid, duplication_reviewed boolean)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  update public.proposals
  set duplication_reviewed = true
  where proposals.id = p_id and proposals.user_id = v_user_id
  returning proposals.id into v_id;

  if v_id is null then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (v_id, v_user_id, 'updated', jsonb_build_object('step', 'duplication_review'));

  return query select v_id, true;
end;
$$;

revoke execute on function public.mark_duplication_reviewed(uuid) from public;
grant execute on function public.mark_duplication_reviewed(uuid) to authenticated;

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

  if not v_proposal.duplication_reviewed then
    raise exception 'Revisá los datos heredados de la duplicación antes de emitir' using errcode = 'P0001';
  end if;

  if v_proposal.title is null or length(trim(v_proposal.title)) = 0 then
    raise exception 'Falta el título de la propuesta' using errcode = 'P0001';
  end if;

  select * into v_narrative from public.proposal_narratives n where n.proposal_id = p_id;

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

-- 4. Housekeeping de grants: funciones de solo lectura/edición de tablas
--    dependientes que quedaron sin revoke/grant explícito al crearse
--    (ejecutables por PUBLIC por default de Postgres). No cambian de lógica,
--    solo se cierra el acceso a anon/no-autenticado.
revoke execute on function public.get_live_document_content(uuid) from public;
grant execute on function public.get_live_document_content(uuid) to authenticated;

revoke execute on function public.emit_proposal_version(uuid) from public;
grant execute on function public.emit_proposal_version(uuid) to authenticated;

revoke execute on function public.upsert_proposal_narrative(uuid, text, text, text, text, text, text, integer) from public;
grant execute on function public.upsert_proposal_narrative(uuid, text, text, text, text, text, text, integer) to authenticated;

revoke execute on function public.upsert_proposal_comparison(uuid, jsonb, jsonb, integer) from public;
grant execute on function public.upsert_proposal_comparison(uuid, jsonb, jsonb, integer) to authenticated;

revoke execute on function public.upsert_proposal_alternative(uuid, uuid, varchar, text, varchar, varchar, varchar, varchar, numeric, jsonb, integer, integer) from public;
grant execute on function public.upsert_proposal_alternative(uuid, uuid, varchar, text, varchar, varchar, varchar, varchar, numeric, jsonb, integer, integer) to authenticated;

revoke execute on function public.upsert_proposal_benefit(uuid, uuid, varchar, text, varchar, varchar, integer, integer) from public;
grant execute on function public.upsert_proposal_benefit(uuid, uuid, varchar, text, varchar, varchar, integer, integer) to authenticated;

comment on policy "proposals_select_own" on public.proposals is
  'Ownership por user_id. No hay policy de UPDATE: las transiciones de estado y la edición de metadata pasan exclusivamente por RPCs security definer (update_proposal_details, update_proposal_meta, archive_proposal, finalize_proposal, mark_duplication_reviewed, create_draft_proposal).';
