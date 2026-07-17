-- Etapa 3: fuente de verdad para membresías. `user_id` nullable a propósito:
-- una membresía puede existir (ej. autorizada manualmente, o más adelante
-- creada por la confirmación de Mercado Pago) antes de que exista la cuenta,
-- y se vincula recién cuando el usuario activa su cuenta (ver
-- `link_membership_to_user` en la migración de funciones y
-- `src/lib/account-activation/service.ts`).
--
-- `user_id` referencia `public.profiles(id)` (no `auth.users(id)` directo)
-- siguiendo el mismo patrón que `brands`/`clients`/`proposals`: profiles.id es
-- 1:1 con auth.users.id (garantizado por `handle_new_user`), y las
-- membresías son un concepto de producto atado al usuario de la app, no a la
-- identidad cruda de Auth.
--
-- No se guarda `access_status`: el acceso se deriva de `status` + fechas de
-- forma determinística en `src/lib/memberships/access.ts`
-- (`evaluateMembershipAccess`). Duplicarlo como columna abriría la puerta a
-- que quede desincronizado del estado/fechas reales sin que ninguna
-- migración o webhook lo actualice.

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email varchar not null,
  plan_id uuid not null references public.membership_plans (id),
  status varchar not null default 'pending' check (
    status in (
      'pending', 'authorized', 'active', 'past_due', 'grace_period',
      'paused', 'canceled', 'expired', 'suspended'
    )
  ),
  provider varchar,
  provider_customer_id varchar,
  provider_subscription_id varchar,
  provider_status varchar,
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  last_payment_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_email_normalized check (email = lower(email)),
  constraint memberships_period_order check (
    current_period_start is null or current_period_end is null
    or current_period_end >= current_period_start
  ),
  constraint memberships_grace_after_period check (
    grace_period_end is null or current_period_end is null
    or grace_period_end >= current_period_end
  )
);

comment on table public.memberships is
  'Fuente de verdad de membresías. No se borra historial (compensaciones/errores se corrigen con nuevas filas de estado, no con DELETE). Ver membership_status_history para la bitácora de transiciones.';

create index memberships_email_idx on public.memberships (email);
create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_status_idx on public.memberships (status);

-- Único por (provider, provider_subscription_id) cuando ambos existen: evita
-- procesar la misma suscripción externa dos veces como membresías distintas.
create unique index memberships_provider_subscription_idx
  on public.memberships (provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

-- Una sola membresía "vigente" por usuario ya activado. Estados considerados
-- vigentes: los que representan una contratación con la que todavía hay que
-- hacer algo (incluye `pending`: se prefiere impedir una segunda
-- contratación paralela antes que permitir carritos duplicados; la
-- contrapartida — pendientes abandonados que bloquean reintentos — queda
-- documentada como deuda para una etapa posterior, ej. expiración automática
-- de `pending` tras N horas).
create unique index memberships_one_current_per_user_idx
  on public.memberships (user_id)
  where user_id is not null and status in (
    'pending', 'authorized', 'active', 'past_due', 'grace_period', 'paused'
  );

-- Mismo criterio de unicidad pero por email, mientras todavía no hay usuario
-- vinculado (pago/autorización antes de que la cuenta exista).
create unique index memberships_one_current_per_email_idx
  on public.memberships (email)
  where user_id is null and status in (
    'pending', 'authorized', 'active', 'past_due', 'grace_period', 'paused'
  );

create trigger set_memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();
