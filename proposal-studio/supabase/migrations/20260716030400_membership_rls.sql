-- Etapa 3: RLS de membership_plans / memberships / membership_status_history.

-- membership_plans: catálogo público de solo lectura. Cualquiera (anon o
-- autenticado) puede leer planes activos — es lo que eventualmente alimenta
-- una página de precios — pero nadie puede escribir desde el navegador
-- (administración queda para una acción server-side futura con
-- `requirePlatformOwner`, Etapa 3+).
alter table public.membership_plans enable row level security;

create policy "membership_plans_select_active" on public.membership_plans
  for select to anon, authenticated
  using (is_active = true);

revoke insert, update, delete on public.membership_plans from anon, authenticated;

-- memberships: cada usuario autenticado lee únicamente su propia membresía.
-- Sin policies de insert/update/delete: ninguna mutación es posible desde el
-- navegador bajo ningún caso (ni siquiera el propio dueño) — toda escritura
-- ocurre exclusivamente a través de `create_membership`,
-- `transition_membership_status` y `link_membership_to_user`
-- (`security definer`, ejecutadas solo con service role desde
-- `src/lib/memberships/`). `anon` no tiene ningún acceso.
alter table public.memberships enable row level security;

create policy "memberships_select_own" on public.memberships
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.memberships from anon;
revoke insert, update, delete on public.memberships from authenticated;

-- membership_status_history: deny-by-default para anon y authenticated. Sin
-- policies todavía porque las filas incluyen `reason`/`source`/`metadata`
-- que no están pensadas para exponerse tal cual sin una pantalla de cuenta
-- dedicada que las filtre/formatee (Etapa 3 solo construye
-- `/account/membership` con el estado actual, no un historial completo).
-- Reevaluar cuando exista esa pantalla.
alter table public.membership_status_history enable row level security;

revoke all on public.membership_status_history from anon, authenticated;
