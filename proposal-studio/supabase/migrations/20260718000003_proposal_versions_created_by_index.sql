-- Etapa 8 (reproducibilidad): índice existente en remoto sobre
-- proposal_versions.created_by (usado para resolver el asesor que emitió una
-- versión), nunca versionado en una migración.

create index if not exists proposal_versions_created_by_idx
  on public.proposal_versions (created_by);
