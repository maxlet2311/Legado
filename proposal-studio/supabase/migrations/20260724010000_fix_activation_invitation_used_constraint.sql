-- El flujo de activateAccount() reclama la invitación en dos pasos: primero
-- pone status='used' + used_at=now() (used_by_user_id todavía null, porque el
-- usuario de Supabase Auth aún no existe), y recién después completa
-- used_by_user_id una vez creado el usuario. El constraint original exigía
-- que used_by_user_id no sea null en el mismo momento en que status='used',
-- lo que hacía fallar ese primer UPDATE en el 100% de los casos.
alter table account_activation_invitations
  drop constraint account_activation_invitations_used_consistency;

alter table account_activation_invitations
  add constraint account_activation_invitations_used_consistency check (
    (status = 'used') = (used_at is not null)
  );
