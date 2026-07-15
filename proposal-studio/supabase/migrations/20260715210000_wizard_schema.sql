-- Sprint 3: campos y tablas necesarios para el wizard de creación de propuestas.
-- No modifica migraciones anteriores. Sigue el patrón establecido en Sprint 2:
-- RPCs transaccionales que mutan datos y escriben proposal_events atómicamente.

-- 1. Campos de propuesta que el wizard necesita y no existían.
--    `product` es el producto comercial de la propuesta (distinto de `primary_objective`,
--    que es la meta del cliente, ver 04_DATA_MODEL.md).
alter table public.proposals
  add column if not exists product varchar,
  add column if not exists internal_notes text;

-- `detected_needs` separa "necesidades detectadas" de "problemas" (detected_risks) y
-- "oportunidades" (opportunities), tal como pide el Paso 3 del wizard.
alter table public.proposal_narratives
  add column if not exists detected_needs text;

-- 2. Comparativa (Paso 7): tabla dedicada, tipada, lista para el motor de PDF del Sprint 4.
create table if not exists public.proposal_comparisons (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  columns jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_comparisons_proposal_id_idx on public.proposal_comparisons (proposal_id);
create index if not exists proposal_comparisons_user_id_idx on public.proposal_comparisons (user_id);

create trigger set_proposal_comparisons_updated_at
  before update on public.proposal_comparisons
  for each row execute function public.set_updated_at();

alter table public.proposal_comparisons enable row level security;

create policy "proposal_comparisons_all_own" on public.proposal_comparisons
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. RPCs transaccionales del wizard (mutación + proposal_event en la misma transacción).

-- Paso 1 (cliente) + Paso 2 (info de la propuesta): un único RPC porque ambos
-- pasos editan la misma fila de `proposals`.
create or replace function public.update_proposal_details(
  p_id uuid,
  p_client_id uuid,
  p_title varchar,
  p_proposal_type varchar,
  p_primary_objective varchar,
  p_product varchar,
  p_currency varchar,
  p_internal_notes text
)
returns table (id uuid, updated_at timestamptz)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.clients c where c.id = p_client_id and c.user_id = v_user_id) then
    raise exception 'Cliente no encontrado o sin acceso' using errcode = '42501';
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
  returning proposals.id, proposals.updated_at into v_id, v_updated_at;

  if v_id is null then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (v_id, v_user_id, 'updated', jsonb_build_object('step', 'info'));

  return query select v_id, v_updated_at;
end;
$$;

-- Paso 3 (diagnóstico) + Paso 5 (recomendación): comparten proposal_narratives.
create or replace function public.upsert_proposal_narrative(
  p_proposal_id uuid,
  p_current_situation text,
  p_detected_needs text,
  p_objectives text,
  p_detected_risks text,
  p_opportunities text,
  p_recommended_strategy text
)
returns table (id uuid, updated_at timestamptz)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
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
  returning proposal_narratives.id, proposal_narratives.updated_at into v_id, v_updated_at;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'narrative'));

  return query select v_id, v_updated_at;
end;
$$;

-- Paso 7 (comparativa).
create or replace function public.upsert_proposal_comparison(
  p_proposal_id uuid,
  p_columns jsonb,
  p_rows jsonb
)
returns table (id uuid, updated_at timestamptz)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.proposals p where p.id = p_proposal_id and p.user_id = v_user_id) then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  insert into public.proposal_comparisons (proposal_id, user_id, columns, rows)
  values (p_proposal_id, v_user_id, p_columns, p_rows)
  on conflict (proposal_id) do update
  set columns = excluded.columns,
      rows = excluded.rows
  returning proposal_comparisons.id, proposal_comparisons.updated_at into v_id, v_updated_at;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'comparison'));

  return query select v_id, v_updated_at;
end;
$$;

-- Paso 4 (alternativas): alta/edición, baja y reorden.
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
  p_display_order integer
)
returns table (id uuid)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
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
    returning proposal_alternatives.id into v_id;
  else
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
    returning proposal_alternatives.id into v_id;

    if v_id is null then
      raise exception 'Alternativa no encontrada o sin acceso' using errcode = 'P0002';
    end if;
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'alternatives', 'alternative_id', v_id));

  return query select v_id;
end;
$$;

create or replace function public.delete_proposal_alternative(p_id uuid, p_proposal_id uuid)
returns table (id uuid)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  delete from public.proposal_alternatives
  where proposal_alternatives.id = p_id
    and proposal_alternatives.proposal_id = p_proposal_id
    and proposal_alternatives.user_id = v_user_id
  returning proposal_alternatives.id into v_id;

  if v_id is null then
    raise exception 'Alternativa no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'alternatives', 'deleted_id', v_id));

  return query select v_id;
end;
$$;

create or replace function public.reorder_proposal_alternatives(p_proposal_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
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

-- Paso 6 (beneficios): mismo patrón que alternativas.
create or replace function public.upsert_proposal_benefit(
  p_id uuid,
  p_proposal_id uuid,
  p_title varchar,
  p_description text,
  p_icon varchar,
  p_category varchar,
  p_display_order integer
)
returns table (id uuid)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
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
    returning proposal_benefits.id into v_id;
  else
    update public.proposal_benefits
    set title = p_title,
        description = p_description,
        icon = p_icon,
        category = p_category,
        display_order = p_display_order
    where proposal_benefits.id = p_id
      and proposal_benefits.proposal_id = p_proposal_id
      and proposal_benefits.user_id = v_user_id
    returning proposal_benefits.id into v_id;

    if v_id is null then
      raise exception 'Beneficio no encontrado o sin acceso' using errcode = 'P0002';
    end if;
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'benefits', 'benefit_id', v_id));

  return query select v_id;
end;
$$;

create or replace function public.delete_proposal_benefit(p_id uuid, p_proposal_id uuid)
returns table (id uuid)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  delete from public.proposal_benefits
  where proposal_benefits.id = p_id
    and proposal_benefits.proposal_id = p_proposal_id
    and proposal_benefits.user_id = v_user_id
  returning proposal_benefits.id into v_id;

  if v_id is null then
    raise exception 'Beneficio no encontrado o sin acceso' using errcode = 'P0002';
  end if;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'updated', jsonb_build_object('step', 'benefits', 'deleted_id', v_id));

  return query select v_id;
end;
$$;

create or replace function public.reorder_proposal_benefits(p_proposal_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
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

-- Paso 8 (resumen): cierre de la propuesta. Valida en servidor (no solo en el cliente)
-- que existan los datos mínimos exigidos por 05_BUSINESS_RULES.md antes de marcarla completa.
create or replace function public.finalize_proposal(p_id uuid)
returns table (id uuid, status varchar)
language plpgsql
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
