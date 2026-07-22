-- Sprint A (go-live): estados comerciales, separados del `status` técnico
-- existente (draft/completed/exported/archived, que refleja el progreso del
-- documento y ya tiene sus propias reglas en archive_proposal/finalize_proposal).
-- `commercial_status` refleja en cambio la etapa de venta (Borrador, Enviada,
-- En negociación, Aceptada, Rechazada, Archivada) y es editable libremente por
-- el asesor en cualquier momento, sin las validaciones de finalize_proposal.

alter table public.proposals
  add column commercial_status varchar not null default 'draft'
  check (commercial_status in ('draft', 'sent', 'negotiation', 'accepted', 'rejected', 'archived'));

create index idx_proposals_commercial_status on public.proposals (user_id, commercial_status);

-- Mismo patrón que archive_proposal/update_proposal_meta (ver
-- harden_proposals_state_writes.sql): sin policy de UPDATE general, la
-- escritura pasa por un RPC security definer que revalida ownership.
create or replace function public.update_proposal_commercial_status(p_id uuid, p_status varchar)
returns table (id uuid, commercial_status varchar)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
  v_previous_status varchar;
  v_status varchar;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  -- `for update` bloquea la fila hasta el commit de esta transacción: bajo
  -- dos cambios concurrentes (dos pestañas) el segundo espera y lee el
  -- `commercial_status` ya actualizado por el primero, así el evento de
  -- auditoría del segundo siempre registra el `previous_status` real y
  -- nunca uno obsoleto (sin esto, un SELECT previo sin lock podría quedar
  -- desactualizado frente al UPDATE que corre después).
  select p.commercial_status into v_previous_status
  from public.proposals p
  where p.id = p_id and p.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  update public.proposals
  set commercial_status = p_status
  where proposals.id = p_id and proposals.user_id = v_user_id
  returning proposals.id, proposals.commercial_status into v_id, v_status;

  insert into public.proposal_events (proposal_id, user_id, event_type, payload)
  values (
    v_id, v_user_id, 'status_changed',
    jsonb_build_object('commercial_status', v_status, 'previous_commercial_status', v_previous_status)
  );

  return query select v_id, v_status;
end;
$$;

-- "revoke ... from public" no elimina el privilegio directo que Supabase
-- otorga a anon por default privileges (ver 20260721020000): revocarlo
-- explícito de anon también.
revoke execute on function public.update_proposal_commercial_status(uuid, varchar) from public;
revoke execute on function public.update_proposal_commercial_status(uuid, varchar) from anon;
grant execute on function public.update_proposal_commercial_status(uuid, varchar) to authenticated;
