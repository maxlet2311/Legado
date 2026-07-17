-- Etapa 4: bitácora de eventos crudos recibidos de proveedores de pago
-- (Mercado Pago). Es la base de la idempotencia del webhook: antes de
-- procesar cualquier notificación se busca/inserta acá por una clave
-- idempotente y se marca el resultado del procesamiento.
--
-- No expuesta por RLS a ningún rol de navegador (ni siquiera al Platform
-- Owner): contiene payloads crudos del proveedor y solo debe leerse/escribirse
-- con el cliente de service role desde `src/lib/payments/`.

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider varchar not null,
  provider_event_id varchar,
  event_type varchar not null,
  provider_resource_id varchar,
  signature_valid boolean not null default false,
  processing_status varchar not null default 'received' check (
    processing_status in ('received', 'processing', 'processed', 'ignored', 'failed')
  ),
  attempt_count integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_provider_events is
  'Bitácora de eventos crudos de proveedores de pago (Mercado Pago). Idempotencia vía provider_event_id cuando el proveedor lo garantiza único; si no, ver payment_provider_events_idempotency_idx. error_message se trunca en aplicación antes de insertar — nunca guardar secretos ni la firma completa.';

-- Mercado Pago no siempre entrega un id de notificación único y estable
-- (varía según el topic: `payment`, `subscription_preapproval`,
-- `subscription_authorized_payment`). Cuando `provider_event_id` viene
-- presente en el payload se usa tal cual; cuando no, la aplicación construye
-- una clave sintética determinística a partir de (event_type,
-- provider_resource_id, y el timestamp `ts` de la firma) antes de insertar —
-- ver `src/lib/payments/providers/mercado-pago.ts` (`buildIdempotencyKey`).
-- Esa clave sintética se guarda en esta misma columna, así que el único índice
-- de unicidad necesario es sobre `(provider, provider_event_id)`.
create unique index payment_provider_events_idempotency_idx
  on public.payment_provider_events (provider, provider_event_id)
  where provider_event_id is not null;

create index payment_provider_events_resource_idx
  on public.payment_provider_events (provider, provider_resource_id);

create index payment_provider_events_status_idx
  on public.payment_provider_events (processing_status);

create trigger set_payment_provider_events_updated_at
  before update on public.payment_provider_events
  for each row execute function public.set_updated_at();

alter table public.payment_provider_events enable row level security;

-- Deny-by-default: sin policies para anon/authenticated bajo ningún caso.
-- Toda lectura/escritura ocurre exclusivamente con service role desde el
-- Route Handler del webhook y la reconciliación administrativa.
revoke all on public.payment_provider_events from anon, authenticated;
