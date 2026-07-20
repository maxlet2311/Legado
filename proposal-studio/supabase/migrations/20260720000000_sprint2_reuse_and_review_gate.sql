-- Sprint 2: Reutilización e IA invisible.
-- Mínimo cambio de esquema: activa la Biblioteca (antes solo schema+RLS sin uso),
-- agrega el gate de revisión de duplicación inteligente. No toca proposal_templates
-- (su forma ya sirve). Idempotente: seguro de re-ejecutar.

-- 1. Biblioteca: contenido estructurado real + producto opcional + tipos que
--    exige el sprint (alternative/benefit/diagnosis/recommendation), sin romper
--    los valores que ya contemplaba el schema original.
alter table public.library_items
  add column if not exists content_json jsonb not null default '{}'::jsonb,
  add column if not exists product varchar;

alter table public.library_items drop constraint if exists library_items_category_check;
alter table public.library_items add constraint library_items_category_check
  check (
    category in (
      'executive_summary', 'strategy', 'benefit', 'CTA', 'legal_note', 'proposal_section',
      'alternative', 'diagnosis', 'recommendation'
    )
  );

create index if not exists library_items_category_idx on public.library_items (user_id, category);

-- Permite auditar/limitar el uso de IA reutilizando proposal_events (sin tabla nueva).
alter table public.proposal_events drop constraint if exists proposal_events_event_type_check;
alter table public.proposal_events add constraint proposal_events_event_type_check
  check (event_type in ('created', 'updated', 'exported', 'viewed', 'status_changed', 'shared', 'ai_used'));

-- 2. Duplicación inteligente: marca de origen + gate de revisión antes de emitir.
alter table public.proposals
  add column if not exists duplicated_from_id uuid references public.proposals (id) on delete set null,
  add column if not exists duplication_reviewed boolean not null default true;

-- 3. RPC para marcar la duplicación como revisada (habilita `finalize_proposal`).
create or replace function public.mark_duplication_reviewed(p_id uuid)
returns table (id uuid, duplication_reviewed boolean)
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

-- 4. Preview en tiempo real: misma construcción de `content_json` que
--    `emit_proposal_version` (20260715233100), pero de solo lectura -- sin
--    tocar `proposal_versions` ni el checksum. Así el preview en el editor
--    queda garantizado idéntico al documento que se emitiría en ese momento,
--    sin duplicar la lógica de armado en TypeScript.
create or replace function public.get_live_document_content(p_proposal_id uuid)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal record;
  v_client jsonb;
  v_brand jsonb;
  v_narrative jsonb;
  v_alternatives jsonb;
  v_benefits jsonb;
  v_comparison jsonb;
  v_template jsonb;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select * into v_proposal
  from public.proposals p
  where p.id = p_proposal_id and p.user_id = v_user_id;

  if not found then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  select to_jsonb(c) - 'user_id' into v_client
  from (
    select cl.id, cl.full_name, cl.company_name, cl.client_type, cl.email, cl.phone
    from public.clients cl where cl.id = v_proposal.client_id
  ) c;

  -- Resuelto por v_user_id, no por v_proposal.brand_id: el wizard actual nunca
  -- asigna brand_id (no hay UI para eso) y brands tiene unique(user_id) -- un
  -- asesor, una marca. Mismo fix que 20260715234200_fix_emit_proposal_version_brand_lookup.sql;
  -- sin esto el preview en vivo nunca mostraría logo/colores/contacto del asesor.
  select to_jsonb(b) into v_brand
  from (
    select br.id, br.commercial_name, br.advisor_name, br.license_number, br.logo_url,
           br.primary_color, br.secondary_color, br.accent_color, br.email, br.phone,
           br.whatsapp, br.website, br.address, br.footer_text, br.signature_image
    from public.brands br where br.user_id = v_user_id
  ) b;

  select to_jsonb(n) - 'id' - 'proposal_id' - 'user_id' - 'created_at' - 'updated_at' - 'revision'
    into v_narrative
  from public.proposal_narratives n
  where n.proposal_id = p_proposal_id;

  select coalesce(jsonb_agg(to_jsonb(a) - 'proposal_id' - 'user_id' - 'created_at' - 'updated_at' - 'revision' order by a.display_order), '[]'::jsonb)
    into v_alternatives
  from public.proposal_alternatives a
  where a.proposal_id = p_proposal_id and a.is_visible = true;

  select coalesce(jsonb_agg(to_jsonb(be) - 'proposal_id' - 'user_id' - 'created_at' - 'updated_at' - 'revision' order by be.display_order), '[]'::jsonb)
    into v_benefits
  from public.proposal_benefits be
  where be.proposal_id = p_proposal_id and be.is_enabled = true;

  select jsonb_build_object('columns', coalesce(cmp.columns, '[]'::jsonb), 'rows', coalesce(cmp.rows, '[]'::jsonb))
    into v_comparison
  from public.proposal_comparisons cmp
  where cmp.proposal_id = p_proposal_id;

  select jsonb_build_object('id', t.id, 'title', t.title, 'category', t.category, 'template_json', t.template_json)
    into v_template
  from public.proposal_templates t
  where t.proposal_type = v_proposal.proposal_type and t.is_system = true
  order by t.is_default desc, t.created_at asc
  limit 1;

  return jsonb_build_object(
    'proposal', jsonb_build_object(
      'id', v_proposal.id,
      'proposal_number', v_proposal.proposal_number,
      'title', v_proposal.title,
      'primary_objective', v_proposal.primary_objective,
      'proposal_type', v_proposal.proposal_type,
      'product', v_proposal.product,
      'currency', v_proposal.currency,
      'orientation', v_proposal.orientation,
      'theme', v_proposal.theme,
      'font_family', v_proposal.font_family,
      'pdf_format', v_proposal.pdf_format,
      'margin_size', v_proposal.margin_size,
      'show_cover', v_proposal.show_cover,
      'show_summary', v_proposal.show_summary,
      'show_footer', v_proposal.show_footer,
      'show_page_numbers', v_proposal.show_page_numbers,
      'show_legal_note', v_proposal.show_legal_note,
      'show_watermark', v_proposal.show_watermark,
      'watermark_text', v_proposal.watermark_text,
      'primary_color_override', v_proposal.primary_color_override,
      'secondary_color_override', v_proposal.secondary_color_override
    ),
    'client', coalesce(v_client, 'null'::jsonb),
    'brand', coalesce(v_brand, 'null'::jsonb),
    'narrative', coalesce(v_narrative, 'null'::jsonb),
    'alternatives', v_alternatives,
    'benefits', v_benefits,
    'comparison', coalesce(v_comparison, jsonb_build_object('columns', '[]'::jsonb, 'rows', '[]'::jsonb)),
    'template', coalesce(v_template, 'null'::jsonb)
  ) || jsonb_build_object(
    'version_number', 0,
    'issued_at', now(),
    'checksum', 'draft',
    'schema_version', 1
  );
end;
$$;

comment on function public.get_live_document_content(uuid) is
  'Solo lectura: mismo armado de contenido que emit_proposal_version, para el preview en vivo del editor. No inserta versiones.';

-- 5. finalize_proposal: agrega el chequeo de revisión de duplicación (dato objetivo,
--    no bloquea nada más). Se recrea preservando el resto de las validaciones
--    definidas en 20260715210000_wizard_schema.sql.
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
