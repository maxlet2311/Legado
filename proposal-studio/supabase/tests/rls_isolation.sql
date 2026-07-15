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
