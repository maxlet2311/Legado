-- Sprint B: `applyTemplateToNewProposalAction` creaba la propuesta con
-- `create_draft_proposal` y después disparaba 5+ RPCs independientes
-- (narrativa, cada alternativa, cada beneficio, comparativa) en llamadas HTTP
-- separadas vía `Promise.all` desde el server action. Si cualquiera de esas
-- llamadas fallaba a mitad de camino (red, timeout), quedaba un draft a medio
-- completar -- exactamente la "secuencia parcial" que el brief de plantillas
-- pide evitar. Este RPC hace todo el trabajo en una sola transacción de
-- Postgres: si algo falla, no se crea nada.

create or replace function public.apply_template_to_new_proposal(
  p_template_id uuid,
  p_client_id uuid
)
returns table (id uuid, proposal_number varchar)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_template record;
  v_content jsonb;
  v_proposal_id uuid;
  v_number varchar;
  v_narrative jsonb;
  v_item jsonb;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if not exists (select 1 from public.clients c where c.id = p_client_id and c.user_id = v_user_id) then
    raise exception 'Cliente no encontrado o sin acceso' using errcode = '42501';
  end if;

  -- Ownership de la plantilla: de sistema (global) o propia -- nunca la
  -- privada de otro asesor (misma regla que la policy `proposal_templates_select`).
  -- El filtro por `is_active` se agrega en 20260723020000 (create or replace),
  -- porque esa columna todavía no existe en esta migración -- referenciarla
  -- acá rompería el orden de aplicación (esta corre antes).
  select * into v_template
  from public.proposal_templates t
  where t.id = p_template_id and (t.is_system = true or t.user_id = v_user_id);

  if not found then
    raise exception 'Plantilla no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  v_content := v_template.template_json;
  v_number := public.generate_proposal_number();

  insert into public.proposals (
    user_id, client_id, title, proposal_type, currency, primary_objective, product, proposal_number
  )
  values (
    v_user_id, p_client_id, v_template.title,
    v_content->>'proposal_type', v_content->>'currency', v_content->>'primary_objective',
    nullif(v_content->>'product', ''), v_number
  )
  returning proposals.id into v_proposal_id;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (v_proposal_id, v_user_id, 'created', jsonb_build_object('source', 'template', 'template_id', p_template_id));

  v_narrative := v_content->'narrative';
  if v_narrative is not null and v_narrative <> 'null'::jsonb then
    insert into public.proposal_narratives (
      proposal_id, user_id, current_situation, detected_needs, objectives, detected_risks, opportunities, recommended_strategy
    )
    values (
      v_proposal_id, v_user_id,
      coalesce(v_narrative->>'current_situation', ''),
      coalesce(v_narrative->>'detected_needs', ''),
      coalesce(v_narrative->>'objectives', ''),
      coalesce(v_narrative->>'detected_risks', ''),
      coalesce(v_narrative->>'opportunities', ''),
      coalesce(v_narrative->>'recommended_strategy', '')
    );
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(v_content->'alternatives', '[]'::jsonb))
  loop
    insert into public.proposal_alternatives (
      proposal_id, user_id, title, description, category, insurance_company, product_name, currency,
      monthly_premium, financial_details, display_order
    )
    values (
      v_proposal_id, v_user_id,
      v_item->>'title', coalesce(v_item->>'description', ''), v_item->>'category',
      v_item->>'insurance_company', v_item->>'product_name', v_item->>'currency',
      nullif(v_item->>'monthly_premium', '')::numeric,
      jsonb_build_object(
        'advantages', coalesce(v_item->'financial_details'->'advantages', '[]'::jsonb),
        'disadvantages', coalesce(v_item->'financial_details'->'disadvantages', '[]'::jsonb),
        'notes', coalesce(v_item->'financial_details'->>'notes', '')
      ),
      coalesce((v_item->>'display_order')::int, 0)
    );
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(v_content->'benefits', '[]'::jsonb))
  loop
    insert into public.proposal_benefits (proposal_id, user_id, title, description, icon, category, display_order)
    values (
      v_proposal_id, v_user_id,
      v_item->>'title', coalesce(v_item->>'description', ''), coalesce(v_item->>'icon', ''),
      v_item->>'category', coalesce((v_item->>'display_order')::int, 0)
    );
  end loop;

  -- Nota: `v_content->'comparison' is not null` sería engañoso acá -- un JSON
  -- `null` (comparison ausente) es un valor jsonb válido, no un SQL NULL, así
  -- que esa comparación por sí sola no lo filtraría. Basta con el largo de
  -- columnas: si `comparison` es JSON null, `->'columns'` da SQL NULL, el
  -- coalesce lo vuelve `[]` y el length da 0.
  if jsonb_array_length(coalesce(v_content->'comparison'->'columns', '[]'::jsonb)) > 0 then
    insert into public.proposal_comparisons (proposal_id, user_id, columns, rows)
    values (v_proposal_id, v_user_id, v_content->'comparison'->'columns', v_content->'comparison'->'rows');
  end if;

  return query select v_proposal_id, v_number;
end;
$$;

-- "revoke ... from public" no elimina el privilegio directo que Supabase
-- otorga a anon por default privileges al crear la función (ver
-- 20260721020000_revoke_proposal_rpcs_from_anon.sql): hay que revocarlo
-- explícito de anon también.
revoke execute on function public.apply_template_to_new_proposal(uuid, uuid) from public;
revoke execute on function public.apply_template_to_new_proposal(uuid, uuid) from anon;
grant execute on function public.apply_template_to_new_proposal(uuid, uuid) to authenticated;
