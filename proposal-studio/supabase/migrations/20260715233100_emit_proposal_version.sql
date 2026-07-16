-- Sprint 4 Core: snapshot inmutable de versiones documentales.
--
-- content_json congela el estado relacional crudo (sin internal_notes: nunca
-- forma parte del documento formal). render_json agrega version_number,
-- issued_at, checksum y schema_version: es lo único que consume el renderer
-- (06_PDF_ENGINE.md § Render JSON — "El PDF se genera exclusivamente desde
-- render_json. Nunca directamente desde las tablas.").
--
-- El checksum se calcula sobre content_json (nunca sobre render_json, que
-- cambia en cada emisión por version_number/issued_at) para poder deduplicar
-- emisiones idénticas: doble clic o "emitir" sin cambios reales devuelve la
-- versión existente en vez de crear un duplicado.
--
-- Concurrencia: `select ... for update` sobre la fila de `proposals` serializa
-- emisiones concurrentes de la misma propuesta (segunda llamada espera a que
-- la primera commitee, entonces ve el checksum ya emitido).

alter table public.proposal_versions
  add column if not exists schema_version integer not null default 1,
  add column if not exists checksum varchar;

create unique index if not exists proposal_versions_proposal_id_version_number_key
  on public.proposal_versions (proposal_id, version_number);

create index if not exists proposal_versions_proposal_id_checksum_idx
  on public.proposal_versions (proposal_id, checksum);

create or replace function public.emit_proposal_version(p_proposal_id uuid)
returns table (id uuid, version_number integer, checksum varchar, is_new boolean)
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
  v_content jsonb;
  v_checksum varchar;
  v_last_id uuid;
  v_last_version_number integer;
  v_last_checksum varchar;
  v_new_id uuid;
  v_new_version_number integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select * into v_proposal
  from public.proposals p
  where p.id = p_proposal_id and p.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  select to_jsonb(c) - 'user_id' into v_client
  from (
    select id, full_name, company_name, client_type, email, phone
    from public.clients where id = v_proposal.client_id
  ) c;

  select to_jsonb(b) into v_brand
  from (
    select id, commercial_name, advisor_name, license_number, logo_url,
           primary_color, secondary_color, accent_color, email, phone,
           whatsapp, website, address, footer_text, signature_image
    from public.brands where id = v_proposal.brand_id
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

  v_content := jsonb_build_object(
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
  );

  v_checksum := encode(extensions.digest(convert_to(v_content::text, 'UTF8'), 'sha256'), 'hex');

  select v.id, v.version_number, v.checksum into v_last_id, v_last_version_number, v_last_checksum
  from public.proposal_versions v
  where v.proposal_id = p_proposal_id
  order by v.version_number desc
  limit 1
  for update;

  if found and v_last_checksum = v_checksum then
    return query select v_last_id, v_last_version_number, v_last_checksum, false;
    return;
  end if;

  v_new_version_number := coalesce(v_last_version_number, 0) + 1;

  insert into public.proposal_versions (
    proposal_id, user_id, version_number, content_json, render_json, created_by, schema_version, checksum
  )
  values (
    p_proposal_id, v_user_id, v_new_version_number, v_content,
    v_content || jsonb_build_object(
      'version_number', v_new_version_number,
      'issued_at', now(),
      'checksum', v_checksum,
      'schema_version', 1
    ),
    v_user_id, 1, v_checksum
  )
  returning proposal_versions.id into v_new_id;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (p_proposal_id, v_user_id, 'exported', jsonb_build_object('step', 'version_emitted', 'version_number', v_new_version_number));

  return query select v_new_id, v_new_version_number, v_checksum, true;
end;
$$;

comment on function public.emit_proposal_version(uuid) is
  'Emite un snapshot inmutable de la propuesta. Dedupe por checksum de content_json: doble clic o sin cambios reales devuelve is_new=false con la versión existente.';

-- Registra (o reutiliza) el artifact PDF de una versión ya emitida. El path
-- se recibe ya resuelto por el servidor (nunca por el cliente); el conflicto
-- por índice único (proposal_version_id, artifact_type) hace que una carrera
-- de generación concurrente termine devolviendo el mismo ganador a ambas.
create or replace function public.record_proposal_version_artifact(
  p_proposal_version_id uuid,
  p_storage_path text,
  p_mime_type varchar,
  p_byte_size integer,
  p_checksum varchar,
  p_render_engine varchar,
  p_render_engine_version varchar
)
returns table (id uuid, storage_path text, created_at timestamptz, is_new boolean)
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_proposal_id uuid;
  v_id uuid;
  v_path text;
  v_created_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select v.proposal_id into v_proposal_id
  from public.proposal_versions v
  where v.id = p_proposal_version_id and v.user_id = v_user_id;

  if v_proposal_id is null then
    raise exception 'Versión no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  insert into public.proposal_version_artifacts (
    proposal_version_id, user_id, artifact_type, storage_path, mime_type, byte_size, checksum, render_engine, render_engine_version
  )
  values (
    p_proposal_version_id, v_user_id, 'pdf', p_storage_path, p_mime_type, p_byte_size, p_checksum, p_render_engine, p_render_engine_version
  )
  on conflict (proposal_version_id, artifact_type) do nothing
  returning proposal_version_artifacts.id, proposal_version_artifacts.storage_path, proposal_version_artifacts.created_at
  into v_id, v_path, v_created_at;

  if v_id is not null then
    insert into public.proposal_events (proposal_id, user_id, event_type, payload)
    values (v_proposal_id, v_user_id, 'exported', jsonb_build_object('step', 'pdf_generated', 'version_id', p_proposal_version_id));

    return query select v_id, v_path, v_created_at, true;
  else
    select a.id, a.storage_path, a.created_at into v_id, v_path, v_created_at
    from public.proposal_version_artifacts a
    where a.proposal_version_id = p_proposal_version_id and a.artifact_type = 'pdf';

    return query select v_id, v_path, v_created_at, false;
  end if;
end;
$$;

comment on function public.record_proposal_version_artifact(uuid, text, varchar, integer, varchar, varchar, varchar) is
  'Registra el artifact PDF de una versión. Si ya existe (índice único), devuelve is_new=false y el artifact existente en vez de duplicar.';
