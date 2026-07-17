# Respuesta a incidentes — Membresías

## Rollback inmediato de enforcement

Si algo se rompe en producción con `enforce` activo:

```
MEMBERSHIP_ENFORCEMENT_MODE=audit
```

Redeploy. Esto vuelve a modo "loguear pero no bloquear" sin tocar ningún dato. `audit` nunca bloquea acceso — es seguro como estado de emergencia permanente si hace falta tiempo para investigar.

## Webhook caído

**Síntoma**: pagos confirmados en Mercado Pago no reflejan `active` en `memberships`.

1. `/admin/memberships/health` → revisar "Eventos de pago fallidos".
2. Exportar CSV de eventos fallidos (`/api/admin/exports/failed-events`) para ver `event_type`/`error_message` (sanitizado, sin payload crudo).
3. Ir a la membresía afectada → "Reconciliar con Mercado Pago" (resync) para forzar la consulta directa al proveedor sin depender del webhook.
4. Si el problema es sistémico (todos los webhooks fallando), revisar logs del servicio en el proveedor de hosting y `get_logs` de Supabase (Edge/API) si aplica.

## Firma de webhook inválida

**Síntoma**: `payment_provider_events.signature_valid = false` en volumen.

1. Confirmar que `MERCADO_PAGO_WEBHOOK_SECRET` en el entorno coincide exactamente con el configurado en el panel de Mercado Pago (rotación de secreto sin actualizar la variable es la causa más común).
2. Mientras se corrige, **no** activar `MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS=true` en producción salvo emergencia documentada y reversión inmediata después.
3. Reconciliar manualmente las membresías afectadas vía resync una vez corregido el secreto.

## Membresía duplicada

**Síntoma**: dos membresías vigentes para el mismo usuario o email (no debería poder pasar — hay índices únicos parciales que lo bloquean a nivel de base).

1. Si ocurrió, es señal de un `INSERT` que bypaseó `create_membership` (investigar cómo). Nunca usar `DELETE` para corregir — usar `transition_membership_status` para llevar la duplicada incorrecta a `canceled` con `reason` explicando el error, dejando rastro en `membership_status_history`.
2. Registrar el incidente en `admin_audit_events` si la corrección se hizo manualmente fuera del panel.

## Usuario sin perfil (`profiles` faltante tras `auth.users`)

**Síntoma**: `/admin/memberships/health` → "Usuarios OAuth huérfanos" > 0.

1. Confirmar si es transitorio (trigger `handle_new_user` corriendo con delay) o permanente.
2. Si es permanente, es un bug del trigger — revisar `supabase/migrations/*_profiles.sql` y los logs de Auth (`get_logs` servicio `auth`).
3. No crear el perfil manualmente sin entender la causa — puede repetirse.

## Pago sin activación

**Síntoma**: `payment_provider_events` muestra un pago `processed` pero la membresía sigue `authorized`/`pending`.

1. Ir a la membresía → resync.
2. Si el resync no corrige, revisar `resolveTargetStatus` (`src/lib/payments/target-status.ts`) — puede ser un estado de Mercado Pago no mapeado (`unknown`), que nunca inventa una transición a propósito.

## Invitación fallida (email no llega)

1. `/admin/settings` → confirmar que `RESEND_API_KEY`/`EMAIL_FROM` están presentes.
2. Enviar un correo de prueba desde `/admin/settings`.
3. Si el envío de prueba también falla, el problema es de configuración/proveedor, no del flujo de invitación — revisar la respuesta de error (nunca expone el secreto).
4. Reenviar la invitación desde la ficha de la membresía una vez resuelto.

## Usuario OAuth huérfano (Google)

**Síntoma**: usuario se autentica con Google pero no tiene membresía vinculada aunque haya pagado.

1. Verificar que el email de Google coincide **exactamente** con el de la membresía (`consumeActivationInvitationForOAuthUser` exige coincidencia exacta, sin normalización adicional más allá de minúsculas).
2. Si el email no coincide (ej. alias de Google Workspace), vincular manualmente desde la ficha de la membresía → "Vincular a usuario existente" (también valida coincidencia exacta de email — si no coincide, corregir el email de la membresía primero, dejando auditoría del cambio).

## Enforcement incorrecto (bloqueando a quien no debería)

1. Rollback inmediato a `audit` (ver arriba).
2. Revisar la membresía específica en `/admin/memberships/[id]` → columna "Acceso" muestra la razón exacta (`access.reason`).
3. Common causes: `current_period_end` nulo en una membresía `active` (inconsistencia — ver centro de salud), o migración de usuario con fecha de vencimiento ya pasada por error de carga.

## Rollback a audit — checklist rápido

1. Cambiar `MEMBERSHIP_ENFORCEMENT_MODE=audit` y redeploy.
2. Confirmar en logs que las decisiones "hubieran bloqueado" quedan registradas (`logMembershipAuditEvent`) para diagnóstico sin afectar usuarios.
3. Resolver la causa raíz usando `/admin/memberships/health`.
4. No volver a `enforce` sin repetir el checklist completo de `docs/MEMBERSHIP_PRODUCTION_CHECKLIST.md`.
