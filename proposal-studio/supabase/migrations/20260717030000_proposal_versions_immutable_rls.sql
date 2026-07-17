-- Sprint 4 (hardening): `proposal_versions` es una fotografía inmutable de
-- una propuesta (ver 20260715233100_emit_proposal_version.sql), pero su
-- policy original ("proposal_versions_all_own", 20260715170015_rls_policies.sql)
-- usa `for all`, que también habilita UPDATE/DELETE vía PostgREST — un
-- usuario autenticado podría alterar o borrar sus propias versiones emitidas
-- directamente, socavando la garantía de "historial inmutable" en la que se
-- basa todo el motor de PDF (`proposal_version_artifacts` ya sigue el patrón
-- correcto: solo SELECT + INSERT). Esto reemplaza la policy por SELECT +
-- INSERT únicamente, sin tocar ninguna lectura ni el flujo de emisión
-- (`emit_proposal_version` solo hace SELECT + INSERT sobre esta tabla).

drop policy if exists "proposal_versions_all_own" on public.proposal_versions;

create policy "proposal_versions_select_own" on public.proposal_versions
  for select to authenticated
  using (user_id = auth.uid());

create policy "proposal_versions_insert_own" on public.proposal_versions
  for insert to authenticated
  with check (user_id = auth.uid());
