-- Etapa 8 (reproducibilidad): un asesor tiene a lo sumo una marca (invariante
-- ya asumido por el código, ver comentario en
-- 20260715234200_fix_emit_proposal_version_brand_lookup.sql: "brands tiene
-- unique(user_id)"). La constraint existe en remoto desde el inicio del
-- proyecto pero nunca quedó versionada como migración propia.

alter table public.brands
  add constraint brands_user_id_key unique (user_id);
