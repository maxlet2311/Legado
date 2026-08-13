-- proposal_events_insert_owner (20260715170015_rls_policies.sql, reafirmada
-- en 20260718000006) solo valida que el `proposal_id` referenciado pertenezca
-- al usuario autenticado; nunca restringe el `user_id` de la fila insertada.
-- Un cliente autenticado puede insertar un evento en su propia propuesta con
-- un `user_id` (autor) arbitrario:
--   supabase.from('proposal_events').insert({ proposal_id: <mia>, user_id: <ajeno>, ... })
-- El impacto está acotado a propuestas propias (no hay lectura/escritura
-- cruzada entre usuarios), pero rompe la integridad del actor en el log de
-- auditoría. Se agrega la restricción que faltaba.

drop policy if exists "proposal_events_insert_owner" on public.proposal_events;
create policy "proposal_events_insert_owner" on public.proposal_events
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_events.proposal_id and p.user_id = (select auth.uid())
    )
  );
