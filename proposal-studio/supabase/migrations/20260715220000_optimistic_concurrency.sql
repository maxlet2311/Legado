-- Hardening Sprint 3 / A1: control de concurrencia optimista para las entidades
-- editables por autosave del wizard (proposals, proposal_narratives,
-- proposal_alternatives, proposal_benefits, proposal_comparisons).
--
-- Se elige una columna `revision` entera (en vez de `updated_at`) como token de
-- concurrencia: `updated_at` tiene precisión de microsegundos en Postgres pero
-- `Date.prototype.toISOString()` en el cliente trunca a milisegundos, lo que
-- puede producir falsos conflictos al comparar strings. `revision` es un
-- contador simple, comparable exacto, y no depende de reloj de cliente ni de
-- reloj de servidor.
--
-- El servidor incrementa `revision` en cada UPDATE vía trigger (nunca acepta el
-- valor que mande el cliente como fuente de verdad); cada RPC de mutación
-- recibe `p_expected_revision`, bloquea la fila (`for update`) y compara contra
-- el valor actual antes de escribir. Si no coincide, no escribe nada y levanta
-- una excepción con SQLSTATE custom 'PS409' (fuera del rango reservado por el
-- estándar SQL) que el cliente puede detectar de forma inequívoca.

-- 0. Las firmas de estos RPC cambian (se agrega p_expected_revision al final);
--    hay que eliminar las versiones anteriores explícitamente porque
--    `create or replace function` con una lista de argumentos distinta crea un
--    overload en vez de reemplazar la función existente.
drop function if exists public.update_proposal_details(uuid, uuid, character varying, character varying, character varying, character varying, character varying, text);
drop function if exists public.upsert_proposal_alternative(uuid, uuid, character varying, text, character varying, character varying, character varying, character varying, numeric, jsonb, integer);
drop function if exists public.upsert_proposal_benefit(uuid, uuid, character varying, text, character varying, character varying, integer);
drop function if exists public.upsert_proposal_comparison(uuid, jsonb, jsonb);
drop function if exists public.upsert_proposal_narrative(uuid, text, text, text, text, text, text);

-- 1. Columna revision + trigger de autoincremento en cada tabla editable.
alter table public.proposals add column if not exists revision integer not null default 1;
alter table public.proposal_narratives add column if not exists revision integer not null default 1;
alter table public.proposal_alternatives add column if not exists revision integer not null default 1;
alter table public.proposal_benefits add column if not exists revision integer not null default 1;
alter table public.proposal_comparisons add column if not exists revision integer not null default 1;

create or replace function public.bump_revision()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;

drop trigger if exists bump_proposals_revision on public.proposals;
create trigger bump_proposals_revision
  before update on public.proposals
  for each row execute function public.bump_revision();

drop trigger if exists bump_proposal_narratives_revision on public.proposal_narratives;
create trigger bump_proposal_narratives_revision
  before update on public.proposal_narratives
  for each row execute function public.bump_revision();

drop trigger if exists bump_proposal_alternatives_revision on public.proposal_alternatives;
create trigger bump_proposal_alternatives_revision
  before update on public.proposal_alternatives
  for each row execute function public.bump_revision();

drop trigger if exists bump_proposal_benefits_revision on public.proposal_benefits;
create trigger bump_proposal_benefits_revision
  before update on public.proposal_benefits
  for each row execute function public.bump_revision();

drop trigger if exists bump_proposal_comparisons_revision on public.proposal_comparisons;
create trigger bump_proposal_comparisons_revision
  before update on public.proposal_comparisons
  for each row execute function public.bump_revision();

-- 2. update_proposal_details: ahora exige p_expected_revision.
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

-- 3. upsert_proposal_narrative: token opcional (null = "todavía no existe fila").
create or replace function public.upsert_proposal_narrative(
  p_proposal_id uuid,
  p_current_situation text,
  p_detected_needs text,
  p_objectives text,
  p_detected_risks text,
  p_opportunities text,
  p_recommended_strategy text,
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
    -- El cliente pensaba que no existía fila, pero ya hay una: también es conflicto.
    raise exception 'CONFLICT' using errcode = 'PS409', detail = v_current_revision::text;
  end if;

  insert into public.proposal_narratives (
    proposal_id, user_id, current_situation, detected_needs, objectives, detected_risks, opportunities, recommended_strategy
  )
  values (
    p_proposal_id, v_user_id, p_current_situation, p_detected_needs, p_objectives, p_detected_risks, p_opportunities, p_recommended_strategy
  )
  on conflict (proposal_id) do update
  set current_situation = excluded.current_situation,
      detected_needs = excluded.detected_needs,
      objectives = excluded.objectives,
      detected_risks = excluded.detected_risks,
      opportunities = excluded.opportunities,
      recommended_strategy = excluded.recommended_strategy
  returning proposal_narratives.id, proposal_narratives.updated_at, proposal_narratives.revision into v_id, v_updated_at, v_new_revision;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'narrative'));

  return query select v_id, v_updated_at, v_new_revision;
end;
$$;

-- 4. upsert_proposal_comparison: mismo patrón que narrative (1:1 con proposal_id).
create or replace function public.upsert_proposal_comparison(
  p_proposal_id uuid,
  p_columns jsonb,
  p_rows jsonb,
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

-- 5. upsert_proposal_alternative: el token solo aplica a la rama de edición (p_id
--    no nulo); un alta no tiene fila previa con la que competir.
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

-- 6. upsert_proposal_benefit: mismo patrón que alternatives.
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

comment on function public.update_proposal_details(uuid, uuid, varchar, varchar, varchar, varchar, varchar, text, integer) is
  'Control de concurrencia optimista: p_expected_revision debe coincidir con proposals.revision o levanta SQLSTATE PS409 (conflict).';
comment on function public.upsert_proposal_narrative(uuid, text, text, text, text, text, text, integer) is
  'Control de concurrencia optimista sobre proposal_narratives (1:1). SQLSTATE PS409 = conflicto.';
comment on function public.upsert_proposal_comparison(uuid, jsonb, jsonb, integer) is
  'Control de concurrencia optimista sobre proposal_comparisons (1:1). SQLSTATE PS409 = conflicto.';
comment on function public.upsert_proposal_alternative(uuid, uuid, varchar, text, varchar, varchar, varchar, varchar, numeric, jsonb, integer, integer) is
  'Control de concurrencia optimista sobre proposal_alternatives en la rama de edición. SQLSTATE PS409 = conflicto.';
comment on function public.upsert_proposal_benefit(uuid, uuid, varchar, text, varchar, varchar, integer, integer) is
  'Control de concurrencia optimista sobre proposal_benefits en la rama de edición. SQLSTATE PS409 = conflicto.';
