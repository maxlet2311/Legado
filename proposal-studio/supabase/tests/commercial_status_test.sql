-- pgTAP: commercial_status (Sprint B, 20260722010000_proposal_commercial_status.sql).
-- Convertido desde las aserciones manuales (RAISE EXCEPTION) de
-- supabase/manual-checks/rls_isolation.sql, bloques 11-16.

BEGIN;
SELECT plan(16);

-- Fixtures propias (no dependen del Platform Owner real: usan los usuarios de
-- QA locales de supabase/seed.sql).
DO $$
DECLARE
  v_owner uuid := 'a0000000-0000-0000-0000-00000000000a';
  v_stranger uuid := 'b0000000-0000-0000-0000-00000000000b';
  v_client uuid;
BEGIN
  INSERT INTO public.clients (user_id, full_name, email, client_type)
    VALUES (v_owner, 'Cliente pgTAP CS', 'pgtap-cs@test.local', 'individual')
    RETURNING id INTO v_client;
  PERFORM set_config('pgtap.cs_client', v_client::text, true);
END;
$$;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-00000000000a"}', true);

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.create_draft_proposal(
    current_setting('pgtap.cs_client')::uuid, 'Propuesta CS', 'individual', 'ARS', 'protect_family'
  );
  PERFORM set_config('pgtap.cs_proposal', v_id::text, true);
END;
$$;

-- 1) default: una propuesta nueva nace en commercial_status = 'draft'.
SELECT is(
  (SELECT commercial_status FROM public.proposals WHERE id = current_setting('pgtap.cs_proposal')::uuid),
  'draft',
  'create_draft_proposal: commercial_status nace en draft'
);

-- 2) cambio válido: draft -> sent se aplica.
SELECT is(
  (SELECT commercial_status FROM public.update_proposal_commercial_status(
    current_setting('pgtap.cs_proposal')::uuid, 'sent'
  )),
  'sent',
  'update_proposal_commercial_status: transición válida draft -> sent'
);

-- 3) previous_commercial_status y commercial_status quedan en proposal_events.
SELECT is(
  (SELECT payload->>'previous_commercial_status' FROM public.proposal_events
     WHERE proposal_id = current_setting('pgtap.cs_proposal')::uuid AND event_type = 'status_changed'
     ORDER BY created_at DESC LIMIT 1),
  'draft',
  'proposal_events: previous_commercial_status quedó registrado'
);

SELECT is(
  (SELECT payload->>'commercial_status' FROM public.proposal_events
     WHERE proposal_id = current_setting('pgtap.cs_proposal')::uuid AND event_type = 'status_changed'
     ORDER BY created_at DESC LIMIT 1),
  'sent',
  'proposal_events: commercial_status nuevo quedó registrado'
);

-- 4) estado inválido: fuera del enum, rechazado por el check constraint.
SELECT throws_ok(
  format('SELECT public.update_proposal_commercial_status(%L::uuid, %L)', current_setting('pgtap.cs_proposal')::uuid, 'won'),
  '23514',
  NULL,
  'update_proposal_commercial_status: rechaza un valor fuera del enum'
);

-- 5) propuesta inexistente.
SELECT throws_ok(
  format('SELECT public.update_proposal_commercial_status(%L::uuid, %L)', gen_random_uuid(), 'sent'),
  'P0002',
  NULL,
  'update_proposal_commercial_status: rechaza un id de propuesta que no existe'
);

-- 6) usuario ajeno sin acceso (IDOR) y sin dejar cambios aplicados.
SELECT set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-00000000000b"}', true);

SELECT throws_ok(
  format('SELECT public.update_proposal_commercial_status(%L::uuid, %L)', current_setting('pgtap.cs_proposal')::uuid, 'accepted'),
  'P0002',
  NULL,
  'update_proposal_commercial_status: un usuario ajeno no puede modificar el commercial_status de otra propuesta'
);

SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-00000000000a"}', true);

SELECT is(
  (SELECT commercial_status FROM public.proposals WHERE id = current_setting('pgtap.cs_proposal')::uuid),
  'sent',
  'update_proposal_commercial_status: el intento de IDOR no dejó ningún cambio aplicado'
);

-- 7) anon no puede ejecutar el RPC (grants revocados de public/anon).
SET LOCAL role anon;
SELECT throws_ok(
  format('SELECT public.update_proposal_commercial_status(%L::uuid, %L)', gen_random_uuid(), 'sent'),
  '42501',
  NULL,
  'update_proposal_commercial_status: anon no tiene EXECUTE'
);
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-00000000000a"}', true);

-- 8) independencia de commercial_status respecto del status técnico
--    (archivar el documento no bloquea ni resetea commercial_status).
SELECT lives_ok(
  format('SELECT public.archive_proposal(%L::uuid)', current_setting('pgtap.cs_proposal')::uuid),
  'archive_proposal: archivar el documento no falla con commercial_status ya en sent'
);

SELECT lives_ok(
  format('SELECT public.update_proposal_commercial_status(%L::uuid, %L)', current_setting('pgtap.cs_proposal')::uuid, 'accepted'),
  'update_proposal_commercial_status: sigue siendo editable con el documento archivado'
);

SELECT is(
  (SELECT status FROM public.proposals WHERE id = current_setting('pgtap.cs_proposal')::uuid),
  'archived',
  'status técnico permanece en archived'
);

SELECT is(
  (SELECT commercial_status FROM public.proposals WHERE id = current_setting('pgtap.cs_proposal')::uuid),
  'accepted',
  'commercial_status se actualiza igual con el documento archivado (campos independientes)'
);

-- 9) EXECUTE efectivo por rol (ACL), independiente de las pruebas de negocio
--    de arriba: PUBLIC/anon sin EXECUTE, authenticated con EXECUTE.
SELECT ok(
  NOT has_function_privilege('anon', 'public.update_proposal_commercial_status(uuid, varchar)', 'EXECUTE'),
  'ACL: anon no tiene EXECUTE en update_proposal_commercial_status'
);

SELECT ok(
  NOT has_function_privilege('public', 'public.update_proposal_commercial_status(uuid, varchar)', 'EXECUTE'),
  'ACL: PUBLIC no tiene EXECUTE en update_proposal_commercial_status'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.update_proposal_commercial_status(uuid, varchar)', 'EXECUTE'),
  'ACL: authenticated tiene EXECUTE en update_proposal_commercial_status'
);

SELECT * FROM finish();
ROLLBACK;
