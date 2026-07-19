# Auditoría de cobertura UI — Backend vs. Admin/Usuario

Fecha: 2026-07-18
Alcance: `src/app/api/**`, `src/app/(app)/admin/**`, Server Actions (`"use server"`), RPCs de `supabase/migrations/**`, navegación (`sidebar.tsx`, `top-navigation.tsx`).

Auditoría de solo lectura — no se modificó lógica, base de datos ni UI.

## Hallazgo estructural previo a la tabla

La sección `/admin` **no está enlazada desde ningún lugar de la navegación** (`src/components/layout/sidebar.tsx` solo linkea a Panel de Control, Clientes, Biblioteca, Mi Marca, Configuración; `top-navigation.tsx` no tiene link a Admin). Todo `/admin/*` es accesible solo tecleando la URL directamente (protegido por `requirePlatformOwner`/middleware, pero sin descubribilidad). Se marca como "Requiere rediseño" a nivel de navegación además de evaluarse cada subruta individualmente.

También hay elementos de navegación decorativos sin acción real: `top-navigation.tsx` tiene los links "Borradores" y "Actividad de Clientes" con `href="#"`, el botón "Notificaciones" sin handler, el botón "Generar PDF" del header global sin `onClick`, y el buscador superior sin lógica de búsqueda conectada. El link "Soporte" del sidebar también es `href="#"`.

| Área | Funcionalidad | Backend asociado | UI actual | Estado | Rol | UI requerida | Prioridad |
|---|---|---|---|---|---|---|---|
| Navegación | Acceso a panel `/admin` | N/A (routing) | Ningún link en sidebar/top-navigation hacia `/admin/*` | Requiere rediseño | Platform Owner | Ítem "Administración" en sidebar visible solo para `is_platform_owner` | P0 |
| Invitaciones de activación | Emitir invitación (crear cuenta comercial) | `POST /api/admin/activation-invitations` (`issueAndSendActivationInvitation`) | Ninguna — el propio comentario del código documenta el flujo por `fetch()` desde la consola del navegador o `curl` con la cookie del owner | Solo consola | Platform Owner | Formulario en `/admin/memberships` (o pantalla dedicada) para emitir invitación por email o por `membershipId` | P0 |
| Invitaciones de activación | Listar invitaciones (`GET`) | `GET /api/admin/activation-invitations` (`listActivationInvitations`) | Ninguna pantalla lista este endpoint; no hay tabla de invitaciones en `/admin` | Solo API | Platform Owner | Tabla de invitaciones (estado, expiración, reenviada, cancelada) | P1 |
| Invitaciones de activación | Cancelar invitación | `POST /api/admin/activation-invitations/[id]/cancel` | Sin caller en el frontend (`grep` no encuentra `fetch`/uso) | Solo API | Platform Owner | Botón "Cancelar" en la futura tabla de invitaciones | P1 |
| Invitaciones de activación | Forzar expiración | `POST /api/admin/activation-invitations/[id]/force-expire` | Sin caller en el frontend | Solo API | Platform Owner | Acción en la misma tabla | P2 |
| Invitaciones de activación | Reenviar invitación | `POST /api/admin/activation-invitations/[id]/resend` | Existe un flujo equivalente vía Server Action `resendActivationAction` desde `/admin/memberships/[id]` (botón "Reenviar invitación de activación"), pero esta ruta API específica no tiene caller propio | Solo API | Platform Owner | Ninguna adicional si se consolida en la Server Action existente; documentar la ruta API como redundante/deprecable | P2 |
| Membresías | Crear membresía manualmente | `POST /api/admin/memberships` (crear membership sin checkout) | Ninguna — no existe botón "Nueva membresía" en `/admin/memberships`; el único alta masiva es "Migrar usuarios existentes" | Solo API | Platform Owner | Formulario "Crear membresía manual" (para altas fuera del checkout de Mercado Pago) | P1 |
| Membresías | Listar / filtrar / paginar membresías | `listMembershipsForAdmin` (consulta directa, no vía API route) | `/admin/memberships` — tabla completa con filtros (estado, plan, proveedor, vinculación, búsqueda) y paginación | Completa | Platform Owner | — | — |
| Membresías | Ver detalle de membresía | `listMembershipsForAdmin` + detalle | `/admin/memberships/[id]` | Completa | Platform Owner | — | — |
| Membresías | Suspender / reactivar / cancelar | Server Actions `suspendMembershipAction`, `reactivateMembershipAction`, `cancelMembershipAction` (`src/lib/memberships/admin-actions.ts`) → RPC `transition_membership_status` | `/admin/memberships/[id]` vía `membership-actions.tsx` (diálogos con motivo obligatorio) | Completa | Platform Owner | — | — |
| Membresías | Vincular a usuario existente | Server Action `linkMembershipAction` → RPC `link_membership_to_user` | Botón "Vincular a usuario existente" en `/admin/memberships/[id]` | Completa | Platform Owner | — | — |
| Membresías | Reconciliar con Mercado Pago (individual) | Server Action `resyncMembershipAction`, duplicado en `POST /api/admin/memberships/[id]/sync` | Botón "Reconciliar con Mercado Pago" usa la Server Action; la ruta API homóloga no tiene caller propio en el frontend | Parcial | Platform Owner | Confirmar si la ruta API queda solo para uso externo/cron o se elimina por redundante | P2 |
| Membresías | Migrar usuarios existentes (alta masiva `authorized`) | Server Action `migrateExistingUsersAction`, duplicado en `POST /api/admin/memberships/migrate-existing-users` | `/admin/memberships/migrate-users` — formulario completo (todos los usuarios o lista de emails, dry-run, plan, motivo) | Completa | Platform Owner | La ruta API es redundante frente a la Server Action — mismo caso que "sync" | P2 |
| Membresías | Salud del sistema de membresías (métricas) | `GET /api/admin/exports/health` | `/admin/memberships/health` con link de exportación | Completa | Platform Owner | — | — |
| Membresías | Exportar membresías (CSV/JSON) | `GET /api/admin/exports/memberships` | Botón "Membresías" en `/admin/memberships` | Completa | Platform Owner | — | — |
| Membresías | Exportar historial de cambios de estado | `GET /api/admin/exports/history` | Botón "Historial" en `/admin/memberships` | Completa | Platform Owner | — | — |
| Membresías | Exportar eventos fallidos (webhooks) | `GET /api/admin/exports/failed-events` | Botón "Eventos fallidos" en `/admin/memberships` | Completa | Platform Owner | — | — |
| Pagos (Mercado Pago) | Reconciliación masiva de pagos pendientes | `POST /api/admin/payments/mercado-pago/reconcile` | Ninguna pantalla — no existe `/admin/payments` | Solo API | Platform Owner | Pantalla "Pagos" con botón de reconciliación masiva + resumen de resultados | P0 |
| Pagos (Mercado Pago) | Listar eventos de webhook no matcheados | `GET /api/admin/payments/mercado-pago/unmatched-events` | Ninguna pantalla | Solo API | Platform Owner | Tabla de eventos huérfanos con acción de resolución manual | P1 |
| Pagos (Mercado Pago) | Limpieza de intentos de checkout vencidos | `POST /api/admin/payments/mercado-pago/cleanup` | Ninguna pantalla | Solo API | Platform Owner | Botón de limpieza manual en pantalla "Pagos" (aunque sea operación housekeeping, hoy solo corre si alguien la invoca a mano) | P1 |
| Planes de membresía | CRUD completo (crear, editar, activar/desactivar, sincronizar con proveedor) | Server Actions en `src/lib/membership-plans/actions.ts` | `/admin/membership-plans` — tabla + diálogos crear/editar + toggle + sync | Completa | Platform Owner | — | — |
| Configuración / entorno | Verificación de variables de entorno (Resend, Mercado Pago) | Lectura directa de `process.env` en el server component | `/admin/settings` | Completa | Platform Owner | — | — |
| Configuración / entorno | Envío de email de prueba | `POST /api/admin/test-email` | `/admin/settings` vía `test-email-form.tsx` (único endpoint admin realmente invocado por `fetch()` desde la UI) | Completa | Platform Owner | — | — |
| Configuración / entorno | Configuración de Google OAuth y Auth Hook (`before_user_created_check_membership`) | Función SQL `before_user_created_check_membership`; configuración de proveedor OAuth | La propia página `/admin/settings` documenta textualmente que "no es verificable automáticamente" y que debe confirmarse "manualmente" en el dashboard de Supabase | Solo Supabase | Platform Owner | No hay API de Supabase Auth Admin expuesta para verificarlo desde este entorno; documentar procedimiento operativo, no es automatizable sin Management API | P1 |
| Auditoría | Registro de acciones administrativas (`admin_audit_events`) | Tabla `admin_audit_events` (migración `20260717010000_admin_audit_events.sql`) + `recordAdminAuditEvent()`, invocado desde casi todas las Server Actions administrativas | Ninguna pantalla lista o filtra estos eventos — solo se escriben, nunca se leen desde la app | Inexistente | Platform Owner | Pantalla "Auditoría" con tabla filtrable por actor/acción/entidad/fecha | P0 |
| Perfil de usuario | Actualizar nombre propio | RPC `update_own_profile(p_full_name varchar)` (migración `20260716010000_platform_owner.sql`) | Sin ningún caller en `src/` (solo aparece en los tipos generados `database/types.ts`) | Inexistente | Cualquier usuario autenticado | Pantalla/formulario "Mi perfil" para editar nombre | P2 |
| Wizard de propuestas | Crear borrador, actualizar detalles, narrativa, alternativas, beneficios, comparaciones, finalizar | RPCs `create_draft_proposal`, `update_proposal_details`, `upsert_proposal_narrative`, `upsert_proposal_alternative`, `delete_proposal_alternative`, `reorder_proposal_alternatives`, `upsert_proposal_benefit`, `delete_proposal_benefit`, `reorder_proposal_benefits`, `upsert_proposal_comparison`, `finalize_proposal` (todas en `src/lib/wizard/actions.ts`) | Wizard completo (`src/components/wizard/**`) | Completa | Asesor | — | — |
| Propuestas | Metadatos (título), archivar | RPCs `update_proposal_meta`, `archive_proposal` (`src/lib/proposal/actions.ts`) | `/proposal/[id]` vía `proposal-actions.tsx` | Completa | Asesor | — | — |
| Versiones de propuesta | Emitir nueva versión (snapshot inmutable) | RPC `emit_proposal_version` (`src/lib/versions/actions.ts`) | Botón en `/proposal/[id]` | Completa | Asesor | — | — |
| Versiones de propuesta | Generar PDF y registrar artefacto | `POST /api/proposal-versions/[versionId]/pdf` → RPC `record_proposal_version_artifact` | Botones en `version-row-actions.tsx` y `preview-actions.tsx` | Completa | Asesor | — | — |
| Versiones de propuesta | Descargar PDF generado | `GET /api/proposal-versions/[versionId]/download` | Botón "Descargar" en las mismas pantallas | Completa | Asesor | — | — |
| Vista previa (legado) | Página `/preview` — botón "Generar PDF" | Ninguno (comentario en el propio archivo: "El motor de renderizado se implementa en el Sprint 2") | `/preview` — botón permanentemente `disabled`, sin handler | Inexistente | Asesor | Página obsoleta: reemplazada por `/proposal/[id]/versions/[versionId]/preview` (que sí funciona) — candidata a eliminar o redirigir | P3 |
| Panel de Control | Accesos rápidos con `href` vacío | N/A (solo UI) | `dashboard/page.tsx` — tarjetas con `aria-disabled="true"` y `cursor-not-allowed` cuando no hay `href` | Parcial | Asesor | Completar el `href` de las tarjetas pendientes o quitarlas del panel | P2 |
| Navegación global | "Borradores", "Actividad de Clientes", botón "Generar PDF" global, buscador, notificaciones | N/A (solo UI) | `top-navigation.tsx` — todos con `href="#"` o sin `onClick` | Inexistente | Asesor | Implementar o remover estos elementos decorativos del header | P3 |
| Membresías (checkout) | Iniciar checkout de Mercado Pago | `POST /api/memberships/checkout` → `begin_membership_checkout_attempt` | `/planes` y `/suscripcion` (`plan-checkout-form.tsx`) | Completa | Usuario final | — | — |
| Membresías (checkout) | Webhook de confirmación de pago | `POST /api/webhooks/mercado-pago` | No aplica (server-to-server, no requiere UI) | Completa | Sistema | — | — |
| Clientes | CRUD de clientes | Server Actions en `src/lib/client/actions.ts` | `/clients` con `client-dialogs.tsx` | Completa | Asesor | — | — |
| Branding | Configuración de marca | Server Actions en `src/lib/branding/actions.ts` | `/branding` | Completa | Asesor | — | — |
| Biblioteca | Gestión de ítems de biblioteca | Tabla `library_items` | `/library` | Parcial | Asesor | No se auditó a fondo el CRUD completo de `/library`; revisar si cubre alta/edición/borrado o es solo listado | P3 |

## Confirmación del caso conocido

`POST /api/admin/activation-invitations` (`src/app/api/admin/activation-invitations/route.ts`) está confirmado como **Solo consola**: el propio docstring del archivo (líneas 50-60) indica textualmente que, al no existir panel de administración, la invitación se emite copiando la cookie de sesión del Platform Owner a `curl` o ejecutando `fetch("/api/admin/activation-invitations", { method: "POST", ... })` desde la consola del navegador. No se encontró ningún componente de UI que llame a este endpoint.

## Resumen de cifras

1. **APIs administrativas** (rutas bajo `/api/admin/*`, todas protegidas con `requirePlatformOwner`): **17 endpoints** en 14 archivos de ruta:
   - `activation-invitations` (GET, POST)
   - `activation-invitations/[id]/cancel` (POST)
   - `activation-invitations/[id]/force-expire` (POST)
   - `activation-invitations/[id]/resend` (POST)
   - `memberships` (POST)
   - `memberships/[id]/sync` (POST)
   - `memberships/migrate-existing-users` (POST)
   - `payments/mercado-pago/cleanup` (POST)
   - `payments/mercado-pago/reconcile` (POST)
   - `payments/mercado-pago/unmatched-events` (GET)
   - `exports/failed-events` (GET)
   - `exports/health` (GET)
   - `exports/history` (GET)
   - `exports/memberships` (GET)
   - `test-email` (POST)
   (Adicionalmente hay 2 rutas no-admin pero relevantes al negocio: `memberships/checkout` y `webhooks/mercado-pago`, y 2 rutas de `proposal-versions` protegidas por sesión de usuario normal, no por rol.)

2. **Server Actions relevantes** (archivos con `"use server"`): **13 archivos** — `account-activation/actions.ts`, `account-activation/request-activation-action.ts`, `auth/actions.ts`, `auth/oauth-constants.ts`, `auth/oauth.ts`, `branding/actions.ts`, `client/actions.ts`, `membership-plans/actions.ts`, `memberships/admin-actions.ts` (7 funciones exportadas), `memberships/migrate-users-action.ts`, `proposal/actions.ts`, `versions/actions.ts`, `wizard/actions.ts` (11 funciones exportadas). Total aproximado de funciones Server Action individuales: ~30.

3. **Tablas administrativas** (con operaciones admin-relevantes): **8 tablas** — `memberships`, `membership_plans`, `membership_status_history`, `account_activation_invitations`, `admin_audit_events`, `payment_provider_events`, `membership_checkout_attempts`, `profiles` (campo `is_platform_owner`/`role`).

4. **UI completas**: **20 filas** con Estado = Completa.

5. **UI parciales**: **3 filas** con Estado = Parcial (`sync` individual vía API redundante, tarjetas del dashboard con `href` vacío, `/library` sin auditoría completa de CRUD).

6. **UI inexistentes / inaccesibles / solo API / solo consola / solo Supabase**: **11 filas** en total, desglosado:
   - Solo consola: 1 (`POST /api/admin/activation-invitations`)
   - Solo API: 5 (`GET` invitaciones, cancelar invitación, forzar expiración, crear membresía manual `POST /api/admin/memberships`, `payments/mercado-pago/reconcile`, `payments/mercado-pago/unmatched-events`, `payments/mercado-pago/cleanup` — nota: son 6 filas reales con Estado "Solo API", ver tabla)
   - Solo Supabase: 1 (Google OAuth / Auth Hook)
   - Inexistente: 4 (auditoría de `admin_audit_events`, `update_own_profile`, página `/preview` legado, elementos decorativos del top-navigation)
   - Requiere rediseño: 1 (acceso a `/admin` sin link en navegación)
   (Nota: el detalle exacto por fila está en la tabla principal; el docstring de reenvío de invitación se clasificó "Solo API" por tener ruta propia sin caller, aunque exista equivalente funcional vía Server Action.)

7. **Listado P0**:
   - Acceso a panel `/admin` sin enlace en navegación
   - Emitir invitación de activación (`POST /api/admin/activation-invitations`) — solo consola
   - Reconciliación masiva de pagos Mercado Pago (`POST /api/admin/payments/mercado-pago/reconcile`)
   - Pantalla de auditoría de `admin_audit_events`

8. **Listado P1**:
   - Listar invitaciones de activación (`GET /api/admin/activation-invitations`)
   - Cancelar invitación de activación
   - Crear membresía manualmente (`POST /api/admin/memberships`)
   - Listar eventos de webhook no matcheados (Mercado Pago)
   - Limpieza de intentos de checkout vencidos (Mercado Pago)
   - Confirmación manual de Google OAuth / Auth Hook en Supabase

9. **Archivos inspeccionados** (lectura o grep dirigido — no exhaustivo del repo completo):
   - Todas las rutas API bajo `src/app/api/**` (18 archivos `route.ts`)
   - Todas las páginas y componentes bajo `src/app/(app)/admin/**` (13 archivos)
   - `src/components/layout/sidebar.tsx`, `top-navigation.tsx`
   - `src/lib/memberships/admin-actions.ts`, `repository.ts`, `migrate-users-action.ts`, `user-migration.ts`
   - `src/lib/membership-plans/actions.ts`
   - `src/lib/account-activation/service.ts`
   - `src/app/(app)/(premium)/dashboard/page.tsx`, `preview/page.tsx`
   - `src/app/(app)/(premium)/proposal/[id]/version-row-actions.tsx`, `versions/[versionId]/preview/preview-actions.tsx`
   - Los 45 archivos de `supabase/migrations/**` (grep de `create or replace function`)
   - `docs/MEMBERSHIP_OPERATIONS.md` (grep)
   - Total aproximado: **60+ archivos** inspeccionados entre lectura completa y grep dirigido.

10. **Confirmación**: esta auditoría fue de solo lectura. No se modificó ningún archivo de lógica, componente de UI, migración ni configuración de base de datos. El único archivo creado/modificado es este mismo documento, `proposal-studio/docs/UI_COVERAGE_AUDIT.md`. No se ejecutó `git commit`, `git push` ni ninguna migración.

## Actualización — Lote A implementado (2026-07-18)

Los siguientes ítems de la tabla pasan de su estado original a **Completa** (implementación real, no solo planificación — ver `docs/ADMIN_UI_MAP.md` para el detalle técnico):

- **Navegación → Acceso a panel `/admin`**: de "Requiere rediseño" a Completa. Ítem "Administración" agregado a `src/components/layout/sidebar.tsx`, condicionado a `profile.is_platform_owner === true` (perfil ya cargado server-side en `src/app/(app)/layout.tsx`, pasado por props — sin query adicional).
- **Invitaciones de activación → Emitir invitación**: de "Solo consola" a Completa. `/admin/invitations` tiene un diálogo "Nueva invitación" que llama un Server Action nuevo (`createInvitationAction`), ya no requiere `curl`/consola del navegador.
- **Invitaciones de activación → Listar invitaciones (`GET`)**: de "Solo API" a Completa vía UI. La pantalla `/admin/invitations` NO usa la ruta `GET /api/admin/activation-invitations` (sigue sin caller propio, se mantiene documentada como redundante) — usa una función de lectura nueva y paginada (`listActivationInvitationsForAdmin`, `src/lib/account-activation/admin-queries.ts`) llamada directo desde el Server Component, mismo criterio que `listMembershipsForAdmin`.
- **Invitaciones de activación → Cancelar invitación**: de "Solo API" a Completa. Botón "Cancelar" con `Dialog` de confirmación en `/admin/invitations`, Server Action `cancelInvitationAction`.
- **Invitaciones de activación → Forzar expiración**: de "Solo API" a Completa (se adelantó de P2 a este lote porque la tabla ya estaba armada). Server Action `forceExpireInvitationAction`.
- **Invitaciones de activación → Reenviar invitación**: se agregó un botón "Reenviar" en `/admin/invitations` (Server Action `resendInvitationAction`, reutiliza `resendActivationInvitation` del servicio) — coexiste con el flujo ya existente en `/admin/memberships/[id]`, ambos llaman al mismo servicio.
- **Auditoría → Registro de acciones administrativas**: de "Inexistente" a Completa. Nueva función de lectura `listAdminAuditEvents` (`src/lib/admin/audit-queries.ts`), pantalla `/admin/audit` con filtros, paginación, sanitización de JSON sensible y diff legible.

**Pendiente explícito, no implementado en este lote** (no inventado, documentado para no dar falsa cobertura):
- Estado de entrega de email por invitación no se persiste en la base (`account_activation_invitations` no tiene una columna de estado de envío) — la UI solo puede mostrar ese dato en el momento de crear/reenviar (aviso en pantalla), no como historial. Requeriría una migración nueva, fuera de alcance de este lote.
- `POST /api/admin/memberships` (crear membresía manual), `POST /api/admin/payments/mercado-pago/reconcile`, `GET .../unmatched-events`, `POST .../cleanup` siguen sin UI (Lote B/C, explícitamente fuera de alcance de este lote).
- La ruta API `GET /api/admin/activation-invitations` sigue sin caller real desde el frontend (se mantiene como redundante/deprecable, documentado ya en la fila original).

## Actualización — Lote B implementado (2026-07-18)

Corrección de un supuesto de esta misma auditoría: la fila "Reconciliación masiva de pagos pendientes" (línea 33) asumía que `POST /api/admin/payments/mercado-pago/reconcile` era una operación masiva. Al leer el código real (`src/lib/payments/reconciliation.ts`) se confirmó que **no lo es**: recibe un único `preapprovalId` y reconcilia esa suscripción puntual — el mismo camino que usa el webhook automático. La UI construida en este lote refleja el contrato real, no el asumido.

Pasan de su estado original a **Completa**:

- **Pagos (Mercado Pago) → Reconciliación de una suscripción puntual** (antes descripta como "masiva"): de "Solo API" a Completa. `/admin/payments` tiene un panel de reconciliación manual (un `preapprovalId` a la vez) con confirmación reforzada (checkbox de "no hay dry-run") y resumen de resultado. Server Action `reconcileSubscriptionAction` (`src/app/(app)/admin/payments/actions.ts`), reutiliza `reconcileMercadoPagoPreapproval` directo (no hace `fetch` a la ruta API existente, mismo criterio que `resyncMembershipAction`). Escribe en `admin_audit_events` (`payments.reconcile_subscription`) — antes esta lógica no auditaba nada.
- **Pagos (Mercado Pago) → Listar eventos de webhook no matcheados**: de "Solo API" a Completa vía UI. `/admin/payments/events` no usa la ruta `GET /api/admin/payments/mercado-pago/unmatched-events` (sigue sin caller propio, documentada como redundante) — usa una función de lectura general nueva y paginada (`listPaymentProviderEvents`, `src/lib/payments/webhook-events.ts`) con el filtro `unmatched` como un valor más de `processing_status`, accesible también como vista dedicada vía querystring.
- **Pagos (Mercado Pago) → Limpieza de intentos de checkout vencidos**: de "Solo API" a Completa. `/admin/payments/checkouts` tiene un panel de limpieza con `Dialog` de confirmación, resumen de resultado y refresco de la lista. Server Action `cleanupExpiredCheckoutAttemptsAction`, reutiliza `cleanupExpiredCheckoutAttempts` directo. Escribe en `admin_audit_events` (`payments.cleanup_expired_checkouts`).
- **Nueva pantalla, no listada originalmente**: `/admin/payments/checkouts` (lista general de `membership_checkout_attempts`, más allá de la limpieza) y `/admin/payments` (resumen/dashboard con métricas cheap) — ambas necesarias para que la reconciliación y la limpieza tuvieran contexto real en vez de ser botones aislados.

**Pendiente explícito, no implementado en este lote** (gaps reales del backend, no fabricados):
- No hay botón "Reintentar" para un evento de webhook individual: no existe ningún endpoint de reintento idempotente sobre un evento puntual en el backend real (la única forma de "reintentar" es la reconciliación manual por `preapprovalId`, que ya está implementada).
- No hay filtro "con error" en `/admin/payments/checkouts`: `membership_checkout_attempts` no tiene ninguna columna de error (solo `payment_provider_events.error_message` existe).
- `payment_provider_events` no tiene ninguna columna de relación a `memberships`/`membership_checkout_attempts`/usuarios (confirmado: `Relationships: []` en los tipos generados) — la tabla de eventos no puede mostrar "membresía vinculada" ni "usuario" porque esa columna no existe en el esquema real; no se inventó un join.
- Crear membresía manual (`POST /api/admin/memberships`) y el runbook operativo de Google OAuth siguen fuera de alcance (Lote C).

## Actualización — Lote C implementado (2026-07-18)

- **Membresías → Crear membresía manualmente**: de "Solo API" a Completa. `/admin/memberships/new` (botón "Nueva membresía" en `/admin/memberships`) — formulario email/plan/vencimiento opcional/motivo obligatorio. Server Action nueva `createMembershipAction` (`src/lib/memberships/admin-actions.ts`), llama directo a `createAuthorizedMembership` (`src/lib/memberships/service.ts`, ya existente desde la Etapa 3 — mismo servicio que usa `POST /api/admin/memberships`), nunca hace `fetch` a la ruta API, mismo criterio que el resto de las Server Actions de este archivo. Escribe en `admin_audit_events` (`membership.create_manual`).
- **Configuración / entorno → Google OAuth / Auth Hook**: se confirma que sigue siendo "Solo Supabase" — no es un gap nuevo, es un límite de plataforma. `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md` (secciones 6 y 7) ya documentaba el runbook manual completo desde una etapa previa; `/admin/settings` ya lo referencia textualmente. No se intentó ninguna llamada a Supabase Management API desde componentes — no existe tal API disponible en este entorno.
- **Configuración administrativa (Paso 3 de esta etapa)**: se revisó si existen tablas de configuración (`feature_flag`, `app_settings`, `system_config`, `platform_config`) con soporte backend sin pantalla — no existe ninguna (`grep` sobre `src/` y `supabase/migrations/**` sin resultados). `/admin/settings` ya cubre el 100% de la configuración con backend real (env vars enmascaradas + modo de enforcement de solo lectura). No se agregó nada nuevo porque no hay nada real que exponer.
- **Consistencia transversal (Paso 4)**: se unificaron los breadcrumbs de todas las pantallas de `/admin/**` para que el primer segmento sea siempre `{ label: "Admin", href: "/admin" }` (antes, las pantallas de Lote A/B ya enlazaban "Admin" pero las de etapas previas — Membresías, Planes, Configuración, Salud, Migrar usuarios, detalle de membresía — lo dejaban sin `href`). Cambio cosmético de una línea por archivo, sin tocar lógica.
- **Componentes (Paso 5)**: no se encontró duplicación nueva que consolidar — el formulario de alta manual reutiliza los mismos primitivos (`Button`, `Input`, `Label`, `Textarea`, `Select`) y el mismo patrón `useState`/`useTransition` que `MigrateUsersForm` y `membership-actions.tsx`, sin introducir un patrón nuevo (`useActionState`) que hubiera quedado inconsistente con el resto del panel.
- **Auditoría final de código (Paso 6)**: `grep` de `TODO|FIXME|not implemented|href="#"` sobre `/admin`, `lib/admin`, `components/admin` no encontró coincidencias reales (los únicos matches de "pending" son valores de dominio legítimos: estado de invitaciones, métricas de salud).

Pasa de "Solo API" a **Completa**: crear membresía manual. Se mantiene sin cambios: Google OAuth/Auth Hook (Solo Supabase, documentado con runbook — no es un gap de implementación).
