# Checklist de producción — activar `MEMBERSHIP_ENFORCEMENT_MODE=enforce`

Estado al cierre de la Etapa 6 (fecha de este documento: ver historial de git). No cambiar a `enforce` sin completar todo lo de abajo.

## 1. Esquema remoto — ✅ hecho

- 5 tablas, 5 funciones (`SECURITY DEFINER`, `search_path` fijo, grants mínimos), RLS y `admin_audit_events` verificados contra el proyecto Supabase real (`btgopvaztnttahyjejav`).
- Suite de pruebas SQL con `ROLLBACK` ejecutada contra el esquema real: 11/11 OK (`supabase/tests/rls_isolation.sql`).

## 2. Tipos TypeScript — ✅ hecho

- Regenerados desde el esquema remoto. `npx tsc --noEmit` limpio.

## 3. Planes — ⏳ pendiente de configuración

- Crear los planes comerciales reales en `/admin/membership-plans`.
- Ninguno creado todavía (proyecto recién migrado, 0 planes en producción).

## 4. Mercado Pago — ⏳ pendiente de credenciales

- Asociar `provider_plan_id` de cada plan con el `preapproval_plan_id` real creado en Mercado Pago.
- Configurar `MERCADO_PAGO_ACCESS_TOKEN` y `MERCADO_PAGO_WEBHOOK_SECRET`.
- Ejecutar el procedimiento de sandbox (`docs/MEMBERSHIP_OPERATIONS.md` no lo cubre — ver más abajo, sección "Procedimiento de sandbox reproducible").
- **No hay credenciales de sandbox disponibles en este entorno** — no se ejecutó ninguna prueba real contra Mercado Pago en esta etapa.

## 5. Resend — ⏳ pendiente de verificación real

- Variables `RESEND_API_KEY`/`EMAIL_FROM`/`NEXT_PUBLIC_SITE_URL`: verificar presencia en `/admin/settings`.
- Enviar un correo de prueba real desde `/admin/settings` antes de depender del flujo de activación en producción.

## 6. Google OAuth — ⏳ pendiente de verificación manual

No verificable desde las herramientas disponibles en este entorno (configuración de proveedores vive en el dashboard de Supabase, sin API expuesta acá). Confirmar manualmente:

**Supabase → Authentication → Providers → Google**
- [ ] Provider habilitado.
- [ ] Client ID configurado.
- [ ] Client Secret configurado.
- [ ] Site URL apunta al dominio de producción.
- [ ] Redirect URLs incluye `https://<proyecto>.supabase.co/auth/v1/callback` y el dominio propio si aplica.

**Supabase → Authentication → Hooks**
- [ ] `before_user_created_check_membership` asociado como Auth Hook activo (la función SQL existe y está confirmada en el esquema — falta confirmar la asociación).

**Supabase → Authentication → Settings**
- [ ] Signup público por email deshabilitado (el alta debe pasar siempre por invitación de activación).

**Google Cloud Console**
- [ ] Pantalla de consentimiento OAuth configurada (nombre, logo, dominios autorizados).
- [ ] Redirect URI oficial de Supabase agregado.
- [ ] Estado de publicación: "In production" (no "Testing", salvo que el volumen de usuarios lo permita).
- [ ] Usuarios de prueba agregados si sigue en "Testing".

## 7. Auth Hook — ⏳ ver punto 6

## 8. Signup libre — ⏳ ver punto 6

## 9. Auditoría — ✅ hecho

- `admin_audit_events` creada y aplicada (migración `20260717010000_admin_audit_events.sql`). RLS deny-by-default, solo `service_role`. Todas las acciones administrativas nuevas (suspender/reactivar/cancelar/vincular/reenviar/resync/planes/migración/test-email) registran evento.

## 10. Pruebas — ⚠️ parcial

- **SQL**: 11/11 OK contra el esquema remoto real (sección 1).
- **TypeScript**: `npx tsc --noEmit` limpio.
- **Lint**: `npx eslint` limpio sobre todo el código nuevo de esta etapa.
- **Unit tests**: `npm test` → 56/56 OK (incluye `access.test.ts`, `config.test.ts`, `error-mapper.test.ts`, `guard-errors.test.ts`, pagos).
- **Build**: `npm run build` completo sin errores, incluidas las 6 rutas nuevas de `/admin`.
- **E2E (Playwright)**: se agregó `e2e/admin-memberships.spec.ts` (autorización de `/admin/**`, acceso del Platform Owner, gate de `MEMBERSHIP_ENFORCEMENT_MODE=enforce`). **No se ejecutó en esta sesión**: requiere un servidor corriendo y usuarios de prueba reales (`E2E_PLATFORM_OWNER_*`, `E2E_REGULAR_USER_*`) que no existen en este entorno — no se crearon usuarios reales sin autorización explícita. Ejecutar antes de aprobar el corte a `enforce`.
- **Smoke manual**: se verificó con el servidor de producción local (`npm run build && npm run start`) que `/admin/memberships` sin sesión redirige correctamente a `/login?redirectTo=...` (middleware). No se pudo hacer un recorrido completo autenticado como Platform Owner por falta de credenciales de sesión en este entorno.

## 11. Deploy en `audit` — pendiente (acción del usuario)

## 12. Revisar logs — pendiente (acción del usuario, tras deploy)

## 13. Resolver inconsistencias — usar `/admin/memberships/health`

## 14. E2E completo — pendiente (ver punto 10)

## 15. Aprobar corte — pendiente (decisión del usuario)

## 16. Cambiar a `enforce`

```
MEMBERSHIP_ENFORCEMENT_MODE=enforce
```

Rollback inmediato si algo falla:

```
MEMBERSHIP_ENFORCEMENT_MODE=audit
```

---

## Procedimiento de sandbox de Mercado Pago (reproducible, sin ejecutar todavía)

Cuando haya credenciales de prueba (`MERCADO_PAGO_ACCESS_TOKEN` de test):

1. Crear un `preapproval_plan` de prueba vía API de Mercado Pago (o dashboard sandbox) → guardar `preapproval_plan_id`.
2. Cargar ese `preapproval_plan_id` como `provider_plan_id` de un plan en `/admin/membership-plans` con `provider = mercado_pago`.
3. Ir a `/planes`, contratar el plan de prueba con una cuenta de comprador de test de Mercado Pago → confirmar que `init_point` redirige correctamente.
4. Completar el pago de prueba → confirmar que el webhook (`/api/webhooks/mercado-pago`) recibe la notificación, valida la firma real (`isValidMercadoPagoSignature`, ya cubierto por unit tests), y activa la membresía.
5. Verificar en `/admin/memberships/[id]` que el evento de proveedor quedó registrado y el estado pasó a `active`.
6. Cancelar la suscripción de prueba desde `/admin/memberships/[id]` (modo "Cancelar en Mercado Pago`) → confirmar que el webhook o el resync reflejan `canceled`.
7. Provocar una notificación duplicada (reenviar el mismo webhook) → confirmar que `payment_provider_events_idempotency_idx` evita procesarla dos veces.
8. Confirmar que `external_reference` en el pago de prueba corresponde al `id` de la membresía local (`buildMembershipExternalReference`/`parseMembershipExternalReference`).

No ejecutar este procedimiento con credenciales productivas ni generar cobros reales.
