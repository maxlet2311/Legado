-- Etapa 8 (reproducibilidad): optimización de rendimiento de RLS ya aplicada
-- en remoto (mismo patrón que 20260715220100_fix_proposal_comparisons_rls_initplan.sql,
-- que sí quedó versionado, para proposal_comparisons). Envuelve `auth.uid()`
-- en `(select auth.uid())` para que el planner lo evalúe una sola vez por
-- consulta (initplan) en vez de una vez por fila. No cambia ninguna
-- decisión de acceso: las condiciones son semánticamente idénticas.
--
-- Cubre las policies creadas en 20260715170015_rls_policies.sql,
-- 20260715170017_storage_buckets.sql y
-- 20260717030000_proposal_versions_immutable_rls.sql que en remoto ya están
-- optimizadas pero cuyas migraciones locales todavía las crean con
-- `auth.uid()` sin envolver.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "brands_all_own" on public.brands;
create policy "brands_all_own" on public.brands
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "clients_all_own" on public.clients;
create policy "clients_all_own" on public.clients
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "proposals_all_own" on public.proposals;
create policy "proposals_all_own" on public.proposals
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "proposal_narratives_all_own" on public.proposal_narratives;
create policy "proposal_narratives_all_own" on public.proposal_narratives
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "proposal_sections_all_own" on public.proposal_sections;
create policy "proposal_sections_all_own" on public.proposal_sections
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "proposal_alternatives_all_own" on public.proposal_alternatives;
create policy "proposal_alternatives_all_own" on public.proposal_alternatives
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "proposal_benefits_all_own" on public.proposal_benefits;
create policy "proposal_benefits_all_own" on public.proposal_benefits
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "proposal_files_all_own" on public.proposal_files;
create policy "proposal_files_all_own" on public.proposal_files
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "proposal_events_select_owner" on public.proposal_events;
create policy "proposal_events_select_owner" on public.proposal_events
  for select to authenticated using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_events.proposal_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "proposal_events_insert_owner" on public.proposal_events;
create policy "proposal_events_insert_owner" on public.proposal_events
  for insert to authenticated with check (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_events.proposal_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "proposal_templates_select" on public.proposal_templates;
create policy "proposal_templates_select" on public.proposal_templates
  for select to authenticated using (is_system = true or user_id = (select auth.uid()));

drop policy if exists "proposal_templates_insert_own" on public.proposal_templates;
create policy "proposal_templates_insert_own" on public.proposal_templates
  for insert to authenticated with check (is_system = false and user_id = (select auth.uid()));

drop policy if exists "proposal_templates_update_own" on public.proposal_templates;
create policy "proposal_templates_update_own" on public.proposal_templates
  for update to authenticated using (is_system = false and user_id = (select auth.uid()))
  with check (is_system = false and user_id = (select auth.uid()));

drop policy if exists "proposal_templates_delete_own" on public.proposal_templates;
create policy "proposal_templates_delete_own" on public.proposal_templates
  for delete to authenticated using (is_system = false and user_id = (select auth.uid()));

drop policy if exists "library_items_all_own" on public.library_items;
create policy "library_items_all_own" on public.library_items
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "proposal_versions_select_own" on public.proposal_versions;
create policy "proposal_versions_select_own" on public.proposal_versions
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "proposal_versions_insert_own" on public.proposal_versions;
create policy "proposal_versions_insert_own" on public.proposal_versions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "brand_assets_owner_rw" on storage.objects;
create policy "brand_assets_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "proposal_files_owner_rw" on storage.objects;
create policy "proposal_files_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'proposal-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'proposal-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "proposal_previews_owner_rw" on storage.objects;
create policy "proposal_previews_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'proposal-previews' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'proposal-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "signatures_owner_rw" on storage.objects;
create policy "signatures_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'signatures' and (storage.foldername(name))[1] = (select auth.uid())::text);
