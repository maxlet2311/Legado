-- Buckets de Storage y políticas de acceso por carpeta de usuario.
-- Rutas: brand-assets/{user_id}/..., proposal-files/{user_id}/{proposal_id}/...,
-- proposal-previews/{user_id}/{proposal_id}/..., signatures/{user_id}/...
-- Todos privados: el acceso se resuelve siempre vía Supabase Auth, nunca por URL pública.

-- brand-assets y signatures son públicos (activos de marca no sensibles, se
-- sirven directo en el documento sin URLs firmadas). proposal-files y
-- proposal-previews permanecen privados (contienen datos de clientes).
insert into storage.buckets (id, name, public)
values
  ('brand-assets', 'brand-assets', true),
  ('proposal-files', 'proposal-files', false),
  ('proposal-previews', 'proposal-previews', false),
  ('signatures', 'signatures', true)
on conflict (id) do nothing;

create policy "brand_assets_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "proposal_files_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'proposal-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'proposal-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "proposal_previews_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'proposal-previews' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'proposal-previews' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "signatures_owner_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);
