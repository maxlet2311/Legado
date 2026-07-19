# Estado consolidado del panel administrativo

Fecha: 2026-07-18
Cierre de Etapa 5 (Lotes A, B y C). Fuente: `docs/UI_COVERAGE_AUDIT.md`, `docs/ADMIN_UI_MAP.md`, `docs/PROJECT_STATUS.md`.

## Pantallas implementadas

| Ruta | Estado | Rol | Backend | Acciones |
|---|---|---|---|---|
| `/admin` | Completa (redirect) | Platform Owner | N/A (routing) | Redirige a `/admin/memberships` |
| `/admin/memberships` | Completa | Platform Owner | `listMembershipsForAdmin`, `listAllPlans`, `/api/admin/exports/*` | Filtrar, exportar (3 formatos), ver detalle, crear membresía manual |
| `/admin/memberships/new` | Completa (Lote C) | Platform Owner | `createMembershipAction` → `createAuthorizedMembership` | Crear membresía en estado `authorized` |
| `/admin/memberships/[id]` | Completa | Platform Owner | `admin-actions.ts` (7 Server Actions) | Suspender, reactivar, cancelar, vincular, reenviar invitación, reconciliar |
| `/admin/memberships/migrate-users` | Completa | Platform Owner | `migrateExistingUsersAction` | Dry-run y ejecución de alta masiva |
| `/admin/memberships/health` | Completa | Platform Owner | `/api/admin/exports/health` | Ver métricas, exportar |
| `/admin/membership-plans` | Completa | Platform Owner | `src/lib/membership-plans/actions.ts` | Crear, editar, activar/desactivar, sincronizar |
| `/admin/invitations` | Completa (Lote A) | Platform Owner | `listActivationInvitationsForAdmin` + 4 Server Actions | Listar, emitir, cancelar, forzar expiración, reenviar |
| `/admin/audit` | Completa (Lote A) | Platform Owner | `listAdminAuditEvents` (backend nuevo) | Listar, filtrar, ver diff antes/después sanitizado |
| `/admin/payments` | Completa (Lote B) | Platform Owner | `reconcileSubscriptionAction` → `reconcileMercadoPagoPreapproval` | Reconciliar una suscripción puntual, ver métricas |
| `/admin/payments/events` | Completa (Lote B) | Platform Owner | `listPaymentProviderEvents` (backend nuevo) | Listar, filtrar eventos de webhook |
| `/admin/payments/checkouts` | Completa (Lote B) | Platform Owner | `listCheckoutAttemptsForAdmin` + `cleanupExpiredCheckoutAttemptsAction` | Listar, filtrar, limpiar vencidos |
| `/admin/settings` | Completa | Platform Owner | Lectura de `process.env` + `/api/admin/test-email` | Ver presencia de env vars (nunca valores), enviar email de prueba |

**Total: 13 pantallas/rutas, todas en estado Completa.** No quedan pantallas en estado Parcial ni Inexistente dentro de `/admin`.

## Funcionalidades pendientes

### Falta backend (gap real, no implementable sin trabajo de backend)
- Ninguna. Los dos únicos gaps de backend detectados en la auditoría original (lectura de `admin_audit_events` y lectura paginada de `payment_provider_events`/`membership_checkout_attempts`) se resolvieron en Lote A y Lote B respectivamente.

### Decisión de negocio (requiere que alguien decida algo, no es un límite técnico)
- **Botón "Reintentar" para un evento de webhook individual** (`/admin/payments/events`): no existe un endpoint de reintento idempotente en el backend real. Implementarlo requeriría decidir la semántica exacta (¿reintenta contra el proveedor? ¿solo re-marca el evento como `pending`?) antes de escribir código — no se inventó.
- **Ruta API `GET /api/admin/activation-invitations` y `.../[id]/cancel` sin caller propio**: la UI usa una función de lectura directa en su lugar; la ruta API queda sin consumidor. Decisión pendiente: deprecar la ruta o mantenerla para uso externo (cron/integraciones futuras).
- **`POST /api/admin/memberships/[id]/sync` y `POST /api/admin/memberships/migrate-existing-users`**: mismo caso — las Server Actions equivalentes no llaman a estas rutas API. Decisión pendiente: deprecar o mantener para uso externo.

### Fuera de alcance (límite de plataforma o explícitamente no pedido)
- **Google OAuth / Auth Hook** (`before_user_created_check_membership`): no automatizable sin Supabase Management API, no disponible en este entorno. Runbook manual completo en `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md` (secciones 6-7).
- **Componentes genéricos** (`DataTable`, `ConfirmDialog`, `PaginationControls`): decisión de diseño ya tomada (sección 6 de `ADMIN_UI_MAP.md`) — replicar el patrón por pantalla es más barato para el volumen actual (~13 pantallas). No es un pendiente, es un no-hacer deliberado.
- **Pantalla de resumen/dashboard en `/admin`**: se optó por un `redirect` a `/admin/memberships` en vez de construir una página de métricas agregadas — no pedido en el alcance de esta etapa.
- **Página `/preview` legado**: reemplazada funcionalmente por `/proposal/[id]/versions/[versionId]/preview`; candidata a eliminar, fuera del alcance del panel admin.

## Validación (Lote C, 2026-07-18)
- `npx tsc --noEmit`: sin errores.
- `npm run lint`: sin errores ni warnings.
- `npm test`: 116/116 pasando.
- `npm run build`: compila y genera correctamente las 13 rutas de `/admin/**`, incluyendo `/admin/memberships/new`.
- Base de datos: sin migraciones nuevas, sin cambios de datos, sin cambios de RLS en ninguno de los 3 lotes de esta etapa.
- No se ejecutó `git commit`, `git push` ni deploy.

## Etapa 6 — QA integral en navegador real (2026-07-18)

QA funcional/responsive/accesibilidad/seguridad sobre las 13 rutas, en navegador real (no solo lectura de código como en los Lotes A-C). Reporte completo: `docs/ADMIN_QA_REPORT.md`.

- **Seguridad**: confirmado en navegador y con `e2e/platform-owner-guards.mjs` (26/26 OK) — Platform Owner accede a las 13 rutas; usuario activo sin `is_platform_owner` es bloqueado por `AdminLayout` con mensaje explícito; usuario inactivo no puede ni mantener sesión. Sanitización de JSON (`sanitizeForDisplay`) confirmada activa en auditoría, eventos y checkouts.
- **Corregido**: `EmptyState` usaba `<h3>` saltando el `<h2>`; `Select` de "Plan" en `/admin/memberships/new` sin nombre accesible cuando no hay plan activo por defecto. Ambos, un cambio de una línea, sin impacto visual.
- **Pendiente (P2, no corregido)**: el `Sidebar`/`AppShell` (compartido, no exclusivo de admin) no tiene patrón de navegación mobile — a 390px de ancho el contenido queda comprimido e ilegible en las 13 rutas. Requiere decisión de producto/diseño para un drawer/hamburger mobile; fuera del alcance "corregir sin rediseñar" de esta etapa.
- **Estado de release**: no listo para uso mobile hasta resolver el hallazgo anterior. Listo para uso desktop.
