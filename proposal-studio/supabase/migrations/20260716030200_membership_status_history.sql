-- Etapa 3: bitácora inmutable de transiciones de estado de membresías.
-- Append-only (sin updated_at, sin trigger de update): un cambio de estado ya
-- ocurrido no se corrige editando su fila histórica, se agrega una fila
-- nueva. No guarda secretos ni payloads completos de proveedores — solo
-- `reason`/`metadata` mínima para reconstruir qué pasó y por qué.

create table public.membership_status_history (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships (id) on delete cascade,
  previous_status varchar,
  new_status varchar not null check (
    new_status in (
      'pending', 'authorized', 'active', 'past_due', 'grace_period',
      'paused', 'canceled', 'expired', 'suspended'
    )
  ),
  reason text,
  source varchar not null check (source in ('system', 'admin', 'payment_provider', 'migration', 'activation')),
  actor_user_id uuid references public.profiles (id) on delete set null,
  external_event_id varchar,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.membership_status_history is
  'Bitácora append-only de transiciones de membership.status. previous_status null representa la creación inicial de la membresía.';

create index membership_status_history_membership_id_idx
  on public.membership_status_history (membership_id, created_at desc);

-- Idempotencia futura: si el mismo evento del proveedor de pagos llega dos
-- veces (reintento de webhook en la Etapa 4), no debe generar dos filas de
-- historial distintas.
create unique index membership_status_history_external_event_id_idx
  on public.membership_status_history (external_event_id)
  where external_event_id is not null;
