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
    v_m1 := (public.create_membership('userA@test.local', v_plan, 'active', 'system', '98a388bb-5385-42e2-98d5-9db0b716af82')).id;
    v_m2 := (public.create_membership('userb@test.local', v_plan, 'active', 'system')).id;

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "98a388bb-5385-42e2-98d5-9db0b716af82"}', true);

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
  select set_config('request.jwt.claims', '{"sub": "98a388bb-5385-42e2-98d5-9db0b716af82"}', true);
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
    v_m := public.create_membership('nuevo@test.local', v_plan, 'authorized', 'admin', null, null, null, '98a388bb-5385-42e2-98d5-9db0b716af82', 'alta de prueba');

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
      perform public.link_membership_to_user(v_m.id, '98a388bb-5385-42e2-98d5-9db0b716af82', 'otro@test.local');
      raise exception 'FAIL LINK-2: debería rechazar email que no coincide';
    exception when sqlstate 'P0001' then null;
    end;

    v_linked := public.link_membership_to_user(v_m.id, '98a388bb-5385-42e2-98d5-9db0b716af82', 'link@test.local');
    if v_linked.user_id <> '98a388bb-5385-42e2-98d5-9db0b716af82' then
      raise exception 'FAIL LINK-3: la vinculación correcta no asignó user_id';
    end if;

    perform public.link_membership_to_user(v_m.id, '98a388bb-5385-42e2-98d5-9db0b716af82', 'link@test.local');
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
    perform public.create_membership('dup@test.local', v_plan, 'active', 'admin', '98a388bb-5385-42e2-98d5-9db0b716af82');
    begin
      perform public.create_membership('dup2@test.local', v_plan, 'active', 'admin', '98a388bb-5385-42e2-98d5-9db0b716af82');
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
    perform public.create_membership('hasactive@test.local', v_plan, 'active', 'admin', '98a388bb-5385-42e2-98d5-9db0b716af82', now(), now() + interval '30 days');

    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub": "98a388bb-5385-42e2-98d5-9db0b716af82"}', true);

    if public.has_active_membership('98a388bb-5385-42e2-98d5-9db0b716af82') <> true then
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
