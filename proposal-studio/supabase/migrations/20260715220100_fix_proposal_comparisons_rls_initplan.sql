-- El resto de las policies del proyecto usan (select auth.uid()) para evitar
-- reevaluación por fila (advisor auth_rls_initplan); esta policy de Sprint 3
-- (20260715210000_wizard_schema.sql, no modificable) había quedado sin ese
-- patrón. La corrijo acá para no dejar abierto el único warning de
-- performance detectado tras este hardening.
drop policy if exists "proposal_comparisons_all_own" on public.proposal_comparisons;
create policy "proposal_comparisons_all_own" on public.proposal_comparisons
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
