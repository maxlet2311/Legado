-- pgTAP: C2 (inmutabilidad de propuestas completed) + C4 (delete revision-safe).
-- Migraciones cubiertas: 20260813020000_fix_narrative_family_rpcs_security_definer_and_delete_revision.sql,
-- 20260813030000_immutable_completed_proposals.sql.
--
-- Nota importante de diseño validada acá: proposal_narratives y proposals NO
-- tienen policy RLS de UPDATE (por diseño, desde 20260721010000/20260725010000
-- -- todo UPDATE pasa por RPCs `security definer`). Un `UPDATE ... WHERE ...`
-- directo contra esas dos tablas con rol `authenticated` ya es un no-op por
-- RLS (0 filas, sin excepción) tanto en draft como en completed -- probar el
-- guard de inmutabilidad ahí sería probar RLS, no el trigger. El canal de
-- ataque real es la RPC `security definer`, que sí bypassea RLS pero nunca
-- bypassea un trigger: por eso los tests 8 y 11 llaman
-- `upsert_proposal_narrative`/`update_proposal_details` con la revisión
-- correcta en vez de un UPDATE crudo. proposal_alternatives/benefits sí
-- conservan policy de INSERT/DELETE (solo se les quitó UPDATE), así que ahí
-- un INSERT/DELETE crudo sí alcanza la fila y ejercita el trigger directamente.

BEGIN;
SELECT plan(14);

DO $$
DECLARE
  v_owner uuid := 'a0000000-0000-0000-0000-00000000000a';
  v_client uuid;
BEGIN
  INSERT INTO public.clients (user_id, full_name, email, client_type)
    VALUES (v_owner, 'Cliente pgTAP Immutable', 'pgtap-immutable@test.local', 'individual')
    RETURNING id INTO v_client;
  PERFORM set_config('pgtap.imm_client', v_client::text, true);
END;
$$;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-00000000000a"}', true);

DO $$
DECLARE
  v_proposal uuid;
  v_alt_id uuid;
  v_alt_revision integer;
BEGIN
  SELECT id INTO v_proposal FROM public.create_draft_proposal(
    current_setting('pgtap.imm_client')::uuid, 'Propuesta Immutable', 'individual', 'ARS', 'protect_family'
  );
  PERFORM set_config('pgtap.imm_proposal', v_proposal::text, true);

  PERFORM public.upsert_proposal_narrative(v_proposal, 'situacion', '', '', '', '', 'estrategia', '', '', null);

  SELECT id, revision INTO v_alt_id, v_alt_revision
  FROM public.upsert_proposal_alternative(
    null, v_proposal, 'Alt 1', 'desc', 'protection', 'ACME', 'Vida', 'ARS', 1000, '{}'::jsonb, 0, null
  );
  PERFORM set_config('pgtap.imm_alt', v_alt_id::text, true);
  PERFORM set_config('pgtap.imm_alt_rev', v_alt_revision::text, true);
END;
$$;

-- 1) C4 (draft): delete con revision vieja falla con conflicto explícito y no borra nada.
SELECT throws_ok(
  format(
    'SELECT public.delete_proposal_alternative(%L::uuid, %L::uuid, %L::integer)',
    current_setting('pgtap.imm_alt')::uuid, current_setting('pgtap.imm_proposal')::uuid,
    current_setting('pgtap.imm_alt_rev')::integer - 1
  ),
  'PS409',
  NULL,
  'delete_proposal_alternative: revision vieja -> conflicto, no NOT FOUND silencioso'
);

-- 2)
SELECT ok(
  EXISTS(SELECT 1 FROM public.proposal_alternatives WHERE id = current_setting('pgtap.imm_alt')::uuid),
  'delete_proposal_alternative: la fila sigue existiendo tras el conflicto'
);

-- 3) C4 (draft): delete con revision correcta sí elimina.
SELECT lives_ok(
  format(
    'SELECT public.delete_proposal_alternative(%L::uuid, %L::uuid, %L::integer)',
    current_setting('pgtap.imm_alt')::uuid, current_setting('pgtap.imm_proposal')::uuid,
    current_setting('pgtap.imm_alt_rev')::integer
  ),
  'delete_proposal_alternative: revision correcta -> elimina sin error'
);

-- 4)
SELECT ok(
  NOT EXISTS(SELECT 1 FROM public.proposal_alternatives WHERE id = current_setting('pgtap.imm_alt')::uuid),
  'delete_proposal_alternative: la fila fue eliminada'
);

-- Recrear una alternativa para los tests de inmutabilidad de abajo.
DO $$
DECLARE v_alt_id uuid;
BEGIN
  SELECT id INTO v_alt_id
  FROM public.upsert_proposal_alternative(
    null, current_setting('pgtap.imm_proposal')::uuid, 'Alt 2', 'desc', 'protection', 'ACME', 'Vida', 'ARS', 1000, '{}'::jsonb, 0, null
  );
  PERFORM set_config('pgtap.imm_alt2', v_alt_id::text, true);
END;
$$;

-- 5) Draft: la edición normal sigue funcionando (regresión del bug SECURITY
--    INVOKER corregida en 20260813020000 -- antes de este fix, este UPDATE
--    afectaba 0 filas silenciosamente en vez de lanzar error o persistir).
SELECT lives_ok(
  format(
    'SELECT public.upsert_proposal_narrative(%L::uuid, %L, %L, %L, %L, %L, %L, %L, %L, %L::integer)',
    current_setting('pgtap.imm_proposal')::uuid, 'situacion editada', '', '', '', '', 'estrategia', '', '', 1
  ),
  'upsert_proposal_narrative: edición de una fila existente en draft no lanza error (regresión SECURITY INVOKER corregida)'
);

-- 6)
SELECT is(
  (SELECT current_situation FROM public.proposal_narratives WHERE proposal_id = current_setting('pgtap.imm_proposal')::uuid),
  'situacion editada',
  'upsert_proposal_narrative: el UPDATE persiste de verdad (no es un no-op silencioso)'
);

-- 7) Finalizar la propuesta (ya tiene narrativa + alternativa completas).
SELECT lives_ok(
  format('SELECT public.finalize_proposal(%L::uuid)', current_setting('pgtap.imm_proposal')::uuid),
  'finalize_proposal: con narrativa + alternativa completas, finaliza sin error'
);

-- ---- C2: inmutabilidad tras completed ----
-- Canal real de ataque: las RPC `security definer`, que bypassean RLS pero
-- nunca un trigger (ver nota de diseño arriba).

-- 8)
SELECT throws_ok(
  format(
    'SELECT public.upsert_proposal_narrative(%L::uuid, %L, %L, %L, %L, %L, %L, %L, %L, %L::integer)',
    current_setting('pgtap.imm_proposal')::uuid, 'hackeado', '', '', '', '', 'estrategia', '', '', 2
  ),
  'P0001',
  NULL,
  'guard_completed_proposal_child_write: upsert_proposal_narrative (RPC real) bloqueado tras completed'
);

-- 9)
SELECT throws_ok(
  format(
    'DELETE FROM public.proposal_alternatives WHERE id = %L::uuid',
    current_setting('pgtap.imm_alt2')::uuid
  ),
  'P0001',
  NULL,
  'guard_completed_proposal_child_write: DELETE directo de alternativa bloqueado tras completed (esta tabla sí conserva policy de DELETE)'
);

-- 10)
SELECT throws_ok(
  format(
    'INSERT INTO public.proposal_benefits (proposal_id, user_id, title, description, icon, category, display_order) VALUES (%L::uuid, %L::uuid, %L, %L, %L, %L, 0)',
    current_setting('pgtap.imm_proposal')::uuid, 'a0000000-0000-0000-0000-00000000000a', 'Nuevo', 'desc', 'star', 'family'
  ),
  'P0001',
  NULL,
  'guard_completed_proposal_child_write: INSERT directo de beneficio nuevo bloqueado tras completed (esta tabla sí conserva policy de INSERT)'
);

-- 11)
SELECT throws_ok(
  format(
    'SELECT public.update_proposal_details(%L::uuid, %L::uuid, %L, %L, %L, %L, %L, %L, %L::integer)',
    current_setting('pgtap.imm_proposal')::uuid, current_setting('pgtap.imm_client')::uuid,
    'Hackeado', 'individual', 'protect_family', 'Producto', 'ARS', '',
    (SELECT revision FROM public.proposals WHERE id = current_setting('pgtap.imm_proposal')::uuid)
  ),
  'P0001',
  NULL,
  'guard_completed_proposal_fields: update_proposal_details (RPC real) bloqueado tras completed'
);

-- 12) No bloqueado: campos administrativos/de formato -- vía sus RPCs reales.
SELECT lives_ok(
  format(
    'SELECT public.update_proposal_commercial_status(%L::uuid, %L)',
    current_setting('pgtap.imm_proposal')::uuid, 'sent'
  ),
  'guard_completed_proposal_fields: update_proposal_commercial_status sigue funcionando tras completed (eje independiente)'
);

-- 13)
SELECT lives_ok(
  format(
    'SELECT public.update_proposal_orientation(%L::uuid, %L)',
    current_setting('pgtap.imm_proposal')::uuid, 'landscape'
  ),
  'guard_completed_proposal_fields: update_proposal_orientation (formato) sigue funcionando tras completed'
);

-- 14)
SELECT lives_ok(
  format('SELECT public.archive_proposal(%L::uuid)', current_setting('pgtap.imm_proposal')::uuid),
  'guard_completed_proposal_fields: archive_proposal (transición de status) no queda bloqueado'
);

SELECT * FROM finish();
ROLLBACK;
