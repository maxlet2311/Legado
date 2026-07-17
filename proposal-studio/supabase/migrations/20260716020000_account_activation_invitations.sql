-- Etapa 2: activación restringida de cuentas. No existe registro público:
-- una cuenta solo puede crearse consumiendo una invitación válida emitida acá.
-- Ver `src/lib/account-activation/` para el servicio server-side que opera
-- sobre esta tabla (siempre con el cliente de service role, nunca desde el
-- navegador).

create table public.account_activation_invitations (
  id uuid primary key default gen_random_uuid(),
  email varchar not null,
  token_hash text not null,
  status varchar not null default 'pending' check (status in ('pending', 'used', 'revoked', 'expired')),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_user_id uuid references auth.users (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint account_activation_invitations_email_lowercase check (email = lower(email)),
  constraint account_activation_invitations_used_consistency check (
    (status = 'used') = (used_at is not null)
    and (status = 'used') = (used_by_user_id is not null)
  )
);

comment on table public.account_activation_invitations is
  'Invitaciones de activación de cuenta. Uso único, con expiración y estado. El token en texto plano nunca se persiste, solo su hash (token_hash). RLS habilitado sin policies: acceso exclusivamente vía service role desde server-side.';

-- Búsqueda de la invitación por el token recibido en el link de activación.
create unique index account_activation_invitations_token_hash_idx
  on public.account_activation_invitations (token_hash);

-- A lo sumo una invitación pendiente por email: evita invitaciones activas
-- duplicadas y es defensa adicional ante una carrera al emitir una nueva
-- invitación mientras otra pendiente para el mismo email sigue viva (además
-- de la revocación explícita que hace el servicio antes de insertar).
create unique index account_activation_invitations_pending_email_idx
  on public.account_activation_invitations (email)
  where status = 'pending';

create index account_activation_invitations_email_idx
  on public.account_activation_invitations (email);

create trigger set_account_activation_invitations_updated_at
  before update on public.account_activation_invitations
  for each row execute function public.set_updated_at();

alter table public.account_activation_invitations enable row level security;

-- Sin policies: RLS deniega por defecto tanto a `anon` como a `authenticated`.
-- No hay ningún caso de uso donde el navegador deba leer o escribir esta
-- tabla directamente (ni usuarios comunes ni el Platform Owner): toda la
-- emisión, validación y consumo de invitaciones ocurre server-side con el
-- cliente de service role (bypassea RLS), guardado detrás de
-- `requirePlatformOwner()` para las operaciones administrativas.
revoke all on public.account_activation_invitations from anon, authenticated;
