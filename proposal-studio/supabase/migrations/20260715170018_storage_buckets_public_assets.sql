-- Corrección posterior a la migración inicial: brand-assets y signatures
-- se sirven públicamente (no contienen datos de clientes).
update storage.buckets set public = true where id in ('brand-assets', 'signatures');
