# Mapa de navegación e implementación — Panel de Administración

Fecha: 2026-07-18
Alcance: planificación únicamente (sin implementación). Basado en `docs/UI_COVERAGE_AUDIT.md` + verificación puntual de `sidebar.tsx`, `top-navigation.tsx`, `admin/layout.tsx`, rutas bajo `admin/**`, y componentes reutilizables en `src/components/**`.

---

## 1. Auditoría de navegación actual (verificada)

### 1.1 Sidebar global — `src/components/layout/sidebar.tsx`
- Líneas 22-28 (`navItems`): Panel de Control (`/dashboard`), Clientes (`/clients`), Biblioteca (`/library`), Mi Marca (`/branding`), Configuración (`/proposals/new` — mal etiquetado, apunta al wizard de nueva propuesta, no a configuración real).
- **Sin ningún link a `/admin/*`.** No hay gate por rol en absoluto: el sidebar se renderiza igual para cualquier usuario autenticado, no distingue `is_platform_owner`.
- Línea 92-98: link "Soporte" con `href="#"` — muerto.
- Línea 84-90: "Nueva Propuesta" duplica el ítem "Configuración" del nav (ambos apuntan a `/proposals/new`).

### 1.2 Top navigation — `src/components/layout/top-navigation.tsx`
- Línea 5: importa `isAdmin`, `isPlatformOwner` de `@/lib/auth/authorization` y los usa solo para el label de rol (línea 20-24, `getRoleLabel`), **no para condicionar ningún link** — es decir, ya conoce el rol del usuario pero no lo usa para mostrar/ocultar nada.
- Línea 45-50: "Borradores" `href="#"` — muerto.
- Línea 51-56: "Actividad de Clientes" `href="#"` — muerto.
- Línea 57-62: botón "Generar PDF" sin `onClick` — decorativo.
- Línea 64-70: botón "Notificaciones" (campana) sin handler — decorativo.
- Línea 36-42: input de búsqueda sin lógica conectada — decorativo.

### 1.3 Layout de admin — `src/app/(app)/admin/layout.tsx`
- Línea 25: guarda la sección completa con `await requirePlatformOwner()` — si lanza `ForbiddenError` (línea 26-36), renderiza `EmptyState` en vez de la nav interna. Correcto y suficiente como gate de acceso, pero **es el único gate**: nada en el shell global (`app-shell.tsx`, sidebar) anticipa al usuario que la sección existe o que no tiene acceso hasta que ya cargó la URL.
- Línea 9-15 (`ADMIN_NAV`): nav interna propia de `/admin/**`, con 5 ítems: Membresías, Planes, Salud, Migrar usuarios, Configuración. **No incluye** ítems para invitaciones, pagos/reconciliación ni auditoría — porque esas pantallas no existen todavía (confirma el gap ya detectado en el audit previo).
- Esta nav interna es horizontal, con scroll horizontal en mobile (línea 43: `overflow-x-auto`) — patrón reutilizable para agregar los nuevos ítems.

### 1.4 Árbol de rutas real bajo `/admin/**` (Glob confirmado, 13 archivos)
```
/admin/layout.tsx
/admin/memberships/page.tsx                    (lista + filtros + paginación + exports)
/admin/memberships/status-badge.tsx             (helper: MembershipStatusBadge, formatDate, maskExternalId)
/admin/memberships/membership-filters.tsx
/admin/memberships/[id]/page.tsx                (detalle)
/admin/memberships/[id]/membership-actions.tsx  (suspender/reactivar/cancelar/vincular/reenviar/resync)
/admin/memberships/migrate-users/page.tsx
/admin/memberships/migrate-users/migrate-users-form.tsx
/admin/memberships/health/page.tsx
/admin/membership-plans/page.tsx
/admin/membership-plans/plan-dialogs.tsx
/admin/settings/page.tsx
/admin/settings/test-email-form.tsx
```
No hay `/admin/page.tsx` (índice/resumen) — entrar a `/admin` sin subruta específica no tiene destino propio.

### 1.5 Componentes reutilizables ya existentes (Glob de `src/components/**`)
- `src/components/ui/badge.tsx` — `Badge` con variantes (`draft`, `completed`, `success`, `warning`, `error`, etc.) vía `cva`. `admin/memberships/status-badge.tsx` ya lo envuelve en `MembershipStatusBadge` — patrón a replicar para nuevos badges de estado (invitaciones, eventos de webhook).
- `src/components/ui/empty-state.tsx` — `EmptyState` (icon + title + description + action) ya usado en `admin/layout.tsx` (permiso denegado) y `admin/memberships/page.tsx` (sin resultados).
- `src/components/layout/page-header.tsx` — `PageHeader` (title, description, breadcrumbs, actions) ya usado en todas las páginas admin.
- `src/components/layout/content-container.tsx` — wrapper de ancho máximo, usado en todas.
- `src/components/ui/dialog.tsx`, `src/components/ui/button.tsx`, `src/components/ui/select.tsx`, `src/components/ui/input.tsx`, `src/components/ui/checkbox.tsx`, `src/components/ui/switch.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/skeleton.tsx` — primitivas shadcn-like disponibles.
- **No existen**: tabla de datos genérica (`DataTable`), paginación como componente (cada página reimplementa el patrón "Anterior/Siguiente" inline — ver `admin/memberships/page.tsx` líneas 192-218), diálogo de confirmación genérico (cada acción reimplementa su propio `<Dialog>` en `membership-actions.tsx`/`plan-dialogs.tsx`), barra de filtros genérica (`membership-filters.tsx` es ad-hoc para membresías), timeline/detail-drawer, botón de copiar.

---

## 2. Navegación final propuesta

**Decisión de diseño:** no se fuerza Clientes/Propuestas/Marcas bajo "Administración" — son secciones de asesor ya enlazadas correctamente en el sidebar global. "Administración" se agrega como sección nueva y separada, visible solo para `is_platform_owner`, con su propia nav interna (extendiendo `ADMIN_NAV` existente en `admin/layout.tsx`, no reemplazándola).

**Sidebar global** (`sidebar.tsx`): agregar un ítem condicional después de "Configuración", visible solo si `profile.is_platform_owner`:
```
Administración → /admin  (o /admin/memberships si no se crea índice — ver Lote A)
```
Requiere pasar `profile` (ya disponible en `TopNavigation` vía prop) también a `Sidebar`, que hoy no lo recibe.

**Nav interna de `/admin/layout.tsx`** (`ADMIN_NAV`), tree final:
```
Administración
├── Resumen           /admin                          (nuevo, opcional — ver Lote A)
├── Membresías         /admin/memberships              (existente)
│   └── [id]           /admin/memberships/[id]         (existente)
│   └── Migrar usuarios /admin/memberships/migrate-users (existente)
│   └── Salud           /admin/memberships/health        (existente)
├── Invitaciones        /admin/invitations              (nuevo — P0/P1)
├── Pagos               /admin/payments                 (nuevo — P0/P1)
│   ├── (tab) Reconciliación
│   ├── (tab) Eventos no matcheados
│   └── (tab) Checkouts vencidos
├── Auditoría            /admin/audit                    (nuevo — P0, requiere backend nuevo)
├── Planes de membresía  /admin/membership-plans          (existente)
└── Configuración         /admin/settings                  (existente)
```
No se agregan Clientes/Marcas/Propuestas — quedan donde están, fuera de Administración.

---

## 3. Tabla screen-by-screen

| Ruta | Pantalla | Prioridad | Estado actual | Rol autorizado | Entidad | Acciones | Backend reutilizado | Requiere backend adicional |
|---|---|---|---|---|---|---|---|---|
| `/admin` (sidebar link) | Acceso visible al panel | P0 | Falta el link (nav) | Platform Owner | — | Navegar | N/A (routing) | No |
| `/admin/memberships` | Lista de membresías | — | Completa | Platform Owner | `memberships` | Filtrar, exportar, ver detalle | `listMembershipsForAdmin`, `/api/admin/exports/*` | No |
| `/admin/memberships/[id]` | Detalle de membresía | — | Completa | Platform Owner | `memberships` | Suspender, reactivar, cancelar, vincular, reenviar invitación, resync | `admin-actions.ts` (6 Server Actions) | No |
| `/admin/memberships/migrate-users` | Migración masiva | — | Completa | Platform Owner | `memberships`, `profiles` | Dry-run, migrar por lista/todos | `migrateExistingUsersAction` | No |
| `/admin/memberships/health` | Salud del sistema | — | Completa | Platform Owner | métricas agregadas | Ver, exportar | `/api/admin/exports/health` | No |
| `/admin/membership-plans` | CRUD de planes | — | Completa | Platform Owner | `membership_plans` | Crear, editar, activar/desactivar, sync | `src/lib/membership-plans/actions.ts` | No |
| `/admin/settings` | Config. de entorno + test email | — | Completa | Platform Owner | env vars | Enviar email de prueba | `/api/admin/test-email` | No |
| `/admin/invitations` | Lista + emisión de invitaciones | P0/P1 | No existe | Platform Owner | `account_activation_invitations` | Listar, emitir, cancelar, forzar expiración | `GET/POST /api/admin/activation-invitations`, `.../[id]/cancel`, `.../[id]/force-expire` | No |
| `/admin/invitations` (crear membresía manual) | Formulario "Nueva membresía" | P1 | No existe | Platform Owner | `memberships` | Crear membresía sin checkout | `POST /api/admin/memberships` | No |
| `/admin/payments` | Reconciliación MP | P0 | No existe | Platform Owner | `memberships`, proveedor externo | Ejecutar reconciliación masiva, ver resumen | `POST /api/admin/payments/mercado-pago/reconcile` | No |
| `/admin/payments` (tab eventos) | Webhooks no matcheados | P1 | No existe | Platform Owner | `payment_provider_events` | Listar, resolver manualmente | `GET /api/admin/payments/mercado-pago/unmatched-events` | No |
| `/admin/payments` (tab checkouts) | Limpieza de checkouts vencidos | P1 | No existe | Platform Owner | `membership_checkout_attempts` | Ejecutar limpieza | `POST /api/admin/payments/mercado-pago/cleanup` | No |
| `/admin/audit` | Auditoría de acciones admin | P0 | No existe | Platform Owner | `admin_audit_events` | Listar, filtrar (actor/acción/entidad/fecha), ver detalle | Ninguno (solo insert existe) | **Sí — función de lectura/paginación nueva** |
| Operativo (sin pantalla) | Confirmación de Google OAuth / Auth Hook | P1 | Manual en Supabase Studio | Platform Owner | N/A | Verificar config en dashboard externo | N/A | No aplicable a UI — runbook |

---

## 4. Diseño funcional detallado — los 4 P0

### 4.1 Acceso al panel de administración (nav)
- **Sidebar** (`sidebar.tsx`): agregar ítem "Administración" (icono `ShieldCheck` o similar de `lucide-react`) condicionado a `profile?.is_platform_owner === true`. Requiere:
  - Pasar `profile: Profile | null` como prop a `Sidebar` (hoy solo recibe `collapsed`/`onCollapsedChange`) — el dato ya existe en el layout padre porque `TopNavigation` lo recibe.
  - Reusar el mismo patrón de `isActive` (línea 64: `pathname?.startsWith(href)`) para resaltar cuando `pathname` empieza con `/admin`.
- **Desktop**: ítem normal en la lista vertical, mismo estilo que los demás (borde izquierdo + fondo al activarse).
- **Mobile/collapsed**: igual que el resto — cuando `collapsed=true` se oculta el label y queda solo el ícono (línea 77 ya maneja esto para todos los ítems).
- **Breadcrumb**: cada página de `/admin/**` ya usa `PageHeader` con `breadcrumbs={[{ label: "Admin" }, { label: "X" }]}` (ver `admin/memberships/page.tsx` línea 78) — mantener el mismo patrón para las pantallas nuevas, agregando `{ label: "Admin", href: "/admin" }` si se crea el índice.
- **Punto de entrada**: si no se construye `/admin/page.tsx` (índice), el link del sidebar debe apuntar directo a `/admin/memberships` (la pantalla admin más completa hoy) para no crear un 404/ruta muerta.

### 4.2 Pantalla de invitaciones de activación — `/admin/invitations`
- **Backend**: ya completo, sin gaps. `GET /api/admin/activation-invitations` (`listActivationInvitations`, excluye `token_hash` por diseño — confirmado en el docstring de la ruta), `POST /api/admin/activation-invitations` (emitir, acepta `email` o `membershipId`), `POST .../[id]/cancel`, `POST .../[id]/force-expire`. El reenvío ya tiene equivalente funcional vía `resendActivationAction` en `/admin/memberships/[id]` — no requiere ruta nueva.
- **Lista**: tabla con columnas Email, Estado (pendiente/aceptada/cancelada/expirada — confirmar enum exacto en `account_activation_invitations` antes de implementar), Creada, Expira, Membresía asociada (si aplica). Reusar patrón de tabla + `EmptyState` de `admin/memberships/page.tsx`.
- **Formulario "Emitir invitación"**: modal/dialog (reusar `src/components/ui/dialog.tsx`) con dos modos — por email libre o por `membershipId` (selector de membresías `authorized`/`active` sin usuario vinculado). Llama `POST /api/admin/activation-invitations` vía `fetch()` client-side (patrón ya usado en `test-email-form.tsx`) — es la primera vez que se conecta este endpoint a una UI real.
- **Acciones por fila**: "Cancelar" → `POST .../[id]/cancel` (requiere confirmación, motivo opcional); "Forzar expiración" → `POST .../[id]/force-expire` (P2 pero trivial de incluir en el mismo lote si el tiempo alcanza, dado que la tabla ya está armada).
- **Backend adicional**: ninguno.

### 4.3 Reconciliación de Mercado Pago — `/admin/payments`
- **Backend**: `POST /api/admin/payments/mercado-pago/reconcile` — revisar el contrato exacto (¿acepta filtro por rango de fechas / IDs específicos, o siempre corre sobre todas las membresías pendientes?) antes de diseñar el formulario final; no confirmado en esta pasada, marcar como riesgo (sección 11).
- **Scope/filtros**: como mínimo, ejecutar sobre todas las membresías con proveedor externo en estado inconsistente. Si el endpoint no soporta filtros, la UI es simplemente un botón "Ejecutar reconciliación" sin controles adicionales.
- **Flujo**: botón "Ejecutar reconciliación" → diálogo de confirmación (patrón ya usado en `membership-actions.tsx` para suspender/cancelar, que exige motivo) → llamada `fetch()` POST → mostrar resumen de resultados (cuántas membresías se revisaron, cuántas cambiaron de estado, errores por membresía) en un panel de resultado, no en un toast efímero — dado que puede ser una operación larga con múltiples resultados.
- **Errores**: mostrar lista de membresías que fallaron individualmente (el patrón de `resyncMembershipAction` ya maneja `PaymentProviderError` por membresía individual; la versión masiva debería devolver un array de resultados por ítem).
- **Permisos**: `requirePlatformOwner`, igual que el resto.
- **Backend adicional**: no, el endpoint ya existe — solo falta conectar UI.

### 4.4 Pantalla de auditoría — `/admin/audit`
- **Gap confirmado**: `src/lib/admin/audit.ts` (leído completo) solo exporta `recordAdminAuditEvent` — un `insert` puro contra `admin_audit_events`, con comentario explícito en línea 19-20: *"Única vía de escritura... no existe update/delete acá a propósito"*. No hay ninguna función de lectura/listado en todo el repo (confirmado por grep de `admin_audit_events` — los 7 archivos que matchean son todos de escritura o tipos generados).
- **Esto significa que esta pantalla SÍ requiere backend adicional real**, a diferencia de las otras 3 P0: una función `listAdminAuditEvents({ actorUserId?, action?, entityType?, entityId?, dateFrom?, dateTo?, page, pageSize })` en `src/lib/admin/audit.ts` (o un archivo `repository.ts` hermano, siguiendo el patrón de `src/lib/memberships/repository.ts`), más — a elección de implementación — o bien un Route Handler `GET /api/admin/audit` o una llamada directa server-side desde el Server Component de la página (igual que `listMembershipsForAdmin` se llama directo desde `admin/memberships/page.tsx` sin pasar por API route).
- **Tabla**: columnas Fecha/hora, Actor (resolver `actor_user_id` a nombre/email — requiere join o lookup adicional, otro sub-gap a resolver en la función de lectura), Acción (`action`, ej. `membership.suspend`), Entidad (`entity_type` + `entity_id`), Motivo (`reason`).
- **Filtros**: por actor, acción, tipo de entidad, rango de fechas — todos como querystring, mismo patrón que `admin/memberships/page.tsx` (`searchParams`).
- **Detalle**: al hacer clic en una fila, expandir/mostrar `before_data`/`after_data`/`metadata` (JSON) — **consideración de sanitización**: estos campos pueden contener PII (emails, nombres) o valores sensibles ya enmascarados en otros lados (ver `maskExternalId` en `status-badge.tsx`); antes de renderizar el JSON crudo, revisar si `before_data`/`after_data` de algún `action` guarda IDs externos completos sin enmascarar — auditar caso por caso al implementar, no asumir que es seguro mostrar el JSON tal cual.
- **Paginación**: igual patrón `page`/`pageSize` que membresías.
- **Permisos**: `requirePlatformOwner`, sin excepciones — es la pantalla más sensible de todas (contiene historial de todas las acciones administrativas).

---

## 5. Pantallas P1

| Pantalla | Ruta | UI mínima | Backend reutilizado |
|---|---|---|---|
| Lista + cancelar invitaciones | `/admin/invitations` | Ver 4.2 (mismo lote que P0 de invitaciones — no separar) | `GET .../activation-invitations`, `POST .../[id]/cancel` |
| Crear membresía manual | `/admin/memberships` (botón "Nueva membresía" + dialog) o subruta `/admin/memberships/new` | Formulario: email, plan, estado inicial, motivo | `POST /api/admin/memberships` |
| Eventos de webhook no matcheados | `/admin/payments` (tab "Eventos") | Tabla de eventos huérfanos + acción de resolución manual (vincular a membresía o descartar — confirmar si el endpoint soporta acción de resolución o es solo lectura) | `GET /api/admin/payments/mercado-pago/unmatched-events` |
| Limpieza de checkouts vencidos | `/admin/payments` (tab "Checkouts") | Botón "Limpiar vencidos" + confirmación + resumen (cuántos se limpiaron) | `POST /api/admin/payments/mercado-pago/cleanup` |
| Confirmación manual de Google OAuth / Auth Hook | — (sin pantalla) | **No es automatizable**: no hay Supabase Auth Management API disponible en este entorno. Se resuelve como ítem de runbook operativo — agregar un párrafo en `docs/MEMBERSHIP_OPERATIONS.md` (o similar) con el paso a paso manual en el dashboard de Supabase, y opcionalmente un texto estático (no interactivo) en `/admin/settings` recordando el procedimiento, tal como ya hace hoy la propia página (confirmado en el audit previo: la página ya documenta textualmente que debe verificarse manualmente). | N/A |

---

## 6. Tabla de componentes reutilizables

| Componente | Existe | Reutilizable | Requiere ajuste | Debe crearse | Pantallas que lo usarán |
|---|---|---|---|---|---|
| `PageHeader` (`layout/page-header.tsx`) | Sí | Sí | No | — | Todas las nuevas |
| `ContentContainer` (`layout/content-container.tsx`) | Sí | Sí | No | — | Todas las nuevas |
| `EmptyState` (`ui/empty-state.tsx`) | Sí | Sí | No | — | Invitaciones, Pagos, Auditoría |
| `Badge` (`ui/badge.tsx`) | Sí | Sí | No (variantes ya cubren success/warning/error/draft) | — | `InvitationStatusBadge`, `WebhookEventStatusBadge` (envoltorios nuevos, mismo patrón que `MembershipStatusBadge`) |
| `Dialog` (`ui/dialog.tsx`) | Sí | Sí | No | — | Confirmaciones (cancelar invitación, ejecutar reconciliación, limpiar checkouts) |
| `Button`, `Input`, `Select`, `Checkbox` (`ui/*`) | Sí | Sí | No | — | Formularios nuevos |
| Tabla de datos ad-hoc (patrón `<table>` inline) | Parcial (repetido, no componentizado) | Sí, como referencia | Sí — si se quiere evitar duplicar el HTML de tabla 4 veces más, conviene extraer un `AdminDataTable` genérico | Opcional (mejora, no bloqueante) | Invitaciones, Pagos (eventos/checkouts), Auditoría |
| Paginación (`Anterior/Siguiente` inline) | Parcial (repetido en `admin/memberships/page.tsx` líneas 192-218) | Sí, como referencia | Sí — mismo caso que la tabla, extraer `PaginationControls` evita duplicar 3 veces más | Opcional (mejora) | Invitaciones, Pagos, Auditoría |
| Filtros (`membership-filters.tsx`) | Existe pero es ad-hoc a membresías | No directamente | Sí — no genérico, habría que escribir un `FilterBar` nuevo o simplemente replicar el patrón por pantalla | Depende del criterio de tiempo — replicar patrón es más rápido que generalizar | Invitaciones, Auditoría |
| `AdminPageHeader` (specializado sobre `PageHeader`) | No | — | — | No necesario — `PageHeader` ya cubre breadcrumbs+actions | — |
| `ConfirmDialog` genérico | No (cada acción reimplementa su propio dialog en `membership-actions.tsx`/`plan-dialogs.tsx`) | — | — | Opcional — mismo trade-off que tabla/paginación: reusar el patrón existente por copy-paste es más rápido para 3-4 pantallas nuevas; generalizar rinde si se anticipan más pantallas admin después | Cancelar invitación, ejecutar reconciliación, limpiar checkouts |
| `DetailDrawer` / Timeline | No | — | — | Sí, nuevo — para el detalle expandible de `before_data`/`after_data` en Auditoría | Auditoría |
| `CopyButton` | No | — | — | Opcional — útil si se muestran IDs largos (ej. `entity_id` en auditoría) pero no bloqueante | Auditoría |
| `ResultSummary` (resumen de operación masiva) | No | — | — | Sí, nuevo — necesario para mostrar resultados de reconciliación masiva y limpieza de checkouts (cuántos ítems procesados/fallidos) | Pagos |
| `ConfigurationStatus` | Ya existe el patrón inline en `admin/settings/page.tsx` (no extraído como componente) | Sí como referencia | No | — | No se necesita nueva pantalla que lo use |

**Conclusión de la sección**: no hace falta construir un sistema de componentes admin desde cero. El patrón dominante en el código actual es "cada pantalla reimplementa su tabla/paginación/dialog inline" y es consistente en estilo (mismas clases Tailwind, mismos componentes base `ui/*`) — replicar ese patrón para las pantallas nuevas es más barato y menos riesgoso que generalizar antes de tener 2-3 casos de uso reales adicionales. Los únicos componentes genuinamente nuevos son `ResultSummary` (Pagos) y algo tipo `DetailDrawer`/expandable row (Auditoría).

---

## 7. Lotes de implementación

### Lote A — Navegación + Invitaciones + Auditoría (P0 núcleo)
- **Rutas**: sidebar link "Administración"; `/admin/invitations` (nueva); `/admin/audit` (nueva).
- **Archivos probables**:
  - `src/components/layout/sidebar.tsx` (agregar prop `profile`, ítem condicional)
  - `src/components/layout/app-shell.tsx` o donde se instancie `<Sidebar>` (pasar `profile`)
  - `src/app/(app)/admin/layout.tsx` (extender `ADMIN_NAV` con "Invitaciones" y "Auditoría")
  - `src/app/(app)/admin/invitations/page.tsx`, `invitation-filters.tsx`, `invitation-form.tsx`, `invitation-status-badge.tsx` (nuevos)
  - `src/app/(app)/admin/audit/page.tsx`, `audit-filters.tsx`, `audit-detail.tsx` (nuevos)
  - `src/lib/admin/audit.ts` (agregar función de lectura — **backend nuevo**, ver 4.4) o `src/lib/admin/audit-repository.ts` nuevo
- **Backend reutilizado**: `GET/POST /api/admin/activation-invitations`, `.../[id]/cancel`, `.../[id]/force-expire`, `resendActivationAction` existente.
- **Backend nuevo**: función de lectura paginada de `admin_audit_events` con resolución de actor (email/nombre).
- **Riesgos**: la función de lectura de auditoría es el único ítem de este lote con trabajo de backend real — puede correr en paralelo al resto de la UI de invitaciones, pero bloquea específicamente `/admin/audit`. Sanitización de `before_data`/`after_data` antes de exponer en UI (ver 4.4) debe revisarse caso por caso.
- **Validaciones**: confirmar que el sidebar oculta el ítem para no-owners (test manual con usuario no-owner); confirmar que `/admin/audit` pagina correctamente con volumen real de eventos (la tabla ya tiene datos de sprints anteriores, según el audit previo "invocado desde casi todas las Server Actions administrativas").
- **Criterio de cierre**: ítem "Administración" visible y funcional solo para `is_platform_owner`; `/admin/invitations` permite emitir/listar/cancelar sin usar la consola del navegador; `/admin/audit` lista y filtra eventos reales con paginación.

### Lote B — Pagos: Reconciliación + Webhooks + Checkouts (P0/P1)
- **Rutas**: `/admin/payments` (con tabs o subrutas: reconciliación, eventos no matcheados, checkouts vencidos).
- **Archivos probables**: `src/app/(app)/admin/payments/page.tsx`, `payments/reconcile-panel.tsx`, `payments/unmatched-events-table.tsx`, `payments/cleanup-panel.tsx` (nuevos); extender `ADMIN_NAV` en `admin/layout.tsx`.
- **Backend reutilizado**: `POST .../reconcile`, `GET .../unmatched-events`, `POST .../cleanup` — los 3 ya existen y están protegidos por `requirePlatformOwner`.
- **Riesgo principal (no resuelto en esta pasada)**: no se leyó el contrato exacto (request/response shape) de los 3 endpoints de pagos — antes de diseñar los formularios finales, leer `src/app/api/admin/payments/mercado-pago/{reconcile,cleanup,unmatched-events}/route.ts` para confirmar parámetros aceptados y forma de la respuesta (¿devuelve resumen agregado o lista item-por-item?).
- **Validaciones**: probar reconciliación contra un ambiente de staging/sandbox de Mercado Pago antes de exponerlo como botón de un clic en producción — es una operación con efectos reales sobre membresías.
- **Criterio de cierre**: las 3 operaciones dejan de requerir `curl`/consola y quedan accesibles con confirmación + resumen de resultado en pantalla.

### Lote C — Membresía manual + Runbook operativo + resto de P1
- **Rutas**: botón/dialog "Nueva membresía" en `/admin/memberships`; actualización de `docs/MEMBERSHIP_OPERATIONS.md` (o equivalente) con el paso de confirmación manual de Google OAuth.
- **Archivos probables**: `src/app/(app)/admin/memberships/page.tsx` (agregar botón + dialog), `src/app/(app)/admin/memberships/new-membership-dialog.tsx` (nuevo).
- **Backend reutilizado**: `POST /api/admin/memberships`.
- **Riesgo**: la confirmación de Google OAuth / Auth Hook queda explícitamente fuera de cualquier pantalla — si el usuario esperaba una UI para esto, aclarar que es un límite de plataforma (sin Supabase Management API disponible), no un gap de implementación pendiente.
- **Criterio de cierre**: alta de membresía manual sin pasar por checkout de Mercado Pago disponible desde la UI; runbook documentado para el paso manual de Supabase.

### Dependencias entre lotes
- Lote A es independiente y debe ir primero porque incluye el link de navegación que hace descubribles a todos los demás lotes.
- La función de lectura de `admin_audit_events` (dentro de Lote A) no bloquea a Lote B ni C — son independientes entre sí.
- Lote B depende de confirmar el contrato de los 3 endpoints de pagos antes de comprometer diseño de UI final (riesgo, no bloqueo duro).
- Lote C es el más aislado — puede reordenarse o correr en paralelo con B.

---

## 8. Riesgos generales
- Contrato exacto de los 3 endpoints de pagos (`reconcile`, `cleanup`, `unmatched-events`) no verificado en esta pasada de planificación — releer antes de implementar Lote B.
- Enum de estados de `account_activation_invitations` no confirmado — verificar antes de construir `InvitationStatusBadge`.
- Sanitización de `before_data`/`after_data` en `admin_audit_events` — puede exponer PII o valores no enmascarados si se renderiza el JSON sin revisión.
- La función de lectura de auditoría es la única pieza de backend nueva de todo el roadmap — es baja complejidad pero es trabajo real (no solo wiring de UI), a diferencia de todo lo demás que es 100% conectar endpoints ya existentes.
- Sidebar hoy no recibe `profile` como prop — el cambio para el ítem condicional toca la cadena de props desde el layout padre, no es un cambio aislado a `sidebar.tsx`.
- Reconciliación masiva de Mercado Pago tiene efectos reales sobre estado de membresías — cualquier UI de "un clic" para esto necesita confirmación explícita y no debería auto-ejecutarse sin fricción.

---

## 9. Confirmación de alcance
Esta tarea fue exclusivamente de planificación y lectura. No se modificó ningún archivo de UI, API, Server Action, ni base de datos. No se crearon migraciones. No se cambiaron permisos. No se ejecutó `git commit`, `git push` ni deploy. El único archivo creado es este documento, `proposal-studio/docs/ADMIN_UI_MAP.md`.

## 10. Lote A — cerrado (2026-07-18)

Implementación real (no solo planificación). Resumen de decisiones tomadas frente a lo planificado en las secciones anteriores:

### Navegación
- `src/components/layout/sidebar.tsx`: recibe `profile: Profile | null` como prop nueva (pasado desde `src/components/layout/app-shell.tsx`, que ya lo recibía de `src/app/(app)/layout.tsx` — sin query nueva a Supabase). Ítem "Administración" (`ShieldCheck`) visible solo si `isPlatformOwner(profile)`, con estado activo para cualquier ruta que empiece con `/admin`.
- Se eliminó el link "Soporte" (`href="#"`, muerto) y el ítem de nav "Configuración" que duplicaba "Nueva Propuesta" (ambos apuntaban a `/proposals/new`) — se conservó "Nueva Propuesta" como único CTA a esa ruta.
- `src/components/layout/top-navigation.tsx`: se eliminaron el buscador sin lógica, los links "Borradores" y "Actividad de Clientes" (`href="#"`), el botón "Generar PDF" sin `onClick` y el botón de notificaciones sin handler — todo decorativo sin backend ni ruta real, según ya había confirmado `docs/UI_COVERAGE_AUDIT.md`. Se conservó únicamente el bloque de perfil (nombre, rol, avatar).
- `src/app/(app)/admin/page.tsx` (nuevo): no existía índice de `/admin` — se optó por un `redirect("/admin/memberships")` mínimo en vez de construir una pantalla de resumen (fuera de alcance de este lote), siguiendo la opción documentada en la sección 4.1.

### `ADMIN_NAV` (`src/app/(app)/admin/layout.tsx`)
Se agregaron "Invitaciones" (`/admin/invitations`) y "Auditoría" (`/admin/audit`). "Pagos" queda deliberadamente fuera: `/admin/payments` no existe (Lote B), no se agrega un link muerto.

### Invitaciones — `/admin/invitations`
Implementado en `src/app/(app)/admin/invitations/` (`page.tsx`, `actions.ts`, `invitation-filters.tsx`, `invitations-table.tsx`, `invitation-row-actions.tsx`, `create-invitation-dialog.tsx`, `invitation-status-badge.tsx`) + `src/lib/account-activation/admin-queries.ts` (función nueva `listActivationInvitationsForAdmin`, paginada, con filtro de estado/búsqueda y contadores por estado). Contrato real verificado en el código (no asumido):
- `POST /api/admin/activation-invitations` responde `{ sent: true, emailSent: boolean }` en éxito, `{ error }` en fallo — la UI usa esos nombres exactos de campo.
- Estados reales de `account_activation_invitations.status`: `pending | used | revoked | expired` (constraint en la migración `20260716020000_account_activation_invitations.sql`) — el estado `expired` no es un valor de columna real, se deriva comparando `expires_at` con la hora actual sobre filas `pending` (mismo criterio que `listActivationInvitations` original).
- `created_by_user_id` referencia `auth.users`, no `public.profiles` — no admite embed de PostgREST; el nombre del creador se resuelve con una query batched adicional a `profiles` por los ids únicos de la página.
- No existe columna de estado de envío de email persistido — documentado como pendiente explícito en `UI_COVERAGE_AUDIT.md`.
- Acciones implementadas con Server Actions nuevas (`src/app/(app)/admin/invitations/actions.ts`), cada una revalida `requirePlatformOwner()` independientemente del guard del layout: `createInvitationAction`, `cancelInvitationAction`, `forceExpireInvitationAction`, `resendInvitationAction`. Las tres últimas reutilizan servicios ya existentes en `src/lib/account-activation/service.ts` (que ya auditaban internamente); `createInvitationAction` agrega su propio `recordAdminAuditEvent` porque `issueAndSendActivationInvitation` no auditaba la creación (la usan también flujos sin actor administrativo).

### Auditoría — `/admin/audit`
Backend nuevo: `src/lib/admin/audit-queries.ts` → `listAdminAuditEvents({ page, pageSize, actorUserId?, action?, entityType?, entityId?, dateFrom?, dateTo? })`, llamada directo desde el Server Component (sin ruta API nueva), con `requirePlatformOwner()` propio además del guard del layout. No se implementó filtro por "resultado": la tabla `admin_audit_events` no tiene esa columna (confirmado contra la migración y los tipos generados) — no se inventó un campo inexistente.

Sanitización: `src/lib/admin/sanitize.ts` (`sanitizeForDisplay`, función pura, nunca muta el original) redacta recursivamente por clave (case-insensitive, normalizando separadores) los patrones `password`, `token`, `access_token`, `refresh_token`, `secret`, `api_key`, `authorization`, `cookie`, `jwt`, `signature`, `service_role`. Diff legible: `src/lib/admin/audit-diff.ts` (`buildAuditDiff`), comparación de primer nivel entre `before_data`/`after_data` ya sanitizados, sin librería externa. Ambos con tests unitarios (`sanitize.test.ts`, `audit-diff.test.ts`).

UI en `src/app/(app)/admin/audit/` (`page.tsx`, `audit-filters.tsx`, `audit-table.tsx`): filtros por actor/acción/entidad/rango de fechas como query params server-aplicados, tabla con fila expandible (detalle: antes/después/metadata sanitizados + diff + actor + motivo), vista de tarjetas en mobile.

### Fuera de alcance de este lote (confirmado, no implementado)
`/admin/payments` (Lote B), "Crear membresía manual" (Lote C), runbook operativo de Google OAuth (Lote C). Ningún archivo de esos lotes fue tocado.

## 11. Lote B — cerrado (2026-07-18)

Implementación real. Antes de diseñar nada se releyó el código fuente completo de los 3 endpoints de pagos (riesgo señalado en la sección 8) — el hallazgo más importante corrige la sección 4.3: `POST /api/admin/payments/mercado-pago/reconcile` **no acepta ningún filtro ni corre sobre "todas las membresías pendientes"** — recibe `{ preapprovalId: string }`, un único id de suscripción de Mercado Pago, y reconcilia esa suscripción puntual reutilizando exactamente la misma lógica que el webhook (`reconcileMercadoPagoPreapproval`, `src/lib/payments/reconciliation.ts`). No hay reconciliación masiva en el backend real; la UI se diseñó en consecuencia.

### Estructura de navegación elegida
`ADMIN_NAV` (`admin/layout.tsx`) suma un ítem "Pagos" → `/admin/payments`. Se usaron **rutas separadas** (`/admin/payments`, `/admin/payments/events`, `/admin/payments/checkouts`) en vez de tabs dentro de una sola página: no existe ningún precedente de tabs en todo el panel admin (confirmado en la sección 1.5 original — "No existen... barra de filtros genérica"), y el patrón dominante ya establecido en Lote A y en las subrutas de membresías (`/admin/memberships/health`, `/admin/memberships/migrate-users`, ninguna de las dos con ítem propio en `ADMIN_NAV`, ambas enlazadas desde la página padre) es exactamente ese: página completa por función, subrutas enlazadas desde la pantalla contenedora. `/admin/payments` actúa como esa pantalla contenedora, con links a `/events` y `/checkouts`.

### `/admin/payments` (resumen)
Métricas cheap con `count: "exact", head: true` sobre columnas indexadas (`payment_provider_events_status_idx`, `membership_checkout_attempts_status_idx`): eventos no asociados, eventos fallidos, checkouts abiertos vencidos sin limpiar, checkouts ya limpiados. "Última reconciliación" se resuelve reutilizando `listAdminAuditEvents` de Lote A filtrando por la acción nueva `payments.reconcile_subscription` (page=1, pageSize=1) — no se creó una columna ni tabla nueva para esto. Panel de reconciliación manual (`reconcile-panel.tsx`).

### Reconciliación (`reconcile-panel.tsx` + `reconcileSubscriptionAction`)
Formulario de un único `preapprovalId`. Confirmación reforzada frente al `ConfirmDialog` simple de invitaciones/membresías: además del `Dialog`, exige tildar un checkbox ("entiendo que esto puede aplicar cambios reales de inmediato y que no hay forma de previsualizar el resultado") antes de habilitar el botón de ejecución — justificado porque, a diferencia de suspender/cancelar una membresía (que ya se sabe qué membresía y qué transición), acá ni siquiera se sabe de antemano si el id corresponde a algo local, y no hay dry-run. Resultado interpretado por `buildReconcileResultSummary` (`src/lib/payments/reconcile-result-summary.ts`, con 6 tests): distingue `matched: false` (con motivo legible: `unmatched`/`multiple_attempts_conflict`/`attempt_membership_missing`) de `matched: true` con `applied: true` (éxito) o `applied: false` (coincidencia sin cambios, con `skipReason` legible) — nunca oculta un resultado parcial o sin cambios como si fuera éxito silencioso.

### `/admin/payments/events`
Backend nuevo: `listPaymentProviderEvents` (`src/lib/payments/webhook-events.ts`), paginado, filtros reales (`processing_status` — incluye `unmatched` como valor, no como mecanismo especial —, `provider`, `event_type`, `error_message` no nulo, rango de fechas, id interno exacto). Confirmado contra la migración: `payment_provider_events` no tiene ninguna columna que la relacione con `memberships`/`membership_checkout_attempts` (`Relationships: []`) — no se inventó un "usuario"/"membresía vinculada" en esta tabla. `provider_resource_id` nunca se expone completo (`maskResourceId`, ya existente, reexportado). Detalle expandible con payload sanitizado (`sanitizeForDisplay` de Lote A) y aviso explícito de que no hay botón de reintento real (gap de backend, no de UI).

### `/admin/payments/checkouts`
Backend nuevo: `listCheckoutAttemptsForAdmin` (`src/lib/payments/checkout-attempts-repository.ts`), paginado, con embed real a `memberships`/`membership_plans` (FKs existentes) para mostrar email y plan sin duplicar datos. Filtros: estado (enum real del constraint SQL), plan, proveedor, "suscripción vinculada" (`provider_subscription_id` no nulo — proxy real de "asociado"), búsqueda por email (resuelta en dos pasos: `memberships.email ilike` → `membership_id in (...)`, documentado en el propio comentario del código). Panel de limpieza (`cleanup-panel.tsx` + `cleanupExpiredCheckoutAttemptsAction`): `Dialog` de confirmación simple (no reforzado como la reconciliación) porque la operación es no destructiva e idempotente — solo transiciona `status` a `expired`, nunca llama a Mercado Pago, correrla dos veces seguidas no cambia nada la segunda vez.

### Backend nuevo (resumen)
- Lecturas: `listCheckoutAttemptsForAdmin`, `countExpiredPendingCheckoutAttempts`, `countExpiredCheckoutAttempts`, `listPaymentProviderEvents`, `countPaymentProviderEventsByStatus`.
- Escrituras: `reconcileSubscriptionAction`, `cleanupExpiredCheckoutAttemptsAction` (`src/app/(app)/admin/payments/actions.ts`) — cada una con `requirePlatformOwner()` propio y `recordAdminAuditEvent` nuevo (acciones `payments.reconcile_subscription`, `payments.cleanup_expired_checkouts`); ninguna de las dos hace `fetch` a la ruta API existente, llaman directo al mismo servicio (`reconcileMercadoPagoPreapproval`, `cleanupExpiredCheckoutAttempts`), mismo criterio que `resyncMembershipAction` de Lote A/etapas previas.

### Fuera de alcance de este lote (confirmado, no implementado)
"Crear membresía manual" (Lote C), runbook operativo de Google OAuth (Lote C). Ningún archivo de esos lotes fue tocado.

## 12. Lote C — cerrado (2026-07-18)

### Membresía manual — `/admin/memberships/new`
Botón "Nueva membresía" agregado a `/admin/memberships` (junto a los exports existentes). Formulario: email, plan (select, planes inactivos deshabilitados igual que `MigrateUsersForm`), vencimiento opcional (input `date`, convertido a ISO client-side antes del submit, mismo patrón que `migrate-users-form.tsx`), motivo obligatorio. Server Action nueva `createMembershipAction` (`src/lib/memberships/admin-actions.ts`) — llama directo a `createAuthorizedMembership` (`src/lib/memberships/service.ts`, servicio ya existente desde la Etapa 3, el mismo que usa `POST /api/admin/memberships`), no hace `fetch` interno a la ruta API (mismo criterio que `reconcileSubscriptionAction`/`resyncMembershipAction`). Redirige a `/admin/memberships/[id]` al crear exitosamente. Escribe en `admin_audit_events` (`membership.create_manual`) — la ruta API original no auditaba esta acción.

**Backend adicional**: ninguno — `createAuthorizedMembership` ya existía y ya estaba probado en producción vía la ruta API (Etapa 3). Solo se conectó una Server Action nueva a un servicio existente.

### Google OAuth / Auth Hook — confirmado como límite de plataforma
No se implementó ninguna UI (correcto, ya estaba documentado así). El runbook manual completo ya existía en `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md` (secciones 6-7) desde una etapa anterior a este audit — no se creó contenido nuevo, solo se confirmó que sigue vigente y que `/admin/settings` lo referencia correctamente. Ninguna llamada a la API de administración de Supabase se intentó desde componentes de la app: no existe tal integración disponible en este entorno.

### Configuración administrativa — sin gaps nuevos
Se buscaron tablas de configuración/flags (`feature_flag`, `app_settings`, `system_config`, `platform_config`) en `src/` y `supabase/migrations/**`: no existe ninguna. `/admin/settings` ya cubre el 100% de lo que tiene soporte backend real (variables de entorno enmascaradas — nunca valores — y modo de enforcement de solo lectura). No se expuso ningún secreto.

### Consistencia transversal
Se unificaron los breadcrumbs de `/admin/memberships`, `/admin/memberships/[id]`, `/admin/memberships/health`, `/admin/memberships/migrate-users`, `/admin/membership-plans` y `/admin/settings` para que el primer segmento sea siempre `{ label: "Admin", href: "/admin" }` — antes esas 6 pantallas (todas de etapas previas al Lote A) tenían "Admin" sin link, mientras que las pantallas de Lote A/B (`/admin/audit`, `/admin/invitations`, `/admin/payments*`) sí lo tenían. Cambio cosmético, no afecta lógica ni tests.

### Auditoría final de código y componentes
`grep` de `TODO|FIXME|not implemented|href="#"` sobre `/admin`, `lib/admin`, `components/admin`: sin coincidencias reales. No se encontró duplicación de componentes que consolidar — el formulario nuevo reutiliza primitivos existentes (`Button`, `Input`, `Label`, `Textarea`, `Select`) y el patrón `useState`/`useTransition` ya establecido (no se introdujo `useActionState`, que hubiera sido inconsistente con el resto del panel).

### Validación
`npx tsc --noEmit` sin errores, `npm run lint` sin errores ni warnings, `npm test` 116/116 (sin tests nuevos — no hay lógica de dominio nueva que testear unitariamente, `createMembershipAction` es wiring puro sobre un servicio ya cubierto), `npm run build` compila y genera `/admin/memberships/new`.

### Fuera de alcance / no implementado (confirmado, no fabricado)
- No se construyó ningún `DataTable`/`ConfirmDialog`/`PaginationControls` genérico — el panel completo (5 lotes) sigue el mismo criterio documentado en la sección 6: replicar el patrón por pantalla es más barato que generalizar para ~10 pantallas administrativas totales.
- No se creó ninguna pantalla de resumen/dashboard en `/admin` más allá del redirect existente — fuera del alcance de esta etapa (no pedido).
- Ningún archivo de Invitaciones, Auditoría o Pagos fue modificado en este lote, salvo el ajuste cosmético de breadcrumb ya señalado en las pantallas que correspondía (ninguna de esas tres áreas tenía el problema — ya usaban `href`).
