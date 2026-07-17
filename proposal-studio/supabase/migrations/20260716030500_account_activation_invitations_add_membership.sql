-- Etapa 3: liga las invitaciones de activación (Etapa 2) con una membresía.
-- Nullable a propósito: una invitación administrativa manual (sin cobro
-- asociado) sigue siendo válida sin membership_id — ver
-- `src/lib/account-activation/service.ts`. Cuando exista, la invitación y la
-- membresía deben tener el mismo email (impuesto en la aplicación, no acá:
-- ver más abajo por qué no es practicable como constraint de base de datos).

alter table public.account_activation_invitations
  add column if not exists membership_id uuid references public.memberships (id) on delete set null;

comment on column public.account_activation_invitations.membership_id is
  'Membresía comercial que originó esta invitación (ej. tras confirmar un pago, Etapa 4). Null = invitación administrativa manual (Etapa 2), sin cobro asociado. Si no es null, el email de la invitación y el de la membresía deben coincidir — validado en aplicación (createActivationInvitation/activateAccount), no aquí: un check constraint no puede referenciar otra tabla en Postgres, y agregar ese chequeo mediante un trigger duplicaría la misma validación que ya hace el servicio server-side con datos frescos en el momento de emitir/consumir el token.';

create index account_activation_invitations_membership_id_idx
  on public.account_activation_invitations (membership_id)
  where membership_id is not null;
