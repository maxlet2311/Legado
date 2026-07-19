# Fase 1 — Preparación operativa e integraciones para pruebas controladas

Fecha: 2026-07-19
Rol: Lead Engineer de implementación operativa. Punto de partida: RC1 (`docs/RC1_RELEASE_REPORT.md`, `APROBADO PARA STAGING / NO APROBADO PARA PRODUCCIÓN`). Esta fase prepara integraciones para un E2E controlado posterior — no lo ejecuta, y no abre acceso público.

## Resumen ejecutivo

El código sigue verde (`tsc`/lint/test/build). Se implementó la única pieza de código nueva permitida en esta fase — una barrera temporal de acceso, off por defecto — y se corrigió/completó documentación operativa. El resto de los bloqueantes de RC1 (Auth Hook de Google, credenciales sandbox de Mercado Pago, dominio verificado en Resend, activación de Vercel Deployment Protection) **siguen sin poder verificarse ni resolverse desde este entorno**: viven en dashboards externos (Supabase, Google Cloud, Mercado Pago, Resend, Vercel) sin API de administración disponible aquí. Se dejan como acción humana explícita, con instrucciones exactas.

Dato nuevo respecto a RC1: `membership_plans` **ya no está vacía** — existe 1 plan (`sandbox-monthly`, `is_active = false`, `provider = mercado_pago`, con `provider_plan_id` cargado), creado el 2026-07-17. RC1 decía "cero planes"; se confirma contra la base real que eso cambió después de esa auditoría. Se documenta como el plan QA candidato a reutilizar (Paso 6), no se activó ni se modificó.

`MEMBERSHIP_ENFORCEMENT_MODE` sigue en `audit` (no se tocó). No se procesaron pagos reales, no se aplicaron migraciones remotas, no se hizo commit/push/deploy.

## Estado de acceso temporal

**Mecanismo elegido: barrera de código controlada por variable de entorno (prioridad 4 de la lista), no las otras tres.**

Por qué no las otras tres:
- **Protección nativa de Vercel** (prioridad 1, la más fuerte): no se pudo verificar ni activar desde este entorno — la CLI de Vercel no está instalada/autenticada y esta sesión es no interactiva (no puede completar el flujo OAuth de `vercel login`). Es la opción **recomendada** y queda como acción humana (ver abajo), no descartada por preferencia sino por límite de entorno.
- **Allowlist explícita de usuarios/emails** vía Supabase: implica gestionar la lista en el dashboard de Auth o una tabla nueva — más superficie que el objetivo de "barrera mínima reversible" de esta fase.
- **Restricción a Platform Owner únicamente**: demasiado estrecha para un E2E controlado que en la Fase 2 probablemente necesite más de un usuario de prueba.

Implementado: `src/middleware.ts` — nuevo bloque (después del chequeo de `is_active`, antes del chequeo de `MEMBERSHIP_ENFORCEMENT_MODE=enforce`) que, si `TEMP_ACCESS_MODE=allowlist`, exige que el email del usuario autenticado esté en `TEMP_ACCESS_ALLOWLIST` (lista separada por comas, case-insensitive) para acceder a cualquier ruta de `PROTECTED_PREFIXES`. Si no está, redirige a `/login?error=restricted_access` (mensaje agregado en `src/app/login/page.tsx`, sin cerrar sesión).

- **Off por defecto**: sin la variable `TEMP_ACCESS_MODE=allowlist`, el comportamiento actual no cambia — confirmado por `npm test` (116/116) y `npm run build` sin tocar ningún test de middleware existente.
- **Rutas exceptuadas**: `/auth/callback` y `/api/webhooks/**` nunca pasan por este bloque porque no están en `PROTECTED_PREFIXES` (confirmado leyendo `src/middleware.ts:6-16` — la lista no las incluye) — la barrera nunca puede bloquear el callback de OAuth ni el webhook de Mercado Pago.
- **Cómo habilitarlo** (Vercel → Project → Settings → Environment Variables, o `.env.local` en desarrollo):
  ```
  TEMP_ACCESS_MODE=allowlist
  TEMP_ACCESS_ALLOWLIST=max@didactia.ar,qa+tester1@<dominio-controlado>
  ```
- **Cómo retirarlo antes del lanzamiento**: borrar `TEMP_ACCESS_MODE` (o dejarlo vacío) y redeploy. No requiere revertir código.

Acción humana recomendada en paralelo: activar **Vercel Deployment Protection** (Project → Settings → Deployment Protection → "Standard Protection" o "Password Protection") como barrera principal — es más fuerte (bloquea a nivel de red, antes de que la request llegue a la app) y no requiere código. La barrera de código de esta fase queda como segunda capa / fallback si Vercel Protection no se activa de inmediato.

## Variables de entorno

Fuente: `.env.example` (17 variables documentadas + 2 nuevas de esta fase) vs. `.env.local` (nombres de variable únicamente, nunca valores) vs. estado en Vercel producción (no verificable — CLI no instalada/autenticada).

| Variable | Uso | Obligatoria en PRD cerrada | Estado local | Riesgo |
|---|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente Supabase (browser + server) | Sí | Configurada | Bajo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase (browser + server) | Sí | Configurada | Bajo |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (server-only) | Sí | Configurada | Alto si se filtrara — nunca prefijo `NEXT_PUBLIC_`, confirmado |
| `NEXT_PUBLIC_SITE_URL` | Link de recuperación de contraseña | Sí | Faltante local (fallback a `VERCEL_URL`/localhost) | Medio — confirmar en Vercel antes del E2E |
| `PUBLIC_APP_URL` | URLs enviadas a Mercado Pago (back_url, webhook) | Sí | Faltante local | Alto — sin esto el checkout no puede construir URLs válidas fuera de dev |
| `MERCADO_PAGO_ACCESS_TOKEN` | Cliente Mercado Pago | Sí (TEST- en esta fase) | Configurada (no verificable si es TEST- o APP_USR- sin leer valor) | Alto — confirmar que es TEST- antes de cualquier prueba |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Validación de firma `x-signature` | Sí | Configurada | Alto si falta o no coincide con el panel de MP |
| `SANDBOX_CHECKOUT_ENABLED` | Habilita checkout público en sandbox (default false → 503) | Sí para probar checkout | Faltante local | Bloqueante para Fase 2 si no se setea |
| `MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS` | Solo dev/túnel local, ignorado si NODE_ENV=production | No en producción | Faltante local | Debe permanecer sin usar en Vercel |
| `MERCADO_PAGO_DETERMINISTIC_CHECKOUT` | Habilita correlación determinística (default false → 503) | Sí para probar checkout | Faltante local | Bloqueante para Fase 2 si no se setea |
| `MEMBERSHIP_GRACE_PERIOD_DAYS` | Días de gracia tras pago rechazado | No (default 5) | Faltante local | Bajo |
| `MEMBERSHIP_ENFORCEMENT_MODE` | off\|audit\|enforce | Sí | Faltante local (default `audit` si se omite) | **Debe permanecer `audit`** — confirmado, no se tocó |
| `RESEND_API_KEY` | Envío real de email | Sí | Configurada | Alto — confirmar que corresponde al dominio verificado |
| `EMAIL_FROM` | Remitente verificado | Sí | Faltante local | Bloqueante — sin esto, `sendTransactionalEmail` lanza error explícito |
| `EMAIL_REPLY_TO` | Reply-To opcional | No | Faltante local | Bajo |
| `EMAIL_ENABLED` | Interruptor maestro de envío real (default false) | Sí para probar Resend | Faltante local | Bloqueante para prueba de Resend si no se setea `true` |
| `TEMP_ACCESS_MODE` *(nueva, esta fase)* | Activa la barrera temporal de acceso | No obligatoria — recomendada mientras dure Fase 1/2 | No configurada (off) | Bajo — reversible |
| `TEMP_ACCESS_ALLOWLIST` *(nueva, esta fase)* | Lista de emails permitidos si `TEMP_ACCESS_MODE=allowlist` | Solo si se activa la anterior | No configurada | Bajo |
| Google OAuth (Client ID/Secret) | Login con Google | Sí | **No es variable de este proyecto** — vive en Supabase Dashboard → Authentication → Providers → Google | No verificable desde este entorno |

**No verificable desde este entorno**: qué valores están realmente cargados en el proyecto de Vercel de producción (CLI no instalada/autenticada, sesión no interactiva). Acción humana: `vercel env ls` (tras `npm i -g vercel` y `vercel login`) o revisar Project → Settings → Environment Variables en el dashboard, y completar como mínimo `PUBLIC_APP_URL`, `SANDBOX_CHECKOUT_ENABLED`, `MERCADO_PAGO_DETERMINISTIC_CHECKOUT`, `EMAIL_FROM`, `EMAIL_ENABLED` antes de la Fase 2 — sin esas cinco, el checkout y el envío real de email no pueden ejecutarse aunque el resto esté listo.

## Google OAuth

Código auditado: `src/app/auth/callback/route.ts`, `src/middleware.ts`, `supabase/migrations/20260716050000_before_user_created_hook.sql`, `docs/AUTH_AND_ROLES.md`.

Confirmado por código:
- **Callback real**: `GET /auth/callback` — intercambia el código OAuth, exige `email_confirmed_at`, verifica `profiles.is_active`, y aplica una **defensa compensatoria**: si la cuenta se creó en los últimos 10s de este mismo login (`isLikelyNewUser`) y no corresponde a una invitación (`activationToken`) ni a una membresía elegible por email, la elimina inmediatamente vía Admin API (`rejectAndCleanUp`) — nunca deja una cuenta huérfana activa.
- **Redirect URL real de la app**: `${PUBLIC_APP_URL o dominio de despliegue}/auth/callback`.
- **Auth Hook `before_user_created_check_membership`**: la función SQL `SECURITY DEFINER` existe en la migración y se confirmó presente en el esquema remoto (RC1). Su **asociación como Auth Hook activo** vive en Supabase Dashboard → Authentication → Hooks, sin API de administración disponible en este entorno (confirmado de nuevo: no existe tabla consultable vía SQL para esto — se intentó `information_schema.tables where table_name ilike '%hook%'` contra el proyecto real, 0 resultados).

**Riesgo central (sin resolver)**: el callback de la app es una defensa compensatoria, no un reemplazo del Auth Hook. Si el Auth Hook no está asociado, la ventana de 10s (`NEW_USER_WINDOW_MS`) es la única barrera real contra un alta gratuita por Google — funciona, pero es más frágil que el hook (depende de que `last_sign_in_at`/`created_at` se resuelvan dentro de esa ventana). No se puede confirmar ni corregir la asociación del hook desde aquí.

### Matriz de casos (derivada del código, no ejecutada en navegador)

| Caso | Resultado esperado | Resultado según código |
|---|---|---|
| Usuario nuevo sin membresía | Sin acceso privado | ✅ `rejectAndCleanUp("/planes?error=membership_required")`, cuenta eliminada |
| Usuario existente sin membresía | Sin acceso privado a áreas premium (pero sí login) | ✅ Login permitido (`return NextResponse.redirect(next)`); el gating real es `requireActiveMembership` en el layout `(premium)`, no el callback |
| Usuario con membresía activa | Acceso permitido | ✅ `getCurrentMembershipForUser` la encuentra, redirige a `next` |
| Usuario con membresía por email sin vincular (elegible) | Se vincula y se permite acceso | ✅ `linkMembershipToUser` automático |
| Usuario inactivo (`is_active=false`) | Acceso denegado | ✅ `signOut()` + redirect a `/login?error=inactive` |
| Platform Owner | Acceso administrativo según reglas reales | ✅ Mismo flujo que cualquier usuario — `is_platform_owner` no otorga bypass de membresía (confirmado en `docs/AUTH_AND_ROLES.md`); el acceso a `/admin` pasa por `requirePlatformOwner()` en cada Server Action, no por el callback |
| Alta con invitación de activación (token en cookie) | Se consume la invitación, requiere email exacto | ✅ `consumeActivationInvitationForOAuthUser`; mismatch → `rejectAndCleanUp` con redirect a reintentar |
| Modo `audit` | Ninguna decisión de membresía bloquea acceso, todo se registra | ✅ El callback no consulta `MEMBERSHIP_ENFORCEMENT_MODE` — el bloqueo real ocurre en middleware/guards premium, que sí lo consultan y en `audit` nunca redirigen |

### Acción humana requerida (marcado explícitamente, no certificado)

1. **Google Cloud Console** → pantalla de consentimiento OAuth configurada (nombre, logo, dominios autorizados), Redirect URI = `https://<proyecto-supabase>.supabase.co/auth/v1/callback`, estado "In production" (o usuarios de prueba agregados si sigue en "Testing").
2. **Supabase → Authentication → Providers → Google** → provider habilitado, Client ID/Secret cargados, Site URL apuntando al dominio real de este despliegue.
3. **Supabase → Authentication → Hooks** → confirmar que `before_user_created_check_membership` está asociado como Auth Hook activo (`before-user-created`). Este es el único punto que certifica el Hallazgo 1 de RC1 como cerrado — sin esto, Google OAuth **no debe declararse certificado**, tal como exige esta fase.
4. **Supabase → Authentication → Settings** → confirmar que el signup público por email está deshabilitado (el alta debe pasar por invitación).

**Google OAuth NO se declara certificado en esta fase** — exactamente como exige el Paso 5: falta la verificación humana de los 4 puntos anteriores.

## Auth Hook

Ver sección anterior — mismo estado: función SQL confirmada, asociación no verificable, no certificado. Riesgo marcado como **bloqueante para Fase 2** (P0 heredado de RC1) hasta confirmación humana.

## Mercado Pago TEST

Código auditado: `src/app/api/memberships/checkout/route.ts`, `src/app/api/webhooks/mercado-pago/route.ts`, `src/lib/payments/providers/mercado-pago.ts`, `src/lib/payments/mercado-pago-signature.ts`, `src/lib/payments/reconciliation.ts`.

- Credenciales: `MERCADO_PAGO_ACCESS_TOKEN`/`MERCADO_PAGO_WEBHOOK_SECRET` están presentes en `.env.local` (solo se verificó el nombre, nunca el valor — no se puede confirmar desde aquí si el access token empieza con `TEST-` o `APP_USR-`). **No se asume que son de sandbox** — acción humana: confirmar visualmente en el propio valor o en el dashboard de Mercado Pago ("Tus integraciones" → credenciales de prueba) antes de la Fase 2.
- `SANDBOX_CHECKOUT_ENABLED` y `MERCADO_PAGO_DETERMINISTIC_CHECKOUT` **no están seteadas localmente** (confirmado, ver tabla de variables) — con ambas en default `false`, `POST /api/memberships/checkout` responde `503` incondicionalmente (`checkout_error.code === "sandbox_checkout_disabled" | "deterministic_checkout_disabled"`). El checkout está efectivamente deshabilitado hoy, lo cual es correcto para esta fase (no se debe poder iniciar un checkout real todavía).
- No se procesó ningún pago real ni de prueba en esta sesión.

### Plan TEST

`membership_plans` tiene **1 fila existente** (confirmado por consulta directa al proyecto real, sin exponer PII):

| Campo | Valor |
|---|---|
| `code` | `sandbox-monthly` |
| `name` | Membresía de prueba |
| `price` / `currency` | 100.00 ARS |
| `billing_interval` | `month` (x1) |
| `provider` | `mercado_pago` |
| `provider_plan_id` | presente (no se imprime el valor) |
| `is_active` | `false` |
| `created_at` | 2026-07-17 |

Este es el plan sandbox anterior mencionado como posible en el Paso 6 del enunciado — **se reutiliza, no se duplica**. No se modificó (`is_active` sigue en `false`): activarlo es una acción de un clic en `/admin/membership-plans` reservada para cuando haya credenciales TEST confirmadas y `SANDBOX_CHECKOUT_ENABLED=true`, para no dejar un plan comprable expuesto durante esta fase de preparación.

### Webhook

- **URL exacta**: `${PUBLIC_APP_URL}/api/webhooks/mercado-pago` (ej. `https://<dominio-de-staging>/api/webhooks/mercado-pago`) — no se puede confirmar el dominio real sin `PUBLIC_APP_URL` configurada en Vercel.
- **Método**: `POST`.
- **Firma**: header `x-signature` (+ `x-request-id`), validada por `isValidMercadoPagoSignature` contra `MERCADO_PAGO_WEBHOOK_SECRET` — cubierta por 8 unit tests (siguen pasando, 116/116).
- **Topics**: `subscription_preapproval` (alta/estado de suscripción) y `subscription_authorized_payment` (cobro recurrente puntual) — únicos dos documentados por Mercado Pago para preapproval, según comentario del propio código.
- **Idempotencia**: por `(provider, provider_event_id)`, vía `payment_provider_events_idempotency_idx` — un evento duplicado responde `{"status":"duplicate"}` sin reprocesar, salvo que haya quedado en un estado no terminal (`received`/`processing`/`failed`), en cuyo caso se reintenta a propósito (evita eventos huérfanos por una falla transitoria nuestra).
- **Respuesta ante evento no asociado**: `unmatched`, nunca se toca ninguna membership — queda disponible para reconciliación manual en `/admin/payments/events`.
- **Respuesta ante firma inválida**: `401`, evento registrado como `ignored` con motivo `invalid_signature`.

Instrucciones exactas para configurar en Mercado Pago ("Tus integraciones" → Webhooks → Configurar notificación): URL de arriba, eventos `subscription_preapproval` y `subscription_authorized_payment`, copiar el secreto generado a `MERCADO_PAGO_WEBHOOK_SECRET` en Vercel (no en este repo).

**Mercado Pago no se declara certificado** — no se confirmó que las credenciales sean de sandbox, y el procedimiento de sandbox de `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md` no se ejecutó (corresponde a Fase 2).

## Resend

Código auditado: `src/lib/email/client.ts`, `src/lib/email/activation-email.ts`, `src/app/api/admin/test-email/route.ts`.

- `RESEND_API_KEY` presente localmente (nombre confirmado, no el valor). `EMAIL_FROM` y `EMAIL_ENABLED` **faltantes localmente** — sin `EMAIL_FROM`, `sendTransactionalEmail` lanza `EmailDeliveryError` explícito antes de intentar la llamada de red; sin `EMAIL_ENABLED=true`, todo envío se omite intencionalmente (`EmailDisabledError`, registrado como `send_skipped`, nunca una falla silenciosa).
- No se encontró remitente placeholder hardcodeado en el código de producción — el único `from` de ejemplo con dominio `proposalstudio.com` aparece exclusivamente en un archivo de test (`resend-request-body.test.ts`), no en código ejecutado en runtime.
- **Existe** una función administrativa segura de email de prueba: `/admin/settings` → sección Resend → botón de correo de prueba, respaldado por `POST /api/admin/test-email`, protegido por `requirePlatformOwner()`, con confirmación explícita antes de enviar.

**No se ejecutó el envío de prueba en esta sesión** — requiere `EMAIL_FROM`/`EMAIL_ENABLED=true` configurados (no lo están localmente) y autorización explícita del propietario para disparar un envío real, aunque sea de bajo riesgo (un único destinatario). Queda como acción humana:

1. Confirmar en Resend que el dominio remitente de `EMAIL_FROM` está **VERIFIED** (no "Checking DNS").
2. Setear `EMAIL_FROM` y `EMAIL_ENABLED=true` en el entorno de staging.
3. Ir a `/admin/settings` como Platform Owner → enviar correo de prueba hacia `max@didactia.ar` (o el email del propietario) → confirmar:
   - la llamada fue aceptada por Resend (HTTP 200 del propio backend, visible en `/admin/audit` como evento `settings.test_email` o similar),
   - el correo **llegó realmente** (bandeja de entrada, no solo la aceptación de la API),
   - no cayó en spam,
   - el enlace/formato del correo es legible.
4. Un HTTP 200 del endpoint interno **no es suficiente** para declarar éxito — el paso 3 exige confirmación visual de entrega real, tal como exige esta fase.

## Plan QA

Ver "Plan TEST" arriba: `sandbox-monthly` existe, `is_active=false`, listo para reutilizar. No se activó en esta fase (requiere credenciales TEST confirmadas primero).

## Rate limiting

Código auditado: `src/lib/utils/rate-limit.ts` (`InMemoryRateLimitStore`, ya interfaz-abstraída como `RateLimitStore`) y sus 8 call sites reales.

| Endpoint | Límite | Clasificación |
|---|---|---|
| `POST /api/webhooks/mercado-pago` | 120/min por IP | Antiabuso — la protección real es la firma, esto solo frena flood evidente |
| `POST /api/memberships/checkout` | 10/min por IP | Seguridad crítica — endpoint público sin sesión que inicia un flujo de pago |
| `requestActivationAction` | 5/15min por IP + 3/15min por email | Antiabuso — evita spamear invitaciones/emails |
| `signInAction` | 20/15min por IP + 10/15min por email | **Seguridad crítica** — único freno a fuerza bruta de login |
| `requestPasswordResetAction` | 10/15min por IP + 3/15min por email | Seguridad crítica — evita enumeración/spam de recuperación |
| `updatePasswordAction` | 10/15min por IP | UX/antiabuso |
| Rutas admin (`sync`, `migrate-existing-users`, exports, etc.) | Variable | Prescindible como rate limit puntual — ya protegidas por `requirePlatformOwner()`, un solo actor autorizado |

**Confirmado (RC1, sigue vigente)**: `Map` en memoria de proceso — cada instancia serverless de Vercel tiene su propio store, así que el límite nominal es multiplicado por el número de instancias concurrentes en producción real. No hay bypass activo hoy porque **no hay tráfico público real** (acceso ya restringido operativamente) — no es un bypass explotado, es una barrera más débil de lo que su número sugiere.

**No se migró la implementación en esta fase** — no hay bypass crítico comprobado hoy (el gate real de `signIn`/`checkout` sigue siendo `requireActiveUser`/validación de firma, no el rate limiter), así que no aplica la excepción de "adaptación mínima solo si existe un bypass crítico comprobado".

**Arquitectura recomendada para producción** (documentado, no implementado):
- Reemplazar `InMemoryRateLimitStore` por una implementación de `RateLimitStore` (interfaz ya lista, sin cambios en los 8 call sites) respaldada por **Upstash Redis** (marketplace de Vercel, `@upstash/ratelimit` + `@upstash/redis`) — es la opción de menor fricción dado que el proyecto ya está en Vercel.
- Variables nuevas necesarias: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (provistas automáticamente si se instala la integración desde el Marketplace de Vercel).
- Archivo afectado: únicamente `src/lib/utils/rate-limit.ts` (la abstracción `RateLimitStore` ya existe para este swap exacto).

**Bloqueante**: **para apertura pública** (P1), no para el E2E cerrado de la Fase 2 con acceso ya restringido por la barrera de la sección anterior y un volumen de tráfico controlado por el propio equipo.

## Mobile

Hallazgo H-01 (`docs/ADMIN_QA_REPORT.md`, `docs/PROJECT_STATUS.md` Etapa 6): `AppShell`/`Sidebar` compartido sin drawer/hamburger, contenido ilegible a 390px en las 13 rutas de `/admin/**` y, por ser el mismo componente, en toda la app autenticada.

Clasificación requerida por esta fase — **decisión pendiente, no se cierra sin evidencia**:

- **Opción A** (corregir antes del E2E): aplica si el E2E de la Fase 2 necesita probarse en mobile real (asesores usando el producto desde el celular es un caso de uso plausible para un producto de venta en campo).
- **Opción B** (desktop-first declarado, bloquear solo el release mobile): aplica si el E2E de la Fase 2 se ejecuta enteramente en desktop y el mobile queda fuera del alcance del lanzamiento cerrado inicial.

**No se implementó ningún fix** en esta fase (fuera de alcance — "no rediseñar"). Queda registrada como decisión pendiente del propietario antes de la Fase 2; el flujo funciona íntegramente en desktop (1440×900, confirmado en Etapa 6).

## Reproducibilidad

- **Docker Desktop**: confirmado no disponible de nuevo en esta sesión — `docker --version` → `command not found`. Sin cambios respecto a la Etapa 8/RC1.
- **Supabase CLI**: **sí disponible** en este entorno (`supabase --version` → `2.102.0`, no estaba confirmado en RC1). Dato nuevo.
- **`supabase/config.toml`**: sigue sin existir. Aun con la CLI disponible, `supabase start`/`db reset` requieren Docker Desktop corriendo como motor de contenedores — la CLI por sí sola no alcanza. **Sigue sin poder ejecutarse `supabase db reset` en este entorno.**
- No se creó `supabase/config.toml` en esta fase (implica decisiones de configuración — puertos, versión de Postgres del stack local — fuera del alcance de "no rediseñar"; mismo criterio que Etapa 8).

**Acción humana**: instalar Docker Desktop, luego `supabase init` (o restaurar `config.toml` si el equipo ya tiene uno fuera del repo) y correr `supabase db reset` para certificar empíricamente lo que hoy es solo un análisis objeto-por-objeto (`docs/SCHEMA_DRIFT_REPORT.md`).

## Convención de datos QA

Convención obligatoria para toda prueba de la Fase 2:

```text
qa+<caso>@<dominio-controlado>     (ej. qa+checkout-ok@proposalstudio.test)
TEST - <nombre del cliente>        (clients.full_name)
TEST - <nombre de propuesta>       (proposals.title)
QA - <identificador>               (uso libre en notas/internal_notes)
```

### Localización posterior (confirmado contra el esquema real)

| Entidad | Tabla/columna | Localizable por convención |
|---|---|---|
| Usuarios QA | `auth.users.email` / `profiles` (vía join) | ✅ `email ILIKE 'qa+%'` |
| Clientes QA | `clients.full_name`, `clients.email` | ✅ `full_name ILIKE 'TEST - %'` |
| Propuestas QA | `proposals.title` (vía `client_id` → `clients`) | ✅ `title ILIKE 'TEST - %'` o por cliente QA |
| Membresías QA | `memberships.email` | ✅ `email ILIKE 'qa+%'` |
| Intentos de checkout QA | `membership_checkout_attempts` | ⚠️ Indirecto — la tabla no tiene columna de email propia (confirmado, `docs/PROJECT_STATUS.md` Lote B); se localiza vía `membership_id` → `memberships.email` |
| Eventos de pago QA | `payment_provider_events` | ⚠️ Sin relación directa a membership (`Relationships: []`, confirmado en Lote B) — solo correlacionable indirectamente vía el proveedor real, igual que hace la reconciliación manual |

No se agregó ninguna columna nueva para esto (cumple la restricción explícita del Paso 4) — la convención de naming es suficiente para todas las entidades con columna de texto libre, y las dos excepciones (`checkout_attempts`, `payment_provider_events`) ya eran conocidas como no correlacionables directamente incluso para uso normal (Lote B).

### Procedimiento de limpieza segura (documentado, no ejecutado)

1. Confirmar entorno: nunca correr contra producción real si en algún punto deja de ser un entorno cerrado de pruebas.
2. Orden de borrado (respeta FKs): `proposal_versions`/`proposal_events` de propuestas QA → `proposals` QA → `clients` QA → `account_activation_invitations` de emails QA → `membership_checkout_attempts` de memberships QA (vía join) → `memberships` QA → usuarios `auth.users` QA (vía Admin API, nunca `DELETE` directo en `auth.users`) → `profiles` asociados (se limpian solos vía `ON DELETE CASCADE` del trigger, si existe — confirmar antes de asumirlo).
3. Nunca usar `DELETE` sobre `payment_provider_events` (es un log de auditoría de webhooks, no un dato transaccional de negocio) — dejar los eventos QA como están, ya quedan implícitamente identificables por estar fuera del rango de fechas de producción real.
4. Cada borrado manual fuera de una función administrativa existente debe registrarse en `admin_audit_events` si se hizo desde el panel, o documentarse aparte si fue SQL directo (mismo criterio que "Membresía duplicada" en `docs/MEMBERSHIP_INCIDENT_RESPONSE.md`).

**No se ejecutó ninguna limpieza masiva en esta fase** (cumple el Paso 4 explícitamente).

## Cambios realizados (código)

| Archivo | Cambio |
|---|---|
| `src/middleware.ts` | Bloque nuevo: barrera temporal de acceso por allowlist, controlada por `TEMP_ACCESS_MODE`/`TEMP_ACCESS_ALLOWLIST`, off por defecto |
| `src/app/login/page.tsx` | Mensaje nuevo para `error=restricted_access` |
| `.env.example` | Documentadas `TEMP_ACCESS_MODE`/`TEMP_ACCESS_ALLOWLIST` |
| `docs/GO_LIVE_PHASE_1_REPORT.md` | Este documento (nuevo) |
| `docs/PROJECT_STATUS.md` | Sección nueva agregada (ver abajo) |
| `docs/RC1_RELEASE_REPORT.md` | Sección nueva agregada al final, sin alterar la conclusión original |

Sin migraciones nuevas, sin cambios de RLS, sin datos de producción tocados, sin commit, sin push, sin deploy.

## Validaciones

```
npx tsc --noEmit   → sin errores
npm run lint       → sin errores ni warnings (eslint .)
npm test           → 116/116 pasando
npm run build      → compila, 42 rutas generadas (incluye /api/memberships/checkout, /api/webhooks/mercado-pago, /auth/callback)
```

## Acciones humanas requeridas (bloqueantes para Fase 2)

1. Activar **Vercel Deployment Protection** (o confirmar explícitamente que se prefiere solo la barrera de código de esta fase).
2. Confirmar en Vercel producción/staging el valor real de las variables marcadas "no verificable" arriba — como mínimo `PUBLIC_APP_URL`, `SANDBOX_CHECKOUT_ENABLED`, `MERCADO_PAGO_DETERMINISTIC_CHECKOUT`, `EMAIL_FROM`, `EMAIL_ENABLED`.
3. Confirmar en Supabase Dashboard → Authentication → Hooks que `before_user_created_check_membership` está asociado como Auth Hook activo (P0, hereda de RC1).
4. Completar la configuración de Google Cloud Console + Supabase Auth Providers (4 puntos listados en "Google OAuth").
5. Confirmar que `MERCADO_PAGO_ACCESS_TOKEN` es realmente `TEST-` (sandbox), no productivo.
6. Configurar el webhook en el panel de Mercado Pago con la URL/topics documentados arriba.
7. Verificar dominio remitente en Resend como VERIFIED, luego ejecutar el correo de prueba real hacia el propietario (ver "Resend").
8. Decidir Opción A/B para mobile (ver "Mobile") antes de planificar el alcance exacto del E2E.
9. Instalar Docker Desktop y correr `supabase db reset` para certificar reproducibilidad (P1, hereda de RC1/Etapa 8).
10. Decidir si activar `sandbox-monthly` (o crear un plan QA nuevo) una vez confirmados los puntos 2 y 5.

## Riesgos para Fase 2

- El Auth Hook sin confirmar sigue siendo el riesgo más alto: si la Fase 2 ejecuta un alta real por Google sin haber confirmado el punto 3 de arriba, existe la posibilidad (ya mitigada parcialmente por la ventana de 10s del callback, no eliminada) de un alta que evada el control de membresía.
- Sin `PUBLIC_APP_URL`/`SANDBOX_CHECKOUT_ENABLED`/`MERCADO_PAGO_DETERMINISTIC_CHECKOUT` confirmadas en el entorno real, el checkout seguirá respondiendo `503` — la Fase 2 no puede empezar el procedimiento de sandbox de `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md` sin esto.
- El rate limiter en memoria sigue siendo más débil de lo nominal bajo múltiples instancias — irrelevante mientras el acceso siga restringido (esta fase), pero debe resolverse antes de cualquier apertura pública.
- La decisión de mobile pendiente puede bloquear parte del alcance del E2E si se elige Opción A tardíamente.

## Confirmaciones de cierre

- `MEMBERSHIP_ENFORCEMENT_MODE`: sigue en `audit` (no se tocó ninguna variable de entorno del proyecto real).
- No hubo pagos reales, no hubo migraciones remotas destructivas, no hubo `git commit`, no hubo `git push`, no hubo deploy.
- No se abrió acceso público — la barrera temporal queda lista pero **no está activada** (requiere que el propietario setee `TEMP_ACCESS_MODE=allowlist` explícitamente).

### Conclusión

```text
FASE 1 INCOMPLETA — BLOQUEANTES OPERATIVOS PENDIENTES
```

Bloqueantes reales, en orden: confirmación humana del Auth Hook de Google, confirmación de credenciales TEST de Mercado Pago y variables de entorno de checkout en el entorno real, verificación del dominio de Resend + envío de prueba real, y decisión de producto sobre mobile. Ninguno es un bug de código — todos son, como en RC1, pasos operativos que requieren acceso a dashboards externos o una decisión del propietario del producto.
