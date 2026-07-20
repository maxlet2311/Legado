-- La columna `proposals.orientation` existe desde 20260715170005_proposals.sql
-- (default 'portrait') y el renderer (`document-shell.tsx`, `page-geometry.ts`)
-- ya la respeta para armar el tamaño de página del PDF/preview, pero ningún
-- RPC ni la UI del wizard permitían cambiarla — quedaba fija en 'portrait'
-- para siempre. Mismo patrón de ownership que `archive_proposal` /
-- `mark_duplication_reviewed` (RPC security definer, sin policy de UPDATE
-- directo sobre `proposals`, ver 20260721010000_harden_proposals_state_writes.sql).

create or replace function public.update_proposal_orientation(p_id uuid, p_orientation varchar)
returns table (id uuid, orientation varchar)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if p_orientation not in ('portrait', 'landscape') then
    raise exception 'Orientación inválida' using errcode = '22023';
  end if;

  update public.proposals
  set orientation = p_orientation
  where proposals.id = p_id and proposals.user_id = v_user_id
  returning proposals.id into v_id;

  if v_id is null then
    raise exception 'Propuesta no encontrada o sin acceso' using errcode = 'P0002';
  end if;

  return query select v_id, p_orientation;
end;
$$;

revoke execute on function public.update_proposal_orientation(uuid, varchar) from public;
grant execute on function public.update_proposal_orientation(uuid, varchar) to authenticated;
revoke execute on function public.update_proposal_orientation(uuid, varchar) from anon;
