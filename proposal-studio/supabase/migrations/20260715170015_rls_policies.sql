-- Row Level Security: aislamiento estricto por asesor (user_id = auth.uid()).
-- No se implementa aún acceso público anónimo vía share_token (sprint posterior).

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.clients enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_narratives enable row level security;
alter table public.proposal_sections enable row level security;
alter table public.proposal_alternatives enable row level security;
alter table public.proposal_benefits enable row level security;
alter table public.proposal_files enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.proposal_events enable row level security;
alter table public.proposal_templates enable row level security;
alter table public.library_items enable row level security;

-- profiles: cada asesor accede únicamente a su propio perfil.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- brands: solo el asesor propietario.
create policy "brands_all_own" on public.brands
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- clients: solo el asesor propietario.
create policy "clients_all_own" on public.clients
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- proposals: CRUD completo solo para el asesor propietario.
create policy "proposals_all_own" on public.proposals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tablas dependientes con user_id denormalizado: evaluación directa sin subconsultas.
create policy "proposal_narratives_all_own" on public.proposal_narratives
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "proposal_sections_all_own" on public.proposal_sections
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "proposal_alternatives_all_own" on public.proposal_alternatives
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "proposal_benefits_all_own" on public.proposal_benefits
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "proposal_files_all_own" on public.proposal_files
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "proposal_versions_all_own" on public.proposal_versions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- proposal_events: no denormaliza user_id como propietario (user_id es el ejecutor,
-- puede ser nulo). Visibilidad restringida al dueño de la propuesta referenciada.
create policy "proposal_events_select_owner" on public.proposal_events
  for select to authenticated using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_events.proposal_id and p.user_id = auth.uid()
    )
  );

create policy "proposal_events_insert_owner" on public.proposal_events
  for insert to authenticated with check (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_events.proposal_id and p.user_id = auth.uid()
    )
  );

-- proposal_templates: plantillas de sistema legibles por todos los autenticados;
-- plantillas privadas solo por su propietario.
create policy "proposal_templates_select" on public.proposal_templates
  for select to authenticated using (is_system = true or user_id = auth.uid());

create policy "proposal_templates_insert_own" on public.proposal_templates
  for insert to authenticated with check (is_system = false and user_id = auth.uid());

create policy "proposal_templates_update_own" on public.proposal_templates
  for update to authenticated using (is_system = false and user_id = auth.uid())
  with check (is_system = false and user_id = auth.uid());

create policy "proposal_templates_delete_own" on public.proposal_templates
  for delete to authenticated using (is_system = false and user_id = auth.uid());

-- library_items: estrictamente personal.
create policy "library_items_all_own" on public.library_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
