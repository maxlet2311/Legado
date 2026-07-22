-- Sprint B: gestión de plantillas propias (editar/duplicar/desactivar).
-- `is_active` solo tiene sentido para plantillas propias (is_system = false):
-- una plantilla de sistema nunca se desactiva desde la UI de un asesor -- la
-- policy `proposal_templates_update_own` ya restringe cualquier UPDATE directo
-- a `is_system = false and user_id = auth.uid()`, así que esta columna no
-- necesita una regla nueva de RLS.
alter table public.proposal_templates
  add column is_active boolean not null default true;

create index idx_proposal_templates_user_active on public.proposal_templates (user_id, is_active);

-- Ahora que la columna existe, `apply_template_to_new_proposal`
-- (20260723010000_apply_template_atomic.sql) se redefine para exigir
-- `is_active = true`: una plantilla desactivada por el asesor no debe poder
-- usarse para crear propuestas nuevas, aunque siga siendo legible por RLS
-- (para poder reactivarla desde la UI).
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

  select * into v_template
  from public.proposal_templates t
  where t.id = p_template_id and (t.is_system = true or t.user_id = v_user_id) and t.is_active = true;

  if not found then
    raise exception 'Plantilla no encontrada, inactiva o sin acceso' using errcode = 'P0002';
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
-- otorga a anon por default privileges (ver 20260721020000): revocarlo
-- explícito de anon también, por consistencia con el CREATE OR REPLACE de
-- 20260723010000.
revoke execute on function public.apply_template_to_new_proposal(uuid, uuid) from public;
revoke execute on function public.apply_template_to_new_proposal(uuid, uuid) from anon;
grant execute on function public.apply_template_to_new_proposal(uuid, uuid) to authenticated;
