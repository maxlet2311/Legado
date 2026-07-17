# Operaciones de membresías (Etapa 6)

Guía operativa para el Platform Owner. Toda acción administrativa pasa por `requirePlatformOwner()` y queda auditada en `admin_audit_events` (ver `src/lib/admin/audit.ts`).

## Rutas del panel

| Ruta | Qué hace |
|---|---|
| `/admin/memberships` | Listado paginado con filtros (estado, plan, proveedor, vinculación) y búsqueda (email, nombre, ID de suscripción). |
| `/admin/memberships/[id]` | Ficha completa: datos, historial de estados, eventos de proveedor, invitaciones. Acciones administrativas. |
| `/admin/membership-plans` | CRUD de planes (crear, editar, activar/desactivar — nunca borrar). |
| `/admin/memberships/health` | Centro de salud con métricas agregadas y export CSV. |
| `/admin/memberships/migrate-users` | Migración controlada de usuarios existentes (dry-run + ejecución). |
| `/admin/settings` | Presencia de variables de entorno (Resend, Mercado Pago) + correo de prueba. |

## Crear un plan

1. `/admin/membership-plans` → "Nuevo plan".
2. Completar código (único, minúsculas), nombre, precio, moneda, frecuencia.
3. Si el plan es contratable online, completar `provider` (`mercado_pago`) y `provider_plan_id` juntos — un plan activo sin ambos campos se muestra en `/planes` pero marcado como no disponible para checkout (comportamiento ya existente, ver `src/app/planes/page.tsx`).
4. Guardar. Auditoría: `membership_plan.create`.

**Nunca se borra un plan** (bloqueado además por la FK `memberships.plan_id`). Para retirarlo del catálogo, desactivarlo. Cambiar el precio de un plan **no** modifica retroactivamente el precio percibido de membresías ya creadas — el esquema actual no guarda un snapshot histórico de precio por membresía (limitación conocida, documentada, no resuelta en esta etapa).

## Asociar un plan a Mercado Pago

Completar `provider_plan_id` con el ID real del plan de preapproval creado en Mercado Pago (sandbox o producción). Ver sección "Mercado Pago" del checklist de producción para el procedimiento completo, incluida la incertidumbre resuelta sobre `preapproval_plan_id` + `init_point`.

## Crear una membresía manual

No hay UI para "crear membresía desde cero" en esta etapa (ya existía `POST /api/admin/memberships` desde la Etapa 3, sigue vigente, invocable con la cookie de sesión del Platform Owner). Para dar de alta usuarios en lote, usar la migración de usuarios existentes.

## Activar (reenviar invitación)

Desde la ficha de la membresía → "Reenviar invitación de activación". Solo disponible si la membresía **no tiene usuario vinculado** y está en `authorized` o `active`. Revoca cualquier invitación pendiente previa, emite una nueva y envía el email — nunca muestra el token.

## Suspender

Ficha → "Suspender". Motivo obligatorio. Transiciona a `suspended` (válido desde `active`/`past_due`/`grace_period`). **No modifica `profiles.is_active`** — el usuario sigue pudiendo loguearse, solo pierde acceso a áreas premium.

## Reactivar

Ficha → "Reactivar". Si la membresía tiene proveedor externo asociado, se consulta el estado real en Mercado Pago antes de reactivar; si el proveedor reporta un estado incompatible, hace falta marcar "Override manual" con motivo explícito.

## Cancelar

Ficha → "Cancelar". Dos modos:
- **Manual (sin proveedor)**: transiciona directo a `canceled`. Para membresías sin proveedor o cancelaciones puramente administrativas.
- **Cancelar en Mercado Pago**: cancela primero la suscripción en el proveedor, confirma que el estado remoto sea `canceled`, y recién entonces transiciona localmente.

## Vincular usuario

Ficha → "Vincular a usuario existente". Solo si la membresía no tiene usuario vinculado. Busca automáticamente el usuario de Supabase Auth cuyo email coincide **exactamente** con `memberships.email` — nunca acepta un `user_id` provisto desde el formulario.

## Sincronizar (resync)

Ficha → "Reconciliar con Mercado Pago". Reconsulta el estado real de la suscripción y aplica la transición correspondiente vía `applyNormalizedSubscriptionEvent` (mismo servicio que usa el webhook).

## Migrar usuarios existentes

`/admin/memberships/migrate-users`:
1. Elegir plan y fecha de vencimiento (obligatoria, siempre futura — nunca acceso indefinido).
2. Elegir selección: todos los perfiles activos sin membresía (excluye Platform Owners) o una lista de emails.
3. **Dry-run primero** — siempre. Revisar elegibles/omitidos.
4. Ejecutar solo si el dry-run se ve correcto. Idempotente: usuarios que ya tienen cualquier membresía se saltean.

Nunca crea pagos ficticios ni IDs de Mercado Pago. Estado resultante siempre `authorized`, `source = "migration"`.

## Exportaciones CSV

Desde `/admin/memberships` (membresías, historial, eventos fallidos) y `/admin/memberships/health` (reporte de salud). Todas server-side, con timestamp UTC en la primera línea, sin tokens/hashes/payloads completos — IDs de proveedor enmascarados (últimos 4 caracteres).

## Correo de prueba

`/admin/settings` → sección Resend. Requiere `RESEND_API_KEY` y `EMAIL_FROM` configurados. Envía un correo real — pide confirmación explícita antes de enviar.
