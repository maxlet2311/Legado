-- Fix: proposals.brand_id nunca se setea en el flujo actual del wizard (no
-- existe UI para asignarlo; brands tiene unique(user_id) — un asesor, una
-- marca). emit_proposal_version resolvía el brand por v_proposal.brand_id
-- (siempre null), perdiendo el branding en el snapshot. Se resuelve por
-- v_user_id, igual que el resto de la app (branding page, actions).

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

  perform pg_advisory_xact_lock(hashtextextended(p_proposal_id::text, 0));

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
  limit 1;

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
