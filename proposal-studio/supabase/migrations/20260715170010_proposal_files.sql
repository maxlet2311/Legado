create table if not exists public.proposal_files (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_type varchar not null check (file_type in ('pdf', 'preview')),
  storage_path text not null,
  file_size integer not null,
  mime_type varchar not null,
  checksum varchar not null,
  file_name varchar not null,
  metadata jsonb not null default '{}',
  generated_at timestamptz not null default now()
);

create index if not exists proposal_files_proposal_id_idx on public.proposal_files (proposal_id);
create index if not exists proposal_files_user_id_idx on public.proposal_files (user_id);
