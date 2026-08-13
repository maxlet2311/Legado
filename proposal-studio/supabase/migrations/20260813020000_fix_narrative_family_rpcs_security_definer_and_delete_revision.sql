-- CORRECCIÓN URGENTE de una regresión introducida por
-- 20260725010000_harden_narrative_family_state_writes.sql: esa migración
-- retiró la policy RLS de UPDATE en proposal_narratives/alternatives/
-- benefits/comparisons asumiendo (según su propio comentario) que los RPCs
-- de upsert/delete/reorder eran `security definer` y por lo tanto no
-- dependían de esa policy. Eso era falso: los seis RPCs corren como
-- `security invoker`, así que su rama de UPDATE (incluido `on conflict do
-- update`) queda sin ninguna policy aplicable desde entonces. Bajo RLS, un
-- comando sin policy aplicable no lanza error: simplemente afecta 0 filas.
-- Resultado: desde que esa migración se aplicó, cualquier edición de una
-- narrativa/alternativa/beneficio/comparación YA EXISTENTE (creación
-- inicial vía INSERT seguía funcionando) se guardaba como "éxito" en la UI
-- pero nunca llegaba a persistirse -- el mismo patrón de "silent data loss"
-- que el commit 7892d21 había cerrado en autosave, reintroducido acá por
-- otra vía.
--
-- Fix: agregar `security definer` a estos RPCs (mismo patrón ya usado en
-- update_proposal_details/finalize_proposal/archive_proposal/etc.), que
-- siguen validando ownership explícitamente adentro (`and user_id =
-- v_user_id` / `and p.user_id = v_user_id`) -- no se relaja ningún control de
-- acceso, solo se resuelve la dependencia rota de RLS. De paso (C4): los
-- deletes de alternativa/beneficio no comprobaban revisión, a diferencia de
-- sus upserts -- se agrega el mismo control de concurrencia optimista.

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

create or replace function public.upsert_proposal_comparison(
  p_proposal_id uuid,
  p_columns jsonb,
  p_rows jsonb,
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

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  select c.revision into v_current_revision
  from public.proposal_comparisons c
  where c.proposal_id = p_proposal_id
  for update;

  if found and (p_expected_revision is null or v_current_revision != p_expected_revision) then
    raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
  end if;

  insert into public.proposal_comparisons (proposal_id, user_id, columns, rows)
  values (p_proposal_id, v_user_id, p_columns, p_rows)
  on conflict (proposal_id) do update
  set columns = excluded.columns,
      rows = excluded.rows
  returning proposal_comparisons.id, proposal_comparisons.updated_at, proposal_comparisons.revision into v_id, v_updated_at, v_new_revision;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'comparison'));

  return query select v_id, v_updated_at, v_new_revision;
end;
$$;

revoke execute on function public.upsert_proposal_comparison(uuid, jsonb, jsonb, integer) from public;
revoke execute on function public.upsert_proposal_comparison(uuid, jsonb, jsonb, integer) from anon;
grant execute on function public.upsert_proposal_comparison(uuid, jsonb, jsonb, integer) to authenticated;

create or replace function public.upsert_proposal_alternative(
  p_id uuid,
  p_proposal_id uuid,
  p_title varchar,
  p_description text,
  p_category varchar,
  p_insurance_company varchar,
  p_product_name varchar,
  p_currency varchar,
  p_monthly_premium numeric,
  p_financial_details jsonb,
  p_display_order integer,
  p_expected_revision integer
)
returns table (id uuid, revision integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_current_revision integer;
  v_new_revision integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  if p_id is null then
    insert into public.proposal_alternatives (
      proposal_id, user_id, title, description, category, insurance_company,
      product_name, currency, monthly_premium, financial_details, display_order
    )
    values (
      p_proposal_id, v_user_id, p_title, p_description, p_category, p_insurance_company,
      p_product_name, p_currency, p_monthly_premium, p_financial_details, p_display_order
    )
    returning proposal_alternatives.id, proposal_alternatives.revision into v_id, v_new_revision;
  else
    select a.revision into v_current_revision
    from public.proposal_alternatives a
    where a.id = p_id and a.proposal_id = p_proposal_id and a.user_id = v_user_id
    for update;

    if not found then
      raise exception 'Alternativa no encontrada o sin acceso' using errcode = 'P0002';
    end if;

    if v_current_revision != p_expected_revision then
      raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
    end if;

    update public.proposal_alternatives
    set title = p_title,
        description = p_description,
        category = p_category,
        insurance_company = p_insurance_company,
        product_name = p_product_name,
        currency = p_currency,
        monthly_premium = p_monthly_premium,
        financial_details = p_financial_details,
        display_order = p_display_order
    where proposal_alternatives.id = p_id
      and proposal_alternatives.proposal_id = p_proposal_id
      and proposal_alternatives.user_id = v_user_id
    returning proposal_alternatives.id, proposal_alternatives.revision into v_id, v_new_revision;
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'alternatives', 'alternative_id', v_id));

  return query select v_id, v_new_revision;
end;
$$;

revoke execute on function public.upsert_proposal_alternative(uuid, uuid, varchar, text, varchar, varchar, varchar, varchar, numeric, jsonb, integer, integer) from public;
revoke execute on function public.upsert_proposal_alternative(uuid, uuid, varchar, text, varchar, varchar, varchar, varchar, numeric, jsonb, integer, integer) from anon;
grant execute on function public.upsert_proposal_alternative(uuid, uuid, varchar, text, varchar, varchar, varchar, varchar, numeric, jsonb, integer, integer) to authenticated;

create or replace function public.upsert_proposal_benefit(
  p_id uuid,
  p_proposal_id uuid,
  p_title varchar,
  p_description text,
  p_icon varchar,
  p_category varchar,
  p_display_order integer,
  p_expected_revision integer
)
returns table (id uuid, revision integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_current_revision integer;
  v_new_revision integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  if p_id is null then
    insert into public.proposal_benefits (proposal_id, user_id, title, description, icon, category, display_order)
    values (p_proposal_id, v_user_id, p_title, p_description, p_icon, p_category, p_display_order)
    returning proposal_benefits.id, proposal_benefits.revision into v_id, v_new_revision;
  else
    select b.revision into v_current_revision
    from public.proposal_benefits b
    where b.id = p_id and b.proposal_id = p_proposal_id and b.user_id = v_user_id
    for update;

    if not found then
      raise exception 'Beneficio no encontrado o sin acceso' using errcode = 'P0002';
    end if;

    if v_current_revision != p_expected_revision then
      raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
    end if;

    update public.proposal_benefits
    set title = p_title,
        description = p_description,
        icon = p_icon,
        category = p_category,
        display_order = p_display_order
    where proposal_benefits.id = p_id
      and proposal_benefits.proposal_id = p_proposal_id
      and proposal_benefits.user_id = v_user_id
    returning proposal_benefits.id, proposal_benefits.revision into v_id, v_new_revision;
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'benefits', 'benefit_id', v_id));

  return query select v_id, v_new_revision;
end;
$$;

revoke execute on function public.upsert_proposal_benefit(uuid, uuid, varchar, text, varchar, varchar, integer, integer) from public;
revoke execute on function public.upsert_proposal_benefit(uuid, uuid, varchar, text, varchar, varchar, integer, integer) from anon;
grant execute on function public.upsert_proposal_benefit(uuid, uuid, varchar, text, varchar, varchar, integer, integer) to authenticated;

create or replace function public.reorder_proposal_alternatives(p_proposal_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  update public.proposal_alternatives a
  set display_order = ord.position
  from unnest(p_ordered_ids) with ordinality as ord(alternative_id, position)
  where a.id = ord.alternative_id
    and a.proposal_id = p_proposal_id
    and a.user_id = v_user_id;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'alternatives', 'action', 'reorder'));
end;
$$;

revoke execute on function public.reorder_proposal_alternatives(uuid, uuid[]) from public;
revoke execute on function public.reorder_proposal_alternatives(uuid, uuid[]) from anon;
grant execute on function public.reorder_proposal_alternatives(uuid, uuid[]) to authenticated;

create or replace function public.reorder_proposal_benefits(p_proposal_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  update public.proposal_benefits b
  set display_order = ord.position
  from unnest(p_ordered_ids) with ordinality as ord(benefit_id, position)
  where b.id = ord.benefit_id
    and b.proposal_id = p_proposal_id
    and b.user_id = v_user_id;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'benefits', 'action', 'reorder'));
end;
$$;

revoke execute on function public.reorder_proposal_benefits(uuid, uuid[]) from public;
revoke execute on function public.reorder_proposal_benefits(uuid, uuid[]) from anon;
grant execute on function public.reorder_proposal_benefits(uuid, uuid[]) to authenticated;

-- C4: delete_proposal_alternative/delete_proposal_benefit no comprobaban
-- ninguna revisión, a diferencia de sus upserts -- un delete con estado
-- local desactualizado (ej. pestaña B eliminando algo que pestaña A acaba de
-- editar) se ejecutaba igual sin aviso. Mismo patrón `for update` + PS409
-- que el resto de los RPCs de concurrencia optimista, ahora también
-- `security definer` (ver corrección arriba).
drop function if exists public.delete_proposal_alternative(uuid, uuid);
create or replace function public.delete_proposal_alternative(p_id uuid, p_proposal_id uuid, p_expected_revision integer)
returns table (id uuid)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_current_revision integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select a.revision into v_current_revision
  from public.proposal_alternatives a
  where a.id = p_id and a.proposal_id = p_proposal_id and a.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Alternativa no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  if p_expected_revision is null or v_current_revision != p_expected_revision then
    raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
  end if;

  delete from public.proposal_alternatives
  where proposal_alternatives.id = p_id
    and proposal_alternatives.proposal_id = p_proposal_id
    and proposal_alternatives.user_id = v_user_id
  returning proposal_alternatives.id into v_id;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'alternatives', 'deleted_id', v_id));

  return query select v_id;
end;
$$;

revoke execute on function public.delete_proposal_alternative(uuid, uuid, integer) from public;
revoke execute on function public.delete_proposal_alternative(uuid, uuid, integer) from anon;
grant execute on function public.delete_proposal_alternative(uuid, uuid, integer) to authenticated;

drop function if exists public.delete_proposal_benefit(uuid, uuid);
create or replace function public.delete_proposal_benefit(p_id uuid, p_proposal_id uuid, p_expected_revision integer)
returns table (id uuid)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_current_revision integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select b.revision into v_current_revision
  from public.proposal_benefits b
  where b.id = p_id and b.proposal_id = p_proposal_id and b.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Beneficio no encontrado o sin acceso' using errcode = 'P0002';
  end if;

  if p_expected_revision is null or v_current_revision != p_expected_revision then
    raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
  end if;

  delete from public.proposal_benefits
  where proposal_benefits.id = p_id
    and proposal_benefits.proposal_id = p_proposal_id
    and proposal_benefits.user_id = v_user_id
  returning proposal_benefits.id into v_id;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'benefits', 'deleted_id', v_id));

  return query select v_id;
end;
$$;

revoke execute on function public.delete_proposal_benefit(uuid, uuid, integer) from public;
revoke execute on function public.delete_proposal_benefit(uuid, uuid, integer) from anon;
grant execute on function public.delete_proposal_benefit(uuid, uuid, integer) to authenticated;
