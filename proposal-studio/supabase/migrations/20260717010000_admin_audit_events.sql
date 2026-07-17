-- Etapa 6: bitácora append-only de acciones administrativas del Platform
-- Owner sobre membresías, planes y usuarios. Mismo patrón que
-- `payment_provider_events`/`account_activation_invitations`: RLS habilitado
-- sin policies (deny-by-default), acceso exclusivamente vía service role
-- desde server-side (el panel `/admin` ya exige `requirePlatformOwner()`
-- antes de leer/escribir, así que no hace falta una policy adicional para
-- `authenticated` — evita duplicar esa autorización en dos capas que puedan
-- desincronizarse).
--
-- No hay UPDATE ni DELETE expuestos a ningún rol (ni siquiera service_role
-- los necesita: una entrada de auditoría se corrige agregando una fila nueva,
-- nunca editando la anterior). No revocamos UPDATE/DELETE de service_role a
-- nivel de grants porque service_role igual bypassea RLS y grants por
-- definición (rol de administración de Supabase) — el append-only real se
-- garantiza por convención de la capa de aplicación (`src/lib/admin/audit.ts`
-- solo expone una función `insert`, sin `update`/`delete`).

create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action varchar not null,
  entity_type varchar not null,
  entity_id varchar,
  reason text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_events is
  'Bitácora append-only de acciones administrativas (Platform Owner) sobre membresías, planes e invitaciones. No se borra ni edita historial — correcciones se registran como filas nuevas. Sin tokens, secretos ni payloads completos de proveedor en before_data/after_data/metadata.';

create index admin_audit_events_actor_user_id_idx on public.admin_audit_events (actor_user_id);
create index admin_audit_events_entity_idx on public.admin_audit_events (entity_type, entity_id);
create index admin_audit_events_created_at_idx on public.admin_audit_events (created_at desc);

alter table public.admin_audit_events enable row level security;

revoke all on public.admin_audit_events from public, anon, authenticated;
grant select, insert on public.admin_audit_events to service_role;
