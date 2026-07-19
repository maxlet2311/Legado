# Estado del proyecto

Este archivo no existía antes del Lote A (admin: navegación + invitaciones + auditoría, 2026-07-18); se crea acá con el estado mínimo relevante a ese trabajo. No pretende ser un changelog completo del proyecto — para el historial de sprints/etapas previos ver `docs/MEMBERSHIP_OPERATIONS.md` y los mensajes de commit.

## Lote A — Admin: navegación, invitaciones, auditoría (2026-07-18)

Implementado (ver `docs/ADMIN_UI_MAP.md` sección 10 para el detalle técnico completo):

- Acceso visible a `/admin` desde el sidebar global, gateado por `is_platform_owner` (UX únicamente — el guard real sigue siendo `requirePlatformOwner()` server-side).
- `/admin/invitations`: listar (paginado, filtro por estado y búsqueda por email, contadores por estado), emitir, cancelar, forzar vencimiento, reenviar.
- `/admin/audit`: listar (paginado, filtros por actor/acción/entidad/fecha), detalle expandible con JSON sanitizado y diff antes/después.
- Backend nuevo: `listActivationInvitationsForAdmin` (`src/lib/account-activation/admin-queries.ts`), `listAdminAuditEvents` (`src/lib/admin/audit-queries.ts`), `sanitizeForDisplay` (`src/lib/admin/sanitize.ts`), `buildAuditDiff` (`src/lib/admin/audit-diff.ts`).
- Limpieza de navegación muerta: "Soporte" (sidebar), "Borradores"/"Actividad de Clientes"/buscador/"Generar PDF"/notificaciones (top-navigation) — todos sin backend ni ruta real, eliminados en vez de dejados como stubs.

Validado: `npx tsc --noEmit` sin errores, `npm run lint` sin errores, `npm test` 105/105 tests pasando (incluye 13 tests nuevos para el sanitizador y el diff), `npm run build` compila y genera las rutas `/admin/invitations` y `/admin/audit`. No verificado manualmente en navegador (sin entorno de browser disponible): acceso condicional por rol, navegación mobile, y entrega real de emails quedan como QA manual pendiente.

Explícitamente fuera de alcance de este lote (no implementado, no hay stubs ni links muertos apuntando a esto):

- `/admin/payments` (reconciliación Mercado Pago, eventos no matcheados, limpieza de checkouts vencidos) — Lote B.
- Crear membresía manual desde `/admin/memberships` — Lote C.
- Runbook operativo de confirmación manual de Google OAuth / Auth Hook — Lote C.
- Estado de entrega de email por invitación como historial persistido (la tabla `account_activation_invitations` no tiene esa columna; solo se conoce en el momento de crear/reenviar).

## Lote B — Admin: pagos (reconciliación, eventos, checkouts) (2026-07-18)

Hallazgo previo a implementar (corrige una suposición del audit/mapa original): `POST /api/admin/payments/mercado-pago/reconcile` **no es una reconciliación masiva** — el endpoint real (`reconcileMercadoPagoPreapproval`, `src/lib/payments/reconciliation.ts`) recibe un único `preapprovalId` (id de suscripción de Mercado Pago) y reconcilia esa suscripción puntual, igual que el propio webhook. La UI se diseñó acorde a este contrato real, no al asumido originalmente.

Implementado:

- Nav interna: ítem "Pagos" agregado a `ADMIN_NAV` (`src/app/(app)/admin/layout.tsx`) → `/admin/payments`. Estructura elegida: **rutas separadas** (`/admin/payments`, `/admin/payments/events`, `/admin/payments/checkouts`), no tabs — mismo patrón que Lote A (`/admin/invitations`, `/admin/audit` como páginas completas) y que subrutas ya existentes de membresías (`/admin/memberships/health`, `/admin/memberships/migrate-users`, enlazadas desde la página padre en vez de tener su propio ítem en `ADMIN_NAV`). No existe ningún precedente de tabs en el panel admin, así que no se introduce el patrón para 3 pantallas.
- `/admin/payments`: resumen con métricas cheap (counts con filtro, sin table scans): eventos no asociados, eventos fallidos, checkouts abiertos vencidos sin limpiar, checkouts ya limpiados. Última reconciliación manual mostrada leyendo `admin_audit_events` con `action = "payments.reconcile_subscription"` (reutiliza `listAdminAuditEvents` de Lote A). Panel de reconciliación manual de una suscripción puntual.
- `/admin/payments/events`: lista paginada de `payment_provider_events` con filtros server-side (estado de procesamiento, con/sin error, tipo de evento, id interno, rango de fechas) vía querystring. Vista "No asociados" accesible como filtro de estado (`?status=unmatched`) y linkeada desde la métrica del resumen. Detalle expandible con payload sanitizado (`sanitizeForDisplay`, reutilizado de Lote A) y aviso explícito de que no existe un botón de reintento real (no hay endpoint de reintento en el backend — documentado, no fabricado).
- `/admin/payments/checkouts`: lista paginada de `membership_checkout_attempts` con filtros (estado real del constraint, plan, proveedor, suscripción vinculada sí/no, búsqueda por email de la membresía asociada, rango de fechas). Detalle expandible con timeline (vencimiento/completado/cancelado), identificadores enmascarados y metadata sanitizada. Panel de limpieza de vencidos (`Dialog` de confirmación simple — operación no destructiva e idempotente, solo cambia `status` a `expired`, nunca llama a Mercado Pago) con resumen de resultado y refresco de la lista.
- Reconciliación manual: formulario de un solo `preapprovalId` + `Dialog` reforzado con checkbox de confirmación explícita ("no hay dry-run, puede aplicar cambios reales") — mismo nivel de fricción que las acciones de membresías/invitaciones más un paso extra, justificado porque no hay preview del resultado. Resultado mostrado con `buildReconcileResultSummary` (`src/lib/payments/reconcile-result-summary.ts`, con tests), nunca oculta fallos parciales (`matched: false` con motivo, o `matched: true` sin cambios aplicados con motivo).
- Backend nuevo (lecturas): `listCheckoutAttemptsForAdmin`, `countExpiredPendingCheckoutAttempts`, `countExpiredCheckoutAttempts` (`src/lib/payments/checkout-attempts-repository.ts`); `listPaymentProviderEvents`, `countPaymentProviderEventsByStatus` (`src/lib/payments/webhook-events.ts`). Todas paginadas/acotadas, sin table scans (usan los índices ya existentes por `processing_status`/`status`).
- Backend nuevo (escrituras): Server Actions `reconcileSubscriptionAction`, `cleanupExpiredCheckoutAttemptsAction` (`src/app/(app)/admin/payments/actions.ts`) — llaman directo a los mismos servicios que ya usan las rutas API (`reconcileMercadoPagoPreapproval`, `cleanupExpiredCheckoutAttempts`) en vez de hacer `fetch` interno, mismo criterio que `resyncMembershipAction`. Ambas re-chequean `requirePlatformOwner()` de forma independiente y escriben en `admin_audit_events` (acciones nuevas: `payments.reconcile_subscription`, `payments.cleanup_expired_checkouts` — antes esta lógica no auditaba nada en absoluto).

Gaps documentados (no implementados, no fabricados):

- No hay botón "Reintentar" en eventos: no existe un endpoint de reintento idempotente sobre un evento de webhook puntual en el backend real.
- No hay filtro "con error" para checkouts: `membership_checkout_attempts` no tiene una columna de error (solo `payment_provider_events` la tiene).
- No hay vínculo directo membership/usuario en la tabla de eventos de pago: `payment_provider_events` no tiene ninguna columna de relación (`Relationships: []` en los tipos generados) — la única correlación posible es indirecta vía el proveedor real, que es exactamente lo que hace la reconciliación manual.
- La reconciliación sigue sin ser masiva porque el backend real tampoco lo es — no se construyó una ilusión de "reconciliar todo" que el endpoint no soporta.

Validado: `npx tsc --noEmit` sin errores, `npm run lint` sin errores ni warnings, `npm test` 116/116 tests pasando (11 nuevos: `reconcile-result-summary.test.ts` y `admin-filters.test.ts`), `npm run build` compila y genera `/admin/payments`, `/admin/payments/events`, `/admin/payments/checkouts`. No verificado manualmente en navegador (sin entorno de browser disponible): click-through real de los diálogos de confirmación, y comportamiento real contra la API de Mercado Pago (no se ejecutó ninguna reconciliación real contra el proveedor durante este trabajo).

Explícitamente fuera de alcance de este lote (Lote C, sin tocar):

- Crear membresía manual desde `/admin/memberships`.
- Runbook operativo de confirmación manual de Google OAuth / Auth Hook.

## Lote C — Admin: membresía manual, config y cierre del panel (2026-07-18)

Implementado:

- `/admin/memberships/new`: alta manual de membresía (botón "Nueva membresía" en `/admin/memberships`). Server Action nueva `createMembershipAction` (`src/lib/memberships/admin-actions.ts`), reutiliza el servicio `createAuthorizedMembership` ya existente desde la Etapa 3 (el mismo que respalda `POST /api/admin/memberships`) — sin backend nuevo. Escribe en `admin_audit_events` (`membership.create_manual`).
- Breadcrumbs unificados en las 6 pantallas de `/admin` anteriores al Lote A que todavía tenían "Admin" sin `href` (Membresías, detalle de membresía, Salud, Migrar usuarios, Planes, Configuración) — ahora todas enlazan a `/admin`, igual que Invitaciones/Auditoría/Pagos.
- Ver `docs/ADMIN_PANEL_STATUS.md` para el estado consolidado final de las 11 pantallas del panel (roles, backend, acciones) y el listado cerrado de pendientes reales (ninguno ambiguo).

Confirmado sin implementar (gaps reales, no backend faltante inventado):

- Google OAuth / Auth Hook: sigue siendo un límite de plataforma (sin Supabase Management API disponible en este entorno), no un gap de esta etapa. Runbook ya documentado en `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md` desde antes de este lote.
- Configuración administrativa: no existen tablas de flags/config (`feature_flag`, `app_settings`, etc.) en el esquema — no hay nada adicional que exponer en `/admin/settings`.
- Ningún componente admin genérico (`DataTable`, `ConfirmDialog`, `PaginationControls`) fue extraído — se mantiene el criterio ya documentado de que replicar el patrón por pantalla es más barato para el volumen actual de pantallas admin (~11).

Validado: `npx tsc --noEmit` sin errores, `npm run lint` sin errores ni warnings, `npm test` 116/116 (sin tests nuevos — `createMembershipAction` es wiring sobre un servicio ya cubierto por tests de dominio previos), `npm run build` compila y genera `/admin/memberships/new`. No verificado manualmente en navegador (sin entorno de browser disponible). Base de datos: sin migraciones nuevas, sin cambios de datos, sin cambios de RLS — confirmado, ningún archivo de `supabase/migrations/**` fue tocado en esta etapa. No se hizo commit, push ni deploy.

## Etapa 6 — QA integral del panel administrativo (2026-07-18)

QA funcional, responsive, de accesibilidad y de seguridad en navegador real (Chromium/Playwright) sobre las 13 rutas de `/admin/**`, con login real como Platform Owner y con usuarios de prueba activo/inactivo. Reporte completo: `docs/ADMIN_QA_REPORT.md`.

Corregido (2 defectos P3, sin cambio visual, sin cambio de alcance):

- `EmptyState` (`src/components/ui/empty-state.tsx`): título en `<h3>` → `<h2>` (saltaba un nivel de heading respecto al `<h1>` de `PageHeader`).
- `NewMembershipForm` (`src/app/(app)/admin/memberships/new/new-membership-form.tsx`): el `Select` de "Plan" quedaba sin nombre accesible cuando no hay plan activo por defecto — se agregó `aria-label` y placeholder.

Hallazgo pendiente (P2, no corregido — fuera de alcance de "corregir sin rediseñar"):

- El `AppShell`/`Sidebar` compartido (no exclusivo de `/admin`) no tiene un patrón de navegación mobile real: el sidebar fijo de 280px sin drawer/hamburger deja el contenido comprimido e ilegible en viewports angostos (confirmado en 390×844 en las 13 rutas). Requiere una decisión de producto/diseño para un nuevo patrón de navegación mobile antes de poder implementarse.

No se encontraron problemas de seguridad, sanitización (redacción de claves sensibles ya cubierta y funcionando), consola/red, ni fugas de datos. Validado: `npx tsc --noEmit` sin errores, `npm run lint` sin errores, `npm test` 116/116, `npm run build` compila. Sin migraciones, sin cambios de RLS, sin commit/push/deploy. Usuarios de prueba creados durante el QA fueron borrados al finalizar.

## Etapa 7 — Auditoría y completado del flujo principal de negocio (2026-07-18)

Foco: el flujo del asesor (cliente → propuesta → wizard → escenarios → versiones → PDF → descarga), no el panel admin. Auditoría completa por lectura de código en `docs/PROPOSAL_FLOW_AUDIT.md`; estado consolidado del flujo en `docs/PROPOSAL_FLOW_STATUS.md`.

Corregido (bugs reales, no cosmético):

- **PDF perdía contenido silenciosamente**: "Ventajas", "Desventajas" y "Notas" de cada alternativa se guardaban en `proposal_alternatives.financial_details` pero `alternatives-section.tsx` (render del PDF) nunca los leía. Se agregó el render de ambas listas y las notas en la tarjeta de cada alternativa del documento.
- Bug relacionado: los textareas "una por línea" (Ventajas/Desventajas) guardaban `[""]` en vez de `[]` cuando quedaban vacíos. Se agregó `.transform()` en `src/lib/wizard/schemas.ts` que filtra líneas vacías antes de persistir.
- Ruta huérfana `/preview`: placeholder estático del Sprint fundacional ("Generar PDF" permanentemente `disabled`), sin ningún enlace entrante en toda la app (la vista previa real vive en `/proposal/[id]/versions/[versionId]/preview`). Eliminada.

Hallazgo crítico verificado y descartado como bug de producto (drift de esquema, no funcionalidad rota): `create_draft_proposal`, `update_proposal_meta` y `archive_proposal` no tienen migración versionada en `supabase/migrations/`, pero se confirmó contra la base de datos real (`information_schema.routines`) que **las tres funciones existen y con la firma correcta** — el flujo funciona hoy. Riesgo real: un entorno nuevo levantado solo desde las migraciones versionadas quedará roto en "crear propuesta". No se creó una migración nueva (restricción explícita de la etapa); queda documentado para que el equipo decida cómo capturar retroactivamente estas funciones.

Gaps reales documentados, no implementados en esta etapa (no bloquean el flujo principal, requieren UI nueva — no son "corregir un bug"):

- "Resumen ejecutivo" en `/proposal/[id]` y "mensaje final" del PDF están permanentemente vacíos: el wizard nunca captura `proposal_narratives.executive_summary` ni `final_message`, aunque las columnas y el render sí existen.
- El badge "Recomendada", `annual_premium`, `insured_amount` y `highlight_label` de una alternativa son soportados por el motor de PDF pero inalcanzables desde el wizard (sin campos en el formulario).
- `/library`: página con datos 100% hardcodeados, sin conexión a `proposal_templates`/`library_items`. No forma parte de los 7 pasos del flujo principal solicitado.

Validado: `npx tsc --noEmit` sin errores, `npm run lint` sin errores, `npm test` 116/116, `npm run build` compila (rutas verificadas, `/preview` ya no aparece en el build). No verificado manualmente en navegador (sin entorno de browser disponible en esta sesión): recorrido real del wizard completo, generación de PDF real y descarga quedan como QA manual pendiente. Sin migraciones nuevas, sin cambios de RLS, sin commit/push/deploy.

## Etapa 8 — Eliminación del schema drift y reproducibilidad completa (2026-07-18)

Resuelve retroactivamente el hallazgo crítico de la Etapa 7 (`create_draft_proposal`, `update_proposal_meta`, `archive_proposal` sin migración) y extiende la auditoría a **todo** el esquema, no solo esas 3 funciones. Reporte completo con inventario, tabla de drift y evidencia de validación: `docs/SCHEMA_DRIFT_REPORT.md`.

Se agregaron **6 migraciones nuevas** (`supabase/migrations/20260718000001` a `...000006`) que recrean, de forma idempotente y sin cambiar comportamiento, objetos que existían en la base remota pero nunca habían quedado versionados:

1. Event trigger `ensure_rls` + función `rls_auto_enable()` (auto-habilita RLS en tablas nuevas).
2. `UNIQUE (user_id)` en `brands`.
3. Índice `proposal_versions_created_by_idx`.
4. Secuencia `proposal_number_seq` + función `generate_proposal_number()`.
5. `create_draft_proposal`, `update_proposal_meta`, `archive_proposal` (los 3 de la Etapa 7).
6. ~20 policies RLS reescritas para envolver `auth.uid()` en `(select ...)` (optimización de planner ya aplicada en remoto pero no en las migraciones locales).

Ningún otro objeto quedó con drift: se verificaron 1:1 contra remoto las 22 tablas, 27 funciones, 4 buckets, policies e índices — sin diferencias pendientes conocidas fuera de las 6 migraciones agregadas.

### Estado de reproducibilidad

**No confirmado empíricamente todavía.** El análisis objeto-por-objeto (comparando `pg_proc`, `pg_policies`, `pg_constraint`, `pg_indexes`, `pg_event_trigger` de remoto contra cada archivo de `supabase/migrations/`) indica que el repositorio ya debería reconstruir un esquema funcionalmente idéntico al remoto, pero no se pudo ejecutar `supabase db reset` en una base limpia para certificarlo: el entorno no tiene Docker Desktop instalado (prerequisito de la CLI) ni existe `supabase/config.toml` en el repo (nunca se corrió `supabase init`). Evidencia del intento real y el resto de riesgos restantes (historial de migraciones remoto con timestamps distintos a los locales) están en `docs/SCHEMA_DRIFT_REPORT.md`.

Validado en este entorno: `npx tsc --noEmit` sin errores, `npm run lint` sin errores, `npm test` 116/116, `npm run build` compila (42 rutas). No se tocó ninguna regla de negocio, UI, permiso ni dato de producción. No se aplicó ninguna migración remota, no se hizo commit, push ni deploy.
