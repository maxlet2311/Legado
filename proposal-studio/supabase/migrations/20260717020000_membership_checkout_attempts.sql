-- Paso 2.1: correlación determinística de checkout por preapproval_plan
-- exclusivo. Reemplaza la correlación heurística por email + plan (Rama A de
-- la Etapa 4) por una correlación exacta vía provider_checkout_plan_id: cada
-- intento de checkout crea su propio preapproval_plan en Mercado Pago (nunca
-- reutiliza el provider_plan_id compartido del catálogo), y el webhook
-- resuelve la membership buscando por (provider, provider_checkout_plan_id)
-- — nunca por email, orden temporal ni monto.
--
-- No se persiste checkout_url: se deriva en el momento consultando
-- GET /preapproval_plan/{id} contra el proveedor (mismo criterio que
-- plan-provisioning.ts), evitando guardar una URL que podría quedar
-- desactualizada.
--
-- Privada por completo (igual que payment_provider_events): ningún rol de
-- navegador puede leer ni escribir esta tabla. Toda la lógica corre
-- server-side con el cliente de service role desde src/lib/payments/.

create table public.membership_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships (id) on delete cascade,
  membership_plan_id uuid not null references public.membership_plans (id),
  provider varchar not null,
  provider_checkout_plan_id varchar,
  provider_subscription_id varchar,
  status varchar not null default 'creating' check (
    status in (
      'creating', 'ready', 'redirected', 'matched', 'completed', 'failed', 'expired', 'canceled'
    )
  ),
  payer_id varchar,
  provider_event_id varchar,
  -- Marca de reclamo interno para evitar que dos requests concurrentes (doble
  -- click / carrera) creen dos preapproval_plan externos para el mismo
  -- intento: quien logra el UPDATE condicional creating -> locked_at is not
  -- null es quien llama a Mercado Pago; el resto reintenta o reutiliza el
  -- resultado ya persistido. No forma parte del modelo de dominio expuesto
  -- (ver src/lib/payments/checkout-attempts-repository.ts).
  locked_at timestamptz,
  expires_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.membership_checkout_attempts is
  'Un intento de checkout = un preapproval_plan exclusivo en Mercado Pago. Fuente de verdad de la correlación determinística: el webhook busca por (provider, provider_checkout_plan_id), nunca por email/orden temporal/monto. Relación 1:N histórica con memberships (una membership puede tener varios intentos por reintentos), pero solo un intento abierto (creating/ready/redirected) a la vez.';

comment on column public.membership_checkout_attempts.provider_checkout_plan_id is
  'preapproval_plan_id exclusivo de este intento, distinto del provider_plan_id compartido del catálogo (membership_plans.provider_plan_id, tratado como legacy/master). Clave real de correlación del webhook.';

comment on column public.membership_checkout_attempts.payer_id is
  'payer_id devuelto por Mercado Pago (GET /preapproval/{id}) — identificador externo del pagador, nunca usado como identidad local ni para correlacionar (correlación es siempre por provider_checkout_plan_id).';

create index membership_checkout_attempts_membership_idx on public.membership_checkout_attempts (membership_id);
create index membership_checkout_attempts_plan_idx on public.membership_checkout_attempts (membership_plan_id);
create index membership_checkout_attempts_status_idx on public.membership_checkout_attempts (status);

-- Correlación exacta: nunca dos intentos activos comparten el mismo plan
-- exclusivo, y nunca dos intentos comparten la misma suscripción ya vinculada.
create unique index membership_checkout_attempts_checkout_plan_idx
  on public.membership_checkout_attempts (provider, provider_checkout_plan_id)
  where provider_checkout_plan_id is not null;

create unique index membership_checkout_attempts_subscription_idx
  on public.membership_checkout_attempts (provider, provider_subscription_id)
  where provider_subscription_id is not null;

-- Un único intento abierto por membership: evita crear preapproval_plan
-- adicionales mientras ya hay uno en curso para la misma contratación.
create unique index membership_checkout_attempts_one_open_idx
  on public.membership_checkout_attempts (membership_id)
  where status in ('creating', 'ready', 'redirected');

create trigger set_membership_checkout_attempts_updated_at
  before update on public.membership_checkout_attempts
  for each row execute function public.set_updated_at();

alter table public.membership_checkout_attempts enable row level security;

-- Deny-by-default, igual que payment_provider_events: ningún acceso desde
-- anon/authenticated bajo ningún caso, ni siquiera de solo lectura. El
-- Platform Owner consulta esta tabla exclusivamente a través de endpoints
-- administrativos server-side (service role), nunca vía PostgREST directo
-- con su sesión.
revoke all on public.membership_checkout_attempts from anon, authenticated;

-- Crea (o reutiliza, si ya hay uno abierto) el intento de checkout de una
-- membership de forma atómica. El advisory lock transaccional serializa
-- únicamente la ventana de "verificar si hay uno abierto" + "insertar" —
-- nunca se mantiene tomado durante la llamada HTTP a Mercado Pago (eso se
-- resuelve con el UPDATE condicional sobre locked_at, ver
-- src/lib/payments/checkout-attempts-repository.ts claimCheckoutAttempt).
create or replace function public.begin_membership_checkout_attempt(
  p_membership_id uuid,
  p_membership_plan_id uuid,
  p_provider varchar
)
returns public.membership_checkout_attempts
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_attempt public.membership_checkout_attempts;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_membership_id::text, 0));

  select * into v_attempt
  from public.membership_checkout_attempts
  where membership_id = p_membership_id
    and status in ('creating', 'ready', 'redirected')
  order by created_at desc
  limit 1;

  if found then
    return v_attempt;
  end if;

  insert into public.membership_checkout_attempts (
    membership_id, membership_plan_id, provider, status, expires_at
  ) values (
    p_membership_id, p_membership_plan_id, p_provider, 'creating', now() + interval '60 minutes'
  )
  returning * into v_attempt;

  return v_attempt;
end;
$function$;

revoke all on function public.begin_membership_checkout_attempt(uuid, uuid, varchar) from public, anon, authenticated;
grant execute on function public.begin_membership_checkout_attempt(uuid, uuid, varchar) to service_role;

-- Amplía payment_provider_events.processing_status para distinguir un evento
-- de webhook correctamente firmado y procesado que no pudo correlacionarse a
-- ningún checkout attempt ("unmatched") de una falla real de procesamiento
-- ("failed") — sección 7 del alcance de Paso 2.1. Nunca se selecciona una
-- membership por fallback ante 'unmatched': el evento queda disponible para
-- reconciliación administrativa posterior (reconcileMercadoPagoPreapproval).
alter table public.payment_provider_events drop constraint payment_provider_events_processing_status_check;
alter table public.payment_provider_events add constraint payment_provider_events_processing_status_check
  check (processing_status in ('received', 'processing', 'processed', 'ignored', 'failed', 'unmatched'));
