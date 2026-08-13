-- Hardening de auditoría RLS (residual de la auditoría de proposals en
-- 20260721010000_harden_proposals_state_writes.sql): ese hardening retiró el
-- UPDATE directo de `proposals` porque saltaba las reglas de negocio de los
-- RPCs `security definer`, pero nunca se extendió a las tablas hermanas
-- proposal_narratives/alternatives/benefits/comparisons, que siguen teniendo
-- `FOR ALL ... using(user_id = auth.uid())`. Esto permite:
--   supabase.from('proposal_narratives').update({...}).eq('id', ...)
-- que escribe sin pasar por `p_expected_revision` en upsert_proposal_narrative
-- (20260715220000_optimistic_concurrency.sql), saltándose por completo la
-- garantía de concurrencia optimista que esa migración introdujo.
--
-- Los RPCs (upsert_proposal_narrative/alternative/benefit/comparison) siguen
-- funcionando sin cambios: son `security definer`, corren con privilegios del
-- owner de la función y por lo tanto no dependen de esta policy de UPDATE
-- (mismo mecanismo ya validado para `proposals`). Solo se retira la vía de
-- escritura directa que ningún flujo de la app usa hoy.

drop policy if exists "proposal_narratives_all_own" on public.proposal_narratives;
create policy "proposal_narratives_select_own" on public.proposal_narratives
  for select to authenticated using (user_id = (select auth.uid()));
create policy "proposal_narratives_insert_own" on public.proposal_narratives
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "proposal_narratives_delete_own" on public.proposal_narratives
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "proposal_alternatives_all_own" on public.proposal_alternatives;
create policy "proposal_alternatives_select_own" on public.proposal_alternatives
  for select to authenticated using (user_id = (select auth.uid()));
create policy "proposal_alternatives_insert_own" on public.proposal_alternatives
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "proposal_alternatives_delete_own" on public.proposal_alternatives
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "proposal_benefits_all_own" on public.proposal_benefits;
create policy "proposal_benefits_select_own" on public.proposal_benefits
  for select to authenticated using (user_id = (select auth.uid()));
create policy "proposal_benefits_insert_own" on public.proposal_benefits
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "proposal_benefits_delete_own" on public.proposal_benefits
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "proposal_comparisons_all_own" on public.proposal_comparisons;
create policy "proposal_comparisons_select_own" on public.proposal_comparisons
  for select to authenticated using (user_id = (select auth.uid()));
create policy "proposal_comparisons_insert_own" on public.proposal_comparisons
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "proposal_comparisons_delete_own" on public.proposal_comparisons
  for delete to authenticated using (user_id = (select auth.uid()));

comment on policy "proposal_narratives_select_own" on public.proposal_narratives is
  'Ownership por user_id. No hay policy de UPDATE: las escrituras pasan exclusivamente por upsert_proposal_narrative (security definer, valida p_expected_revision).';
comment on policy "proposal_alternatives_select_own" on public.proposal_alternatives is
  'Ownership por user_id. No hay policy de UPDATE: las escrituras pasan exclusivamente por upsert_proposal_alternative (security definer, valida p_expected_revision).';
comment on policy "proposal_benefits_select_own" on public.proposal_benefits is
  'Ownership por user_id. No hay policy de UPDATE: las escrituras pasan exclusivamente por upsert_proposal_benefit (security definer, valida p_expected_revision).';
comment on policy "proposal_comparisons_select_own" on public.proposal_comparisons is
  'Ownership por user_id. No hay policy de UPDATE: las escrituras pasan exclusivamente por upsert_proposal_comparison (security definer, valida p_expected_revision).';
