-- Verificación manual de aislamiento RLS entre dos asesores.
--
-- Requisitos previos: crear dos usuarios reales en Supabase Auth (dashboard o
-- `auth.users`), por ejemplo usuario_a y usuario_b. Sus perfiles se crean solos
-- vía el trigger `handle_new_user`. Reemplazar los UUID de ejemplo por los reales.
--
-- Cómo funciona: PostgREST inyecta `auth.uid()` a partir del claim `sub` del JWT.
-- Para simular esto en una sesión SQL directa, se fija el rol `authenticated` y
-- el claim `request.jwt.claims` dentro de una transacción, y se revierte al final.

begin;

  -- Simula la sesión de usuario_a.
  set local role authenticated;
  set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';

  -- Debe devolver únicamente clientes/propuestas de usuario_a (0 filas si aún no
  -- se cargó data de prueba, pero nunca filas de usuario_b).
  select id, user_id, full_name from public.clients;
  select id, user_id, title from public.proposals;

rollback;

begin;

  -- Simula la sesión de usuario_b.
  set local role authenticated;
  set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000002"}';

  -- Debe devolver únicamente clientes/propuestas de usuario_b.
  select id, user_id, full_name from public.clients;
  select id, user_id, title from public.proposals;

  -- Intento de leer directamente un registro de usuario_a por ID conocido debe
  -- devolver 0 filas (no un error) por la política RLS.
  -- select * from public.clients where user_id = '00000000-0000-0000-0000-000000000001';

rollback;

-- Verificación de plantillas: usuario_b debe ver plantillas is_system = true
-- más las suyas propias, nunca las privadas de usuario_a.
begin;
  set local role authenticated;
  set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000002"}';
  select id, title, is_system, user_id from public.proposal_templates;
rollback;

-- account_activation_invitations: sin policies, RLS debe denegar todo acceso
-- tanto a `authenticated` (incluido un intento de leer sus propias filas,
-- que no existen como concepto acá) como a `anon`. Ambas consultas deben
-- devolver 0 filas siempre, haya o no invitaciones cargadas.
begin;
  set local role authenticated;
  set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';
  select id, email, status from public.account_activation_invitations;
rollback;

begin;
  set local role anon;
  select id, email, status from public.account_activation_invitations;
rollback;

-- ============================================================================
-- Membresías: pruebas de RLS, grants y funciones (Etapa 6, sección 4).
--
-- Cada bloque corre en su propia transacción con ROLLBACK: no deja datos de
-- prueba. Requiere al menos un perfil real para los casos de vinculación
-- (self-only, link correcto); usa el Platform Owner del entorno.
-- Reemplazar el UUID de ejemplo por un perfil real si se corre en otro
-- proyecto.
-- ============================================================================

-- 1) RLS: memberships_select_own — un usuario solo ve su propia membresía.
begin;
  do $$
  declare v_plan uuid; v_m1 uuid; v_m2 uuid;
  begin
    insert into public.membership_plans (code, name, billing_interval, price, currency)
      values ('t_plan_a','Test Plan','month',1000,'ARS') returning id into v_plan;
    v_m1 := (public.create_membership('userA@test.local', v_plan, 'active', 'system', '90000000-0000-0000-0000-000000000009')).id;
    v_m2 := (public.create_membership('userb@test.local', v_plan, 'active', 'system')).id;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    if (select count(*) from public.memberships where id = v_m1) <> 1 then
      raise exception 'FAIL RLS-1: usuario debería ver su propia membresía';
    end if;
    if (select count(*) from public.memberships where id = v_m2) <> 0 then
      raise exception 'FAIL RLS-1b: usuario no debería ver membresía sin vincular a él';
    end if;
  end $$;
rollback;

-- 2) membership_status_history / payment_provider_events / account_activation_invitations:
--    no solo RLS sin policies — el grant SELECT de tabla está revocado por
--    completo para anon/authenticated (confirmado en information_schema.role_table_grants:
--    únicamente service_role tiene privilegios). El error esperado es
--    "permission denied for table", no un resultado vacío.
begin;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);
  do $$
  begin
    begin
      perform (select count(*) from public.membership_status_history);
      raise exception 'FAIL RLS-2a: authenticated no debería tener SELECT en membership_status_history';
    exception when insufficient_privilege then null;
    end;
    begin
      perform (select count(*) from public.payment_provider_events);
      raise exception 'FAIL RLS-2b: authenticated no debería tener SELECT en payment_provider_events';
    exception when insufficient_privilege then null;
    end;
    begin
      perform (select count(*) from public.account_activation_invitations);
      raise exception 'FAIL RLS-2c: authenticated no debería tener SELECT en account_activation_invitations';
    exception when insufficient_privilege then null;
    end;
  end $$;
rollback;

begin;
  set local role anon;
  do $$
  begin
    begin
      perform (select count(*) from public.membership_status_history);
      raise exception 'FAIL RLS-3a: anon no debería tener SELECT en membership_status_history';
    exception when insufficient_privilege then null;
    end;
  end $$;
rollback;

-- 3) membership_plans: anon/authenticated solo ven planes activos.
begin;
  do $$
  declare v_active uuid; v_inactive uuid;
  begin
    insert into public.membership_plans (code, name, billing_interval, price, currency, is_active)
      values ('t_plan_active','Activo','month',1000,'ARS', true) returning id into v_active;
    insert into public.membership_plans (code, name, billing_interval, price, currency, is_active)
      values ('t_plan_inactive','Inactivo','month',1000,'ARS', false) returning id into v_inactive;

    set local role anon;
    if (select count(*) from public.membership_plans where id = v_active) <> 1 then
      raise exception 'FAIL PLAN-1: anon debería ver plan activo';
    end if;
    if (select count(*) from public.membership_plans where id = v_inactive) <> 0 then
      raise exception 'FAIL PLAN-2: anon no debería ver plan inactivo';
    end if;
  end $$;
rollback;

-- 4) create_membership: crea membresía + historial inicial (previous_status null).
begin;
  do $$
  declare v_plan uuid; v_m public.memberships; v_hist_count int;
  begin
    insert into public.membership_plans (code, name, billing_interval, price, currency)
      values ('t_plan_create','Test','month',1000,'ARS') returning id into v_plan;
    v_m := public.create_membership('nuevo@test.local', v_plan, 'authorized', 'admin', null, null, null, '90000000-0000-0000-0000-000000000009', 'alta de prueba');

    select count(*) into v_hist_count from public.membership_status_history
      where membership_id = v_m.id and previous_status is null and new_status = 'authorized';
    if v_hist_count <> 1 then
      raise exception 'FAIL CREATE-1: falta la fila de historial inicial con previous_status null';
    end if;
    if v_m.activated_at is null then
      raise exception 'FAIL CREATE-2: activated_at debería completarse al crear en authorized';
    end if;
  end $$;
rollback;

-- 5) transition_membership_status: transición válida + optimistic locking
--    (expected_current_status desactualizado se rechaza con PS409, sin dejar
--    historial espurio).
begin;
  do $$
  declare v_plan uuid; v_m public.memberships; v_after public.memberships; v_hist_count int;
  begin
    insert into public.membership_plans (code, name, billing_interval, price, currency)
      values ('t_plan_trans','Test','month',1000,'ARS') returning id into v_plan;
    v_m := public.create_membership('trans@test.local', v_plan, 'authorized', 'admin');

    v_after := public.transition_membership_status(v_m.id, 'authorized', 'active', 'admin', 'activación manual');
    if v_after.status <> 'active' then
      raise exception 'FAIL TRANS-1: la transición válida no aplicó el nuevo estado';
    end if;
    select count(*) into v_hist_count from public.membership_status_history
      where membership_id = v_m.id and previous_status = 'authorized' and new_status = 'active';
    if v_hist_count <> 1 then
      raise exception 'FAIL TRANS-2: falta la fila de historial de la transición válida';
    end if;

    begin
      perform public.transition_membership_status(v_m.id, 'authorized', 'canceled', 'admin');
      raise exception 'FAIL TRANS-3: debería haber rechazado la transición con estado esperado desactualizado';
    exception when sqlstate 'PS409' then null;
    end;

    select count(*) into v_hist_count from public.membership_status_history
      where membership_id = v_m.id and new_status = 'canceled';
    if v_hist_count <> 0 then
      raise exception 'FAIL TRANS-4: la transición rechazada no debería haber insertado historial';
    end if;
  end $$;
rollback;

-- 6) link_membership_to_user: perfil inexistente (P0002), email distinto
--    (P0001), vinculación correcta, reintento idempotente del mismo usuario.
--    Nota: el caso "ya vinculada a OTRO usuario real" no es verificable en
--    este entorno porque solo existe 1 perfil (Platform Owner) — repetir esta
--    prueba cuando haya un segundo usuario real de prueba.
begin;
  do $$
  declare v_plan uuid; v_m public.memberships; v_linked public.memberships;
  begin
    insert into public.membership_plans (code, name, billing_interval, price, currency)
      values ('t_plan_link','Test','month',1000,'ARS') returning id into v_plan;
    v_m := public.create_membership('link@test.local', v_plan, 'authorized', 'admin');

    begin
      perform public.link_membership_to_user(v_m.id, '00000000-0000-0000-0000-000000000099', 'link@test.local');
      raise exception 'FAIL LINK-1: debería rechazar perfil inexistente';
    exception when sqlstate 'P0002' then null;
    end;

    begin
      perform public.link_membership_to_user(v_m.id, '90000000-0000-0000-0000-000000000009', 'otro@test.local');
      raise exception 'FAIL LINK-2: debería rechazar email que no coincide';
    exception when sqlstate 'P0001' then null;
    end;

    v_linked := public.link_membership_to_user(v_m.id, '90000000-0000-0000-0000-000000000009', 'link@test.local');
    if v_linked.user_id <> '90000000-0000-0000-0000-000000000009' then
      raise exception 'FAIL LINK-3: la vinculación correcta no asignó user_id';
    end if;

    perform public.link_membership_to_user(v_m.id, '90000000-0000-0000-0000-000000000009', 'link@test.local');
  end $$;
rollback;

-- 7) Duplicado de membresía vigente:
--    a) mismo usuario ya vinculado -> memberships_one_current_per_user_idx.
--    b) mismo email, AMBAS sin usuario vinculado -> memberships_one_current_per_email_idx.
--    (el índice por email es `where user_id is null`: una membresía ya
--    vinculada a un usuario NO bloquea una segunda membresía sin vincular con
--    el mismo email — comportamiento real confirmado, no un bug.)
begin;
  do $$
  declare v_plan uuid;
  begin
    insert into public.membership_plans (code, name, billing_interval, price, currency)
      values ('t_plan_dup','Test','month',1000,'ARS') returning id into v_plan;
    perform public.create_membership('dup@test.local', v_plan, 'active', 'admin', '90000000-0000-0000-0000-000000000009');
    begin
      perform public.create_membership('dup2@test.local', v_plan, 'active', 'admin', '90000000-0000-0000-0000-000000000009');
      raise exception 'FAIL DUP-1: debería rechazar segunda membresía vigente para el mismo usuario';
    exception when unique_violation then null;
    end;

    perform public.create_membership('dupemail@test.local', v_plan, 'pending', 'system');
    begin
      perform public.create_membership('dupemail@test.local', v_plan, 'pending', 'system');
      raise exception 'FAIL DUP-2: debería rechazar segunda membresía vigente sin usuario para el mismo email';
    exception when unique_violation then null;
    end;
  end $$;
rollback;

-- 8) has_active_membership: self-only, no filtra información de otro usuario.
begin;
  do $$
  declare v_plan uuid;
  begin
    insert into public.membership_plans (code, name, billing_interval, price, currency)
      values ('t_plan_hasactive','Test','month',1000,'ARS') returning id into v_plan;
    perform public.create_membership('hasactive@test.local', v_plan, 'active', 'admin', '90000000-0000-0000-0000-000000000009', now(), now() + interval '30 days');

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    if public.has_active_membership('90000000-0000-0000-0000-000000000009') <> true then
      raise exception 'FAIL HAM-1: debería reportar membresía activa propia';
    end if;
    if public.has_active_membership('00000000-0000-0000-0000-000000000099') <> false then
      raise exception 'FAIL HAM-2: no debería reportar acceso ajeno (self-only)';
    end if;
  end $$;
rollback;

-- 9) Grants: authenticated/anon no pueden ejecutar funciones administrativas.
begin;
  set local role authenticated;
  do $$
  begin
    begin
      perform public.create_membership('nope@test.local', gen_random_uuid(), 'active', 'system');
      raise exception 'FAIL GRANT-1: authenticated no debería poder ejecutar create_membership';
    exception when insufficient_privilege then null;
    end;
  end $$;
rollback;

begin;
  set local role anon;
  do $$
  begin
    begin
      perform public.transition_membership_status(gen_random_uuid(), 'active', 'canceled', 'system');
      raise exception 'FAIL GRANT-2: anon no debería poder ejecutar transition_membership_status';
    exception when insufficient_privilege then null;
    end;
  end $$;
rollback;

-- 10) proposal_versions (Sprint 4, hardening 20260717030000): la fotografía
--     emitida es inmutable — su dueño puede seguir viéndola (SELECT) pero ya
--     no puede modificarla ni borrarla directamente vía PostgREST (antes la
--     policy "proposal_versions_all_own" con `for all` lo permitía).
begin;
  do $$
  declare v_version_id uuid;
  begin
    insert into public.proposal_versions (proposal_id, user_id, version_number, content_json, render_json)
      values (null, '90000000-0000-0000-0000-000000000009', 1, '{}'::jsonb, '{}'::jsonb)
      returning id into v_version_id;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    if (select count(*) from public.proposal_versions where id = v_version_id) <> 1 then
      raise exception 'FAIL PV-1: el dueño debería poder ver su propia versión emitida';
    end if;

    update public.proposal_versions set version_number = 99 where id = v_version_id;
    if (select version_number from public.proposal_versions where id = v_version_id) = 99 then
      raise exception 'FAIL PV-2: la versión emitida no debería poder modificarse (debe ser inmutable)';
    end if;

    delete from public.proposal_versions where id = v_version_id;
    if (select count(*) from public.proposal_versions where id = v_version_id) <> 1 then
      raise exception 'FAIL PV-3: la versión emitida no debería poder borrarse por su dueño';
    end if;
  end $$;
rollback;

-- ============================================================================
-- commercial_status (Sprint A/B, 20260722010000_proposal_commercial_status.sql):
-- valor por defecto, transición válida + auditoría (estado anterior/nuevo),
-- rechazo de valor fuera de enum, IDOR y ejecución sin autenticación.
-- ============================================================================

-- 11) commercial_status: default 'draft', transición válida, auditoría completa
--     en proposal_events (previous_commercial_status + commercial_status).
begin;
  do $$
  declare
    v_client uuid;
    v_proposal_id uuid;
    v_status varchar;
    v_event_payload jsonb;
  begin
    insert into public.clients (user_id, full_name, email, client_type)
      values ('90000000-0000-0000-0000-000000000009', 'Cliente de prueba CS', 'cs-test@test.local', 'individual')
      returning id into v_client;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    select id into v_proposal_id from public.create_draft_proposal(
      v_client, 'Propuesta CS', 'individual', 'ARS', 'protect_family'
    );

    select commercial_status into v_status from public.proposals where id = v_proposal_id;
    if v_status <> 'draft' then
      raise exception 'FAIL CS-1: commercial_status debería nacer en draft, es %', v_status;
    end if;

    perform public.update_proposal_commercial_status(v_proposal_id, 'sent');
    select commercial_status into v_status from public.proposals where id = v_proposal_id;
    if v_status <> 'sent' then
      raise exception 'FAIL CS-2: no aplicó la transición a sent';
    end if;

    select payload into v_event_payload from public.proposal_events
      where proposal_id = v_proposal_id and event_type = 'status_changed'
      order by created_at desc limit 1;
    if v_event_payload->>'previous_commercial_status' <> 'draft' or v_event_payload->>'commercial_status' <> 'sent' then
      raise exception 'FAIL CS-3: el evento de auditoría no registró estado anterior/nuevo correctamente (%)', v_event_payload;
    end if;
  end $$;
rollback;

-- 12) commercial_status: valor fuera del enum (defensa en profundidad del
--     check constraint, aun si algún día una capa superior no valida).
begin;
  do $$
  declare v_client uuid; v_proposal_id uuid;
  begin
    insert into public.clients (user_id, full_name, email, client_type)
      values ('90000000-0000-0000-0000-000000000009', 'Cliente de prueba CS2', 'cs-test-2@test.local', 'individual')
      returning id into v_client;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    select id into v_proposal_id from public.create_draft_proposal(
      v_client, 'Propuesta CS2', 'individual', 'ARS', 'protect_family'
    );

    begin
      perform public.update_proposal_commercial_status(v_proposal_id, 'won');
      raise exception 'FAIL CS-4: debería rechazar un valor fuera del enum';
    exception when check_violation then null;
    end;
  end $$;
rollback;

-- 13) commercial_status: IDOR — un usuario ajeno no puede leer ni modificar
--     el commercial_status de una propuesta que no le pertenece, y el intento
--     rechazado no deja ningún cambio aplicado.
begin;
  do $$
  declare v_client uuid; v_proposal_id uuid; v_status varchar;
  begin
    insert into public.clients (user_id, full_name, email, client_type)
      values ('90000000-0000-0000-0000-000000000009', 'Cliente de prueba CS3', 'cs-test-3@test.local', 'individual')
      returning id into v_client;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    select id into v_proposal_id from public.create_draft_proposal(
      v_client, 'Propuesta CS3', 'individual', 'ARS', 'protect_family'
    );
    perform public.update_proposal_commercial_status(v_proposal_id, 'sent');

    -- Usuario ajeno (sin ninguna propuesta ni cliente propio).
    perform set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);
    begin
      perform public.update_proposal_commercial_status(v_proposal_id, 'accepted');
      raise exception 'FAIL CS-5: un usuario ajeno no debería poder cambiar el commercial_status de otra propuesta';
    exception when sqlstate 'P0002' then null;
    end;

    -- El intento de IDOR no debe haber dejado ningún cambio aplicado.
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);
    select commercial_status into v_status from public.proposals where id = v_proposal_id;
    if v_status <> 'sent' then
      raise exception 'FAIL CS-6: el intento de IDOR no debería haber modificado el estado (quedó en %)', v_status;
    end if;
  end $$;
rollback;

-- 14) commercial_status: anon no puede ejecutar el RPC (grants revocados de public/anon).
begin;
  set local role anon;
  do $$
  begin
    begin
      perform public.update_proposal_commercial_status(gen_random_uuid(), 'sent');
      raise exception 'FAIL CS-7: anon no debería poder ejecutar update_proposal_commercial_status';
    exception when insufficient_privilege then null;
    end;
  end $$;
rollback;

-- 15) commercial_status: propuesta inexistente (UUID que nunca existió, a
--     diferencia del IDOR del bloque 13 que sí era una propuesta real ajena).
begin;
  do $$
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);
    begin
      perform public.update_proposal_commercial_status(gen_random_uuid(), 'sent');
      raise exception 'FAIL CS-8: debería rechazar un id de propuesta que no existe';
    exception when sqlstate 'P0002' then null;
    end;
  end $$;
rollback;

-- 16) commercial_status: compatibilidad con el estado técnico `archived` --
--     archivar el documento (status técnico) no debe bloquear ni interferir
--     con la escritura de commercial_status (son campos independientes por
--     diseño, ver comentario de cabecera de la migración).
begin;
  do $$
  declare v_client uuid; v_proposal_id uuid; v_commercial varchar; v_technical varchar;
  begin
    insert into public.clients (user_id, full_name, email, client_type)
      values ('90000000-0000-0000-0000-000000000009', 'Cliente de prueba CS4', 'cs-test-4@test.local', 'individual')
      returning id into v_client;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    select id into v_proposal_id from public.create_draft_proposal(
      v_client, 'Propuesta CS4', 'individual', 'ARS', 'protect_family'
    );
    perform public.archive_proposal(v_proposal_id);

    -- El documento ya está archivado (status técnico); commercial_status debe
    -- seguir siendo editable con total normalidad.
    perform public.update_proposal_commercial_status(v_proposal_id, 'accepted');

    select status, commercial_status into v_technical, v_commercial
    from public.proposals where id = v_proposal_id;

    if v_technical <> 'archived' then
      raise exception 'FAIL CS-9: el status técnico debería seguir en archived (quedó en %)', v_technical;
    end if;
    if v_commercial <> 'accepted' then
      raise exception 'FAIL CS-10: commercial_status debería haberse actualizado a accepted incluso con el documento archivado (quedó en %)', v_commercial;
    end if;
  end $$;
rollback;

-- ============================================================================
-- Plantillas (Sprint B, 20260723010000_apply_template_atomic.sql +
-- 20260723020000_proposal_templates_is_active.sql): creación atómica,
-- rollback total ante fallo intermedio, ownership, plantilla inactiva y que
-- la plantilla original nunca se modifica al aplicarla.
-- ============================================================================

-- 17) apply_template_to_new_proposal: creación atómica exitosa -- la
--     propuesta pertenece al usuario, incluye narrativa/alternativas/
--     beneficios/comparativa, y la plantilla original queda intacta.
begin;
  do $$
  declare
    v_client uuid;
    v_template_id uuid;
    v_template_json jsonb;
    v_template_json_before jsonb;
    v_template_json_after jsonb;
    v_proposal_id uuid;
    v_owner uuid;
    v_alt_count int;
    v_ben_count int;
    v_comp_count int;
  begin
    v_template_json := '{
      "proposal_type": "individual",
      "primary_objective": "protect_family",
      "product": "Vida",
      "currency": "ARS",
      "is_example_values": false,
      "narrative": {
        "current_situation": "Situación de prueba",
        "detected_needs": "Necesidad",
        "objectives": "Objetivo",
        "detected_risks": "Riesgo",
        "opportunities": "Oportunidad",
        "recommended_strategy": "Estrategia"
      },
      "alternatives": [
        {
          "title": "Alternativa A", "description": "Desc", "category": "protection",
          "insurance_company": "Aseguradora X", "product_name": "Producto X",
          "currency": "ARS", "monthly_premium": null,
          "financial_details": {"advantages": ["Ventaja"], "disadvantages": [], "notes": ""},
          "display_order": 0
        }
      ],
      "benefits": [
        {"title": "Beneficio A", "description": "Desc", "icon": "shield", "category": "family", "display_order": 0}
      ],
      "comparison": {"columns": [{"id": "col_a", "label": "A"}], "rows": [{"id": "row_a", "label": "Fila", "values": {"col_a": "Sí"}}]}
    }'::jsonb;

    insert into public.clients (user_id, full_name, email, client_type)
      values ('90000000-0000-0000-0000-000000000009', 'Cliente de prueba TPL', 'tpl-test@test.local', 'individual')
      returning id into v_client;

    insert into public.proposal_templates (title, description, proposal_type, category, template_json, is_system, user_id, is_active)
      values ('Plantilla de prueba', 'Descripción', 'individual', 'family', v_template_json, false,
              '90000000-0000-0000-0000-000000000009', true)
      returning id, template_json into v_template_id, v_template_json_before;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    select id into v_proposal_id
    from public.apply_template_to_new_proposal(v_template_id, v_client);

    if v_proposal_id is null then
      raise exception 'FAIL TPL-1: no se creó la propuesta';
    end if;

    select user_id into v_owner from public.proposals where id = v_proposal_id;
    if v_owner <> '90000000-0000-0000-0000-000000000009' then
      raise exception 'FAIL TPL-2: la propuesta creada no pertenece al usuario que aplicó la plantilla';
    end if;

    select count(*) into v_alt_count from public.proposal_alternatives where proposal_id = v_proposal_id;
    select count(*) into v_ben_count from public.proposal_benefits where proposal_id = v_proposal_id;
    select count(*) into v_comp_count from public.proposal_comparisons where proposal_id = v_proposal_id;
    if v_alt_count <> 1 or v_ben_count <> 1 or v_comp_count <> 1 then
      raise exception 'FAIL TPL-3: contenido incompleto (alternativas=%, beneficios=%, comparativas=%)', v_alt_count, v_ben_count, v_comp_count;
    end if;

    if not exists (select 1 from public.proposal_narratives where proposal_id = v_proposal_id and current_situation = 'Situación de prueba') then
      raise exception 'FAIL TPL-4: la narrativa no se copió';
    end if;

    -- La plantilla original nunca cambia al aplicarla.
    select template_json into v_template_json_after from public.proposal_templates where id = v_template_id;
    if v_template_json_after <> v_template_json_before then
      raise exception 'FAIL TPL-5: la plantilla original se modificó al aplicarla';
    end if;
  end $$;
rollback;

-- 18) apply_template_to_new_proposal: rollback total ante fallo intermedio --
--     la segunda alternativa viola el check constraint de `currency`
--     (proposal_alternatives_currency_check); la propuesta y la primera
--     alternativa, que sí se habían insertado dentro de la misma
--     transacción de función, no deben sobrevivir (atomicidad real, no solo
--     "creación exitosa").
begin;
  do $$
  declare
    v_client uuid;
    v_template_id uuid;
    v_template_json jsonb;
    v_proposals_before int;
    v_proposals_after int;
    v_orphan_alternatives int;
    v_failed boolean := false;
  begin
    v_template_json := '{
      "proposal_type": "individual",
      "primary_objective": "protect_family",
      "product": null,
      "currency": "ARS",
      "is_example_values": false,
      "narrative": null,
      "alternatives": [
        {
          "title": "Alternativa OK", "description": "", "category": "protection",
          "insurance_company": "Aseguradora X", "product_name": "Producto X",
          "currency": "ARS", "monthly_premium": null,
          "financial_details": {"advantages": [], "disadvantages": [], "notes": ""},
          "display_order": 0
        },
        {
          "title": "Alternativa rota", "description": "", "category": "protection",
          "insurance_company": "Aseguradora Y", "product_name": "Producto Y",
          "currency": "MONEDA_INVALIDA", "monthly_premium": null,
          "financial_details": {"advantages": [], "disadvantages": [], "notes": ""},
          "display_order": 1
        }
      ],
      "benefits": [],
      "comparison": null
    }'::jsonb;

    insert into public.clients (user_id, full_name, email, client_type)
      values ('90000000-0000-0000-0000-000000000009', 'Cliente de prueba TPL2', 'tpl-test-2@test.local', 'individual')
      returning id into v_client;

    insert into public.proposal_templates (title, proposal_type, category, template_json, is_system, user_id, is_active)
      values ('Plantilla rota', 'individual', 'family', v_template_json, false,
              '90000000-0000-0000-0000-000000000009', true)
      returning id into v_template_id;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    select count(*) into v_proposals_before from public.proposals where user_id = '90000000-0000-0000-0000-000000000009';

    begin
      perform public.apply_template_to_new_proposal(v_template_id, v_client);
    exception when check_violation then
      v_failed := true;
    end;

    if not v_failed then
      raise exception 'FAIL TPL-6: la plantilla con moneda inválida debería haber fallado';
    end if;

    select count(*) into v_proposals_after from public.proposals where user_id = '90000000-0000-0000-0000-000000000009';
    if v_proposals_after <> v_proposals_before then
      raise exception 'FAIL TPL-7: no debería haber quedado ninguna propuesta parcial tras el fallo (antes=%, después=%)', v_proposals_before, v_proposals_after;
    end if;

    select count(*) into v_orphan_alternatives from public.proposal_alternatives a
      where a.title = 'Alternativa OK' and a.user_id = '90000000-0000-0000-0000-000000000009';
    if v_orphan_alternatives <> 0 then
      raise exception 'FAIL TPL-8: la primera alternativa (válida) no debería haber sobrevivido al rollback de la función';
    end if;
  end $$;
rollback;

-- 19) apply_template_to_new_proposal: usuario no autenticado (anon).
begin;
  set local role anon;
  do $$
  begin
    begin
      perform public.apply_template_to_new_proposal(gen_random_uuid(), gen_random_uuid());
      raise exception 'FAIL TPL-9: anon no debería poder ejecutar apply_template_to_new_proposal';
    exception when insufficient_privilege then null;
    end;
  end $$;
rollback;

-- 20) apply_template_to_new_proposal: plantilla privada ajena (IDOR) --
--     usuario 001 nunca puede aplicar una plantilla privada del Platform Owner.
begin;
  do $$
  declare v_template_id uuid; v_client uuid;
  begin
    insert into public.proposal_templates (title, proposal_type, category, template_json, is_system, user_id, is_active)
      values ('Plantilla privada ajena', 'individual', 'family',
              '{"proposal_type":"individual","primary_objective":"protect_family","product":null,"currency":"ARS","is_example_values":false,"narrative":null,"alternatives":[],"benefits":[],"comparison":null}'::jsonb,
              false, '90000000-0000-0000-0000-000000000009', true)
      returning id into v_template_id;

    insert into public.clients (user_id, full_name, email, client_type)
      values ('00000000-0000-0000-0000-000000000001', 'Cliente ajeno', 'ajeno@test.local', 'individual')
      returning id into v_client;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);

    begin
      perform public.apply_template_to_new_proposal(v_template_id, v_client);
      raise exception 'FAIL TPL-10: no debería poder aplicar una plantilla privada de otro usuario';
    exception when sqlstate 'P0002' then null;
    end;
  end $$;
rollback;

-- 21) apply_template_to_new_proposal: plantilla inactiva -- desactivada por
--     su dueño, debe rechazarse aunque sea propia (is_active = false).
begin;
  do $$
  declare v_template_id uuid; v_client uuid;
  begin
    insert into public.clients (user_id, full_name, email, client_type)
      values ('90000000-0000-0000-0000-000000000009', 'Cliente de prueba TPL3', 'tpl-test-3@test.local', 'individual')
      returning id into v_client;

    insert into public.proposal_templates (title, proposal_type, category, template_json, is_system, user_id, is_active)
      values ('Plantilla inactiva', 'individual', 'family',
              '{"proposal_type":"individual","primary_objective":"protect_family","product":null,"currency":"ARS","is_example_values":false,"narrative":null,"alternatives":[],"benefits":[],"comparison":null}'::jsonb,
              false, '90000000-0000-0000-0000-000000000009', false)
      returning id into v_template_id;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    begin
      perform public.apply_template_to_new_proposal(v_template_id, v_client);
      raise exception 'FAIL TPL-11: no debería poder aplicar una plantilla propia desactivada';
    exception when sqlstate 'P0002' then null;
    end;
  end $$;
rollback;

-- 22) apply_template_to_new_proposal: plantilla inexistente.
begin;
  do $$
  declare v_client uuid;
  begin
    insert into public.clients (user_id, full_name, email, client_type)
      values ('90000000-0000-0000-0000-000000000009', 'Cliente de prueba TPL4', 'tpl-test-4@test.local', 'individual')
      returning id into v_client;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "90000000-0000-0000-0000-000000000009"}', true);

    begin
      perform public.apply_template_to_new_proposal(gen_random_uuid(), v_client);
      raise exception 'FAIL TPL-12: debería rechazar un id de plantilla que no existe';
    exception when sqlstate 'P0002' then null;
    end;
  end $$;
rollback;
