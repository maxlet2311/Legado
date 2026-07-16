-- Sprint 4 Core: artifacts PDF asociados a una versión inmutable.
-- Una fila por (proposal_version_id, artifact_type): el motor de PDF genera
-- como máximo un PDF por versión (unique index), nunca lo reemplaza.

create table if not exists public.proposal_version_artifacts (
  id uuid primary key default gen_random_uuid(),
  proposal_version_id uuid not null references public.proposal_versions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  artifact_type varchar not null default 'pdf' check (artifact_type in ('pdf')),
  storage_path text not null,
  mime_type varchar not null default 'application/pdf',
  byte_size integer not null check (byte_size > 0),
  checksum varchar not null,
  render_engine varchar not null,
  render_engine_version varchar not null,
  created_at timestamptz not null default now()
);

create index if not exists proposal_version_artifacts_version_id_idx
  on public.proposal_version_artifacts (proposal_version_id);

create index if not exists proposal_version_artifacts_user_id_idx
  on public.proposal_version_artifacts (user_id);

-- Evita PDF duplicado para la misma versión (una fila por tipo de artifact).
create unique index if not exists proposal_version_artifacts_unique_type
  on public.proposal_version_artifacts (proposal_version_id, artifact_type);

alter table public.proposal_version_artifacts enable row level security;

-- Solo lectura + alta por el dueño. Sin UPDATE ni DELETE: el documento formal
-- generado es tan inmutable como la versión que representa.
create policy "proposal_version_artifacts_select_own" on public.proposal_version_artifacts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "proposal_version_artifacts_insert_own" on public.proposal_version_artifacts
  for insert to authenticated with check (user_id = (select auth.uid()));
