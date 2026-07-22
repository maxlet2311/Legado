-- pgTAP: apply_template_to_new_proposal (Sprint B,
-- 20260723010000_apply_template_atomic.sql + 20260723020000_proposal_templates_is_active.sql).
-- Convertido desde las aserciones manuales (RAISE EXCEPTION) de
-- supabase/manual-checks/rls_isolation.sql, bloques 17-22.

BEGIN;
SELECT plan(17);

DO $$
DECLARE
  v_owner uuid := 'a0000000-0000-0000-0000-00000000000a';
  v_stranger uuid := 'b0000000-0000-0000-0000-00000000000b';
  v_client uuid;
  v_stranger_client uuid;
  v_template_json jsonb;
  v_template_id uuid;
  v_broken_template_id uuid;
  v_inactive_template_id uuid;
  v_private_template_id uuid;
BEGIN
  v_template_json := '{
    "proposal_type": "individual",
    "primary_objective": "protect_family",
    "product": "Vida",
    "currency": "ARS",
    "is_example_values": false,
    "narrative": {
      "current_situation": "Situación de prueba", "detected_needs": "Necesidad",
      "objectives": "Objetivo", "detected_risks": "Riesgo",
      "opportunities": "Oportunidad", "recommended_strategy": "Estrategia"
    },
    "alternatives": [
      {"title": "Alternativa A", "description": "Desc", "category": "protection",
       "insurance_company": "Aseguradora X", "product_name": "Producto X",
       "currency": "ARS", "monthly_premium": null,
       "financial_details": {"advantages": ["Ventaja"], "disadvantages": [], "notes": ""},
       "display_order": 0}
    ],
    "benefits": [
      {"title": "Beneficio A", "description": "Desc", "icon": "shield", "category": "family", "display_order": 0}
    ],
    "comparison": {"columns": [{"id": "col_a", "label": "A"}], "rows": [{"id": "row_a", "label": "Fila", "values": {"col_a": "Sí"}}]}
  }'::jsonb;

  INSERT INTO public.clients (user_id, full_name, email, client_type)
    VALUES (v_owner, 'Cliente pgTAP TPL', 'pgtap-tpl@test.local', 'individual')
    RETURNING id INTO v_client;

  INSERT INTO public.clients (user_id, full_name, email, client_type)
    VALUES (v_stranger, 'Cliente pgTAP ajeno', 'pgtap-tpl-ajeno@test.local', 'individual')
    RETURNING id INTO v_stranger_client;

  INSERT INTO public.proposal_templates (title, description, proposal_type, category, template_json, is_system, user_id, is_active)
    VALUES ('Plantilla pgTAP', 'Descripción', 'individual', 'family', v_template_json, false, v_owner, true)
    RETURNING id INTO v_template_id;

  INSERT INTO public.proposal_templates (title, proposal_type, category, template_json, is_system, user_id, is_active)
    VALUES ('Plantilla pgTAP inactiva', 'individual', 'family', v_template_json, false, v_owner, false)
    RETURNING id INTO v_inactive_template_id;

  INSERT INTO public.proposal_templates (title, proposal_type, category, template_json, is_system, user_id, is_active)
    VALUES ('Plantilla pgTAP privada del owner', 'individual', 'family', v_template_json, false, v_owner, true)
    RETURNING id INTO v_private_template_id;

  INSERT INTO public.proposal_templates (title, proposal_type, category, template_json, is_system, user_id, is_active)
    VALUES ('Plantilla pgTAP rota', 'individual', 'family',
      jsonb_set(v_template_json, '{alternatives}', '[
        {"title": "Alternativa OK", "description": "", "category": "protection",
         "insurance_company": "Aseguradora X", "product_name": "Producto X",
         "currency": "ARS", "monthly_premium": null,
         "financial_details": {"advantages": [], "disadvantages": [], "notes": ""}, "display_order": 0},
        {"title": "Alternativa rota", "description": "", "category": "protection",
         "insurance_company": "Aseguradora Y", "product_name": "Producto Y",
         "currency": "MONEDA_INVALIDA", "monthly_premium": null,
         "financial_details": {"advantages": [], "disadvantages": [], "notes": ""}, "display_order": 1}
      ]'::jsonb),
      false, v_owner, true)
    RETURNING id INTO v_broken_template_id;

  PERFORM set_config('pgtap.tpl_owner', v_owner::text, true);
  PERFORM set_config('pgtap.tpl_stranger', v_stranger::text, true);
  PERFORM set_config('pgtap.tpl_client', v_client::text, true);
  PERFORM set_config('pgtap.tpl_stranger_client', v_stranger_client::text, true);
  PERFORM set_config('pgtap.tpl_id', v_template_id::text, true);
  PERFORM set_config('pgtap.tpl_inactive_id', v_inactive_template_id::text, true);
  PERFORM set_config('pgtap.tpl_private_id', v_private_template_id::text, true);
  PERFORM set_config('pgtap.tpl_broken_id', v_broken_template_id::text, true);
END;
$$;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', format('{"sub": "%s"}', current_setting('pgtap.tpl_owner')), true);

-- 1-4) creación atómica exitosa: propuesta creada, ownership correcto,
--      contenido completo (alternativa+beneficio+comparativa), narrativa copiada.
DO $$
DECLARE v_proposal_id uuid;
BEGIN
  SELECT id INTO v_proposal_id FROM public.apply_template_to_new_proposal(
    current_setting('pgtap.tpl_id')::uuid, current_setting('pgtap.tpl_client')::uuid
  );
  PERFORM set_config('pgtap.tpl_proposal', v_proposal_id::text, true);
END;
$$;

SELECT isnt(current_setting('pgtap.tpl_proposal', true), NULL, 'apply_template_to_new_proposal: crea la propuesta');

SELECT is(
  (SELECT user_id FROM public.proposals WHERE id = current_setting('pgtap.tpl_proposal')::uuid)::text,
  current_setting('pgtap.tpl_owner'),
  'apply_template_to_new_proposal: la propuesta creada pertenece al usuario que aplicó la plantilla'
);

SELECT is(
  (SELECT count(*) FROM public.proposal_alternatives WHERE proposal_id = current_setting('pgtap.tpl_proposal')::uuid),
  1::bigint,
  'apply_template_to_new_proposal: copió 1 alternativa'
);

SELECT is(
  (SELECT count(*) FROM public.proposal_benefits WHERE proposal_id = current_setting('pgtap.tpl_proposal')::uuid),
  1::bigint,
  'apply_template_to_new_proposal: copió 1 beneficio'
);

SELECT is(
  (SELECT count(*) FROM public.proposal_comparisons WHERE proposal_id = current_setting('pgtap.tpl_proposal')::uuid),
  1::bigint,
  'apply_template_to_new_proposal: copió la comparativa'
);

SELECT ok(
  EXISTS(SELECT 1 FROM public.proposal_narratives WHERE proposal_id = current_setting('pgtap.tpl_proposal')::uuid AND current_situation = 'Situación de prueba'),
  'apply_template_to_new_proposal: copió la narrativa'
);

-- 5) la plantilla original queda intacta tras aplicarla.
SELECT ok(
  (SELECT template_json FROM public.proposal_templates WHERE id = current_setting('pgtap.tpl_id')::uuid)
    @> '{"product": "Vida"}'::jsonb,
  'apply_template_to_new_proposal: la plantilla original no se modifica al aplicarla'
);

-- 6) rollback total: la alternativa con currency inválida hace fallar toda la
--    función; ni la propuesta ni la alternativa válida sobreviven.
DO $$
DECLARE v_before int; v_after int;
BEGIN
  SELECT count(*) INTO v_before FROM public.proposals WHERE user_id = current_setting('pgtap.tpl_owner')::uuid;
  PERFORM set_config('pgtap.tpl_before_count', v_before::text, true);
END;
$$;

SELECT throws_ok(
  format('SELECT public.apply_template_to_new_proposal(%L::uuid, %L::uuid)', current_setting('pgtap.tpl_broken_id')::uuid, current_setting('pgtap.tpl_client')::uuid),
  '23514',
  NULL,
  'apply_template_to_new_proposal: una alternativa con currency inválida hace fallar toda la función'
);

SELECT is(
  (SELECT count(*) FROM public.proposals WHERE user_id = current_setting('pgtap.tpl_owner')::uuid)::int,
  current_setting('pgtap.tpl_before_count')::int,
  'apply_template_to_new_proposal: rollback total, no queda ninguna propuesta parcial'
);

SELECT is(
  (SELECT count(*) FROM public.proposal_alternatives WHERE title = 'Alternativa OK' AND user_id = current_setting('pgtap.tpl_owner')::uuid),
  0::bigint,
  'apply_template_to_new_proposal: la alternativa válida previa a la rota tampoco sobrevive (atomicidad real)'
);

-- 7) plantilla inactiva: rechazada aunque sea propia.
SELECT throws_ok(
  format('SELECT public.apply_template_to_new_proposal(%L::uuid, %L::uuid)', current_setting('pgtap.tpl_inactive_id')::uuid, current_setting('pgtap.tpl_client')::uuid),
  'P0002',
  NULL,
  'apply_template_to_new_proposal: rechaza una plantilla propia desactivada'
);

-- 8) plantilla inexistente.
SELECT throws_ok(
  format('SELECT public.apply_template_to_new_proposal(%L::uuid, %L::uuid)', gen_random_uuid(), current_setting('pgtap.tpl_client')::uuid),
  'P0002',
  NULL,
  'apply_template_to_new_proposal: rechaza un id de plantilla que no existe'
);

-- 9) usuario ajeno (IDOR): no puede aplicar la plantilla privada del owner.
SELECT set_config('request.jwt.claims', format('{"sub": "%s"}', current_setting('pgtap.tpl_stranger')), true);

SELECT throws_ok(
  format('SELECT public.apply_template_to_new_proposal(%L::uuid, %L::uuid)', current_setting('pgtap.tpl_private_id')::uuid, current_setting('pgtap.tpl_stranger_client')::uuid),
  'P0002',
  NULL,
  'apply_template_to_new_proposal: un usuario ajeno no puede aplicar una plantilla privada de otro usuario'
);

SELECT set_config('request.jwt.claims', format('{"sub": "%s"}', current_setting('pgtap.tpl_owner')), true);

-- 10) anon no puede ejecutar el RPC.
SET LOCAL role anon;
SELECT throws_ok(
  format('SELECT public.apply_template_to_new_proposal(%L::uuid, %L::uuid)', gen_random_uuid(), gen_random_uuid()),
  '42501',
  NULL,
  'apply_template_to_new_proposal: anon no tiene EXECUTE'
);
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', format('{"sub": "%s"}', current_setting('pgtap.tpl_owner')), true);

-- 11) ACL efectivo por rol.
SELECT ok(
  NOT has_function_privilege('anon', 'public.apply_template_to_new_proposal(uuid, uuid)', 'EXECUTE'),
  'ACL: anon no tiene EXECUTE en apply_template_to_new_proposal'
);

SELECT ok(
  NOT has_function_privilege('public', 'public.apply_template_to_new_proposal(uuid, uuid)', 'EXECUTE'),
  'ACL: PUBLIC no tiene EXECUTE en apply_template_to_new_proposal'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.apply_template_to_new_proposal(uuid, uuid)', 'EXECUTE'),
  'ACL: authenticated tiene EXECUTE en apply_template_to_new_proposal'
);

SELECT * FROM finish();
ROLLBACK;
