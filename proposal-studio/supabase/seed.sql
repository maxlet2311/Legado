-- Datos de prueba locales para QA de Sprint B. Solo corre contra el Supabase
-- local (db reset); nunca se aplica a remoto.

-- Platform Owner local (RC1): la migración 20260716010000_platform_owner.sql
-- asigna is_platform_owner=true al owner real de producción, pero ya no
-- aborta si ese perfil no existe todavía (ver comentario en esa migración) —
-- en un reset local desde cero, el UPDATE de esa migración es un no-op.
-- Este bloque completa la propiedad para un usuario enteramente local, con un
-- UUID propio que nunca coincide con el de producción: no hay ninguna
-- credencial ni identidad de producción involucrada acá, y este archivo
-- jamás corre contra un proyecto remoto (seed.sql no es parte de
-- `supabase db push`), así que no hay forma de que esto se filtre a un
-- entorno real.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '90000000-0000-0000-0000-000000000009',
  'authenticated', 'authenticated',
  'platform-owner@local.test',
  crypt('Test1234!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Platform Owner Local"}',
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.email = 'platform-owner@local.test'
on conflict (provider_id, provider) do nothing;

update public.profiles
set role = 'admin', is_platform_owner = true, is_active = true, updated_at = now()
where user_id = '90000000-0000-0000-0000-000000000009';

-- Usuario A: activo, con membresía activa vigente.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-00000000000a',
  'authenticated', 'authenticated',
  'usuario.a@local.test',
  crypt('Test1234!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Usuario A"}',
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

-- Usuario B: activo, sin membresía.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-0000-0000-00000000000b',
  'authenticated', 'authenticated',
  'usuario.b@local.test',
  crypt('Test1234!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Usuario B"}',
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

-- Usuario inactivo.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'c0000000-0000-0000-0000-00000000000c',
  'authenticated', 'authenticated',
  'usuario.inactivo@local.test',
  crypt('Test1234!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Usuario Inactivo"}',
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

-- GoTrue exige una fila en auth.identities por cada método de login (email/password
-- incluido) para poder autenticar: sin esto el login falla con "credenciales
-- incorrectas" aunque el hash de la contraseña sea válido.
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.email in ('usuario.a@local.test', 'usuario.b@local.test', 'usuario.inactivo@local.test')
on conflict (provider_id, provider) do nothing;

-- El trigger handle_new_user ya crea los profiles con is_active=true. Marcamos
-- al usuario C como inactivo explícitamente.
update public.profiles set is_active = false where id = 'c0000000-0000-0000-0000-00000000000c';

-- Plan de membresía de prueba.
insert into public.membership_plans (id, code, name, price, currency, billing_interval, is_active)
values ('d0000000-0000-0000-0000-00000000000d', 'plan_qa_local', 'Plan QA Local', 1000, 'ARS', 'month', true)
on conflict (id) do nothing;

-- Membresía activa vigente para Usuario A.
insert into public.memberships (
  user_id, email, plan_id, status, provider,
  current_period_start, current_period_end, activated_at
) values (
  'a0000000-0000-0000-0000-00000000000a', 'usuario.a@local.test',
  'd0000000-0000-0000-0000-00000000000d', 'active', 'manual',
  now(), now() + interval '30 days', now()
) on conflict do nothing;

-- Plantilla activa (de Usuario A).
insert into public.proposal_templates (id, title, description, proposal_type, category, template_json, is_system, user_id, is_active)
values (
  'e0000000-0000-0000-0000-00000000000e', 'Plantilla QA Activa', 'Plantilla de prueba activa', 'individual', 'savings',
  '{"proposal_type":"individual","primary_objective":"retirement","product":"Retiro QA","currency":"ARS","narrative":null,"alternatives":[],"benefits":[],"comparison":null}'::jsonb, false, 'a0000000-0000-0000-0000-00000000000a', true
) on conflict (id) do nothing;

-- Plantilla inactiva (de Usuario A).
insert into public.proposal_templates (id, title, description, proposal_type, category, template_json, is_system, user_id, is_active)
values (
  'f0000000-0000-0000-0000-00000000000f', 'Plantilla QA Inactiva', 'Plantilla de prueba inactiva', 'individual', 'savings',
  '{"proposal_type":"individual","primary_objective":"retirement","product":"Retiro QA","currency":"ARS","narrative":null,"alternatives":[],"benefits":[],"comparison":null}'::jsonb, false, 'a0000000-0000-0000-0000-00000000000a', false
) on conflict (id) do nothing;

-- Cliente y propuesta completa de Usuario A.
insert into public.clients (id, user_id, full_name, client_type, email)
values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Cliente QA', 'individual', 'cliente.qa@local.test')
on conflict (id) do nothing;

insert into public.proposals (id, user_id, client_id, proposal_number, title, proposal_type, primary_objective, product, currency, commercial_status)
values (
  '20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a',
  '10000000-0000-0000-0000-000000000001', 'QA-0001', 'Propuesta QA Completa', 'individual', 'retirement', 'retiro', 'ARS', 'draft'
) on conflict (id) do nothing;
