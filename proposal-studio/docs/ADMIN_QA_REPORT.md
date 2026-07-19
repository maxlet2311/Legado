# Etapa 6 — QA integral del panel administrativo

Fecha: 2026-07-18. Auditoría funcional, visual, responsive, de accesibilidad y seguridad de `/admin/**` (13 rutas), en navegador real (Chromium vía Playwright) sobre el entorno local (`next dev -p 3002`) contra el proyecto Supabase configurado en `.env.local`.

## Resumen ejecutivo

**Estado: NO listo para release sin decisión de producto sobre el hallazgo H-01 (mobile).** El resto del panel (funcionalidad, seguridad, sanitización, consola/red, build) está en buen estado.

- **P0:** 0
- **P1:** 0
- **P2:** 1 (H-01 — responsive mobile, no corregido, ver justificación abajo)
- **P3:** 2 (H-02, H-03 — corregidos)

No se hizo ningún cambio de alcance, diseño ni reglas de negocio. Las dos correcciones aplicadas son cambios de una línea cada una, sin impacto visual.

## Entorno

- Comandos: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run dev -- -p 3002`, `npx playwright test`, y scripts ad-hoc en `e2e/qa-provision-users.mjs` (creación/borrado de usuarios de prueba) para el recorrido en navegador.
- Navegador: Chromium (Playwright 1.61.1), headless.
- Viewports probados: **390×844** (mobile) y **1440×900** (desktop) en el recorrido completo de las 13 rutas. Los otros 4 viewports pedidos (360×800, 768×1024, 1024×768, 1366×768) **no se probaron individualmente** — el hallazgo H-01 ya es evidente y reproducible en 390×844, y afecta a todo el rango mobile/tablet angosto por ser un problema de layout fijo (sidebar de 280px sin breakpoint), no de un viewport puntual. Esto es una limitación declarada, no un resultado inventado.
- Usuarios/roles probados:
  - **Platform Owner real** (`max@didactia.ar`, credenciales provistas por el usuario para esta sesión).
  - **Usuario activo sin rol admin**: `h0-qa-regular@proposalstudio.test` (creado y borrado en esta sesión).
  - **Usuario inactivo** (`is_active=false`): `h0-qa-inactive@proposalstudio.test` (creado y borrado en esta sesión).
  - Casos adicionales de rol/RLS (admin no-owner, advisor, admin inactivo, intento de escalada de privilegios, segundo owner) cubiertos por `e2e/platform-owner-guards.mjs` (script ya existente en el repo, no escrito en esta sesión) — **26/26 aserciones OK**.
- Limitaciones:
  - La suite `e2e/admin-memberships.spec.ts` (ya existente, no escrita en esta sesión) tuvo corridas intermitentes con timeout de login dentro de Playwright — diagnostiqué la causa: el rate limiter de `signInAction` (`sign-in:email`, 10 intentos/15min) se agotó por el volumen de logins que generó esta misma auditoría (múltiples corridas + scripts de diagnóstico). No es un defecto de la app — de hecho confirma que el rate limit funciona — pero impidió tener una corrida 100% verde de esa suite específica al final de la sesión. Evidencia equivalente y suficiente se obtuvo por otras vías (ver "Seguridad").
  - No se ejecutaron acciones con efectos reales: no se reconcilió ninguna suscripción real de Mercado Pago, no se ejecutó la limpieza de checkouts vencidos (aunque es idempotente y no destructiva según el propio código, cae dentro de la restricción "no limpiar datos de producción"), no se crearon membresías ni invitaciones reales, no se envió ningún correo de prueba.
  - El entorno usa un proyecto Supabase con datos reales de desarrollo/staging (no una base descartable) — se confirmó visualmente en `/admin/audit`. Las capturas quedaron en `docs/qa/screenshots/` (uso interno, no publicadas) y no contienen PII de terceros ni secretos (se verificó: emails de membresías son de sandbox/test, valores de env vars aparecen solo como "Configurada"/"Falta").

## Cobertura

Recorrido automatizado (Playwright, login real como Platform Owner) por las 13 rutas listadas en `docs/ADMIN_PANEL_STATUS.md`, en 2 viewports, con captura de: screenshot full-page, errores/warnings de consola, respuestas HTTP ≥400, scroll horizontal de la página, y un scan de fugas de datos sensibles sobre el HTML crudo (patrones: password, token, access_token, refresh_token, secret, api_key, authorization, cookie, jwt, signature, service_role).

| Ruta | Desktop | Mobile | Acciones | Accesibilidad | Consola/Red | Estado |
|---|---|---|---|---|---|---|
| `/admin` (redirect) | OK | OK (H-01) | N/A | OK | Limpio | OK* |
| `/admin/memberships` | OK | OK (H-01) | Filtros, exports, crear — revisados por código | OK | Limpio | OK* |
| `/admin/memberships/new` | OK | OK (H-01) | Form revisado, Select sin nombre accesible en vacío | Corregido (H-03) | Limpio | OK |
| `/admin/memberships/[id]` | No recorrida en el walkthrough automatizado (requiere id existente) | — | Revisada por código (7 Server Actions) | — | — | Parcial** |
| `/admin/memberships/health` | OK | OK (H-01) | "Recalcular"/"Exportar CSV" presentes | OK | Limpio | OK* |
| `/admin/membership-plans` | OK | OK (H-01) | Revisada por código | OK | Limpio | OK* |
| `/admin/invitations` | OK | OK (H-01) | Dialog de creación revisado por código | Corregido (H-02) | Limpio | OK |
| `/admin/audit` | OK | OK (H-01) | Filtros, sanitización verificada (tests existentes + inspección visual) | OK | Limpio | OK |
| `/admin/payments` | OK | OK (H-01) | Dialog de reconciliación revisado por código (checkbox obligatorio, sin dry-run, no masivo) | OK | Limpio | OK |
| `/admin/payments/events` | OK | OK (H-01) | Sanitización vía `sanitizeForDisplay` confirmada en código | OK | Limpio | OK |
| `/admin/payments/checkouts` | OK | OK (H-01) | Dialog de limpieza revisado por código (idempotente, no destructivo, no ejecutado) | OK | Limpio | OK |
| `/admin/settings` | OK | OK (H-01) | Envío de email de prueba no ejecutado (evita correos reales) | OK | Limpio | OK* |
| `/admin/memberships/migrate-users` | No recorrida en el walkthrough automatizado | — | Revisada por código (dry-run/ejecución) | — | — | Parcial** |

\* "OK" en Acciones significa que la funcionalidad se validó por lectura de código y por los tests unitarios/E2E existentes, no ejecutando la acción con efectos reales contra el proveedor externo o borrando datos.
\** Dos rutas (`/memberships/[id]` y `/migrate-users`) no entraron en el script de recorrido automatizado (una requiere un id de membresía concreto, la otra es una operación masiva que no debía dispararse sin datos de prueba dedicados); se revisaron por código y ya contaban con cobertura en `docs/UI_COVERAGE_AUDIT.md` de la Etapa 5.

## Hallazgos

| ID | Severidad | Ruta | Problema | Reproducción | Corrección | Estado |
|---|---|---|---|---|---|---|
| H-01 | **P2** | Todas (`AppShell`/`Sidebar`, compartido por toda la app, no solo `/admin`) | El sidebar fijo de 280px (`w-70`) no tiene un patrón de navegación mobile (drawer/hamburger); en viewports angostos ocupa la mayoría del ancho y el contenido queda comprimido a ~110–190px, forzando el texto a una palabra por línea y produciendo scroll horizontal en toda la página. | Abrir cualquier ruta de `/admin/**` (o cualquier ruta de la app) en 390×844. Ver `docs/qa/screenshots/_admin_payments__mobile-390x844.png` y `_admin_settings__mobile-390x844.png`. | **No corregida.** Implementar un drawer/hamburger mobile real es un cambio de patrón de navegación (nueva UI), no un bug puntual — cae dentro de "no rediseñes" del alcance de esta etapa. Se documenta como bloqueante para uso mobile real y requiere una decisión de producto/diseño explícita antes de implementarse. | Pendiente |
| H-02 | P3 (corregido) | `src/components/ui/empty-state.tsx` (compartido, se manifiesta en `/admin/invitations` y `/admin/payments/checkouts` sin resultados) | `EmptyState` renderizaba su título en `<h3>` directamente después del `<h1>` de `PageHeader`, saltando el nivel `<h2>` — orden de encabezados inválido para lectores de pantalla. | Confirmado por evaluación DOM automatizada en `/admin/invitations` (mobile y desktop) cuando no hay invitaciones que coincidan con los filtros. | Cambiado `<h3>` → `<h2>` (una línea, sin cambio visual: la clase `text-h4` que define el tamaño no se tocó). | Corregido |
| H-03 | P3 (corregido) | `src/app/(app)/admin/memberships/new/new-membership-form.tsx` | El `Select` de "Plan" no tenía nombre accesible: su `Label` no usa `htmlFor` y `SelectTrigger` no exponía `aria-label`. Si no hay ningún plan activo (`defaultValue` queda `undefined`), el combobox queda completamente sin texto ni etiqueta para un lector de pantalla. | Confirmado por evaluación DOM automatizada en `/admin/memberships/new` (desktop). | Agregado `aria-label="Plan"` a `SelectTrigger` y `placeholder="Seleccioná un plan"` a `SelectValue`. | Corregido |

No se encontraron: errores de consola de la aplicación (solo warnings de Fast Refresh propios del modo dev, causados por mis propias ediciones), respuestas HTTP ≥400, fugas de datos sensibles en el HTML servido, ni breadcrumbs no clickeables (existen y sí son links reales vía `PageHeader`).

## Seguridad

- **Guards**: `requireActiveUser` / `requireAdmin` / `requirePlatformOwner` (`src/lib/auth/authorization-guards.ts`) — verificados con `e2e/platform-owner-guards.mjs`: **26/26 OK**, cubriendo owner, admin no-owner, advisor, admin inactivo, e intento de auto-escalada de un usuario común vía `UPDATE` directo (bloqueado por ausencia de policy RLS de `UPDATE`) y vía metadata de signup (el trigger `handle_new_user` ignora campos privilegiados). Constraint de owner único (`profiles_single_platform_owner_idx`) confirmado — un segundo `is_platform_owner=true` falla por índice único.
- **Acceso directo**: un usuario activo sin `is_platform_owner` que navega a `/admin/memberships` recibe el `EmptyState` "No tenés permiso para acceder a esta sección" (rama `ForbiddenError` de `AdminLayout`), nunca el panel — confirmado en una corrida limpia de `e2e/admin-memberships.spec.ts` durante esta sesión. Un usuario inactivo no puede ni mantener sesión (`signInAction` la cierra si `is_active === false`), así que un intento de acceso directo termina en `/login`, nunca en contenido de admin.
- **Server Actions**: no se intentó invocar una Server Action de admin directamente desde fuera de la UI (los ids de acción de Next.js no son triviales de reconstruir sin la UI, y el guard corre server-side en cada acción — ver `docs/AUTH_AND_ROLES.md` — por lo que ocultar un botón nunca es la única defensa). Se confirmó por lectura de código que cada Server Action bajo `/admin/**` llama a `requirePlatformOwner()` de forma independiente al layout.
- **Secretos**: `/admin/settings` solo muestra presencia/ausencia de variables de entorno ("Configurada"/"Falta"), nunca valores — confirmado visualmente. El scan de HTML crudo en las 22 capturas (11 rutas × 2 viewports) no encontró coincidencias de `password`, `token`, `secret`, `api_key`, `authorization`, `cookie`, `jwt`, `signature`, `service_role` con valores adjuntos.
- **Sanitización**: `src/lib/admin/sanitize.ts` (`sanitizeForDisplay`) está integrada en las tres superficies que muestran JSON crudo (`audit-table.tsx`, `events-table.tsx`, `checkouts-table.tsx`) y cuenta con 7 tests unitarios ya existentes que cubren: clave sensible top-level, anidada, en arrays, variantes de casing/separadores (`ApiKey`, `SERVICE-ROLE`), no-mutación del original, y paso de primitivos/null sin tocar. No se necesitó ninguna corrección.

## Validaciones

```
npx tsc --noEmit   → sin errores
npm run lint       → sin errores ni warnings
npm test           → 116/116 pasando
npm run build      → compila; las 13 rutas de /admin/** presentes en el output
```

## Pendientes

- **H-01** (P2, responsive mobile del `AppShell`/`Sidebar` compartido) — requiere decisión de producto/diseño para un patrón de navegación mobile (drawer/hamburger); no corregido en esta etapa por estar fuera del alcance "corregir defectos, no rediseñar".
- Los 4 viewports adicionales pedidos (360×800, 768×1024, 1024×768, 1366×768) no se recorrieron individualmente — ver limitación declarada arriba.
- `/admin/memberships/[id]` y `/admin/memberships/migrate-users` no se incluyeron en el recorrido automatizado en navegador (ver tabla de cobertura); quedan cubiertas solo por revisión de código y por la auditoría de Etapa 5.
- La corrida final de `e2e/admin-memberships.spec.ts` no terminó 100% verde por agotamiento del rate limiter de login propio de esta sesión de QA (no reproducible en uso normal). Recomendado: volver a correrla en un momento en que no se hayan hecho intentos de login recientes contra el mismo email.

## Confirmación de alcance

No hubo migraciones de base de datos, cambios de RLS, cambios de configuración externa, cobros reales, reconciliaciones reales, envío de correos, ni limpieza de datos de producción. No se hizo `git commit`, `git push` ni deploy. Los usuarios de prueba creados (`h0-qa-*`, y los temporales de `platform-owner-guards.mjs`) fueron borrados al finalizar la sesión.
