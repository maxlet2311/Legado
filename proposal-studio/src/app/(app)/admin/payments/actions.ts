"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { logServerError } from "@/lib/utils/errors";
import { reconcileMercadoPagoPreapproval } from "@/lib/payments/reconciliation";
import { cleanupExpiredCheckoutAttempts } from "@/lib/payments/checkout-attempts-cleanup";
import { PaymentProviderError } from "@/lib/payments";

/**
 * Defensa en profundidad, mismo criterio que `admin-actions.ts` de
 * membresías/invitaciones: el layout de `/admin` ya exige
 * `requirePlatformOwner()`, pero cada Server Action lo vuelve a chequear.
 */
async function requirePlatformOwnerOrError(): Promise<
  { profile: Awaited<ReturnType<typeof requirePlatformOwner>> } | { error: string }
> {
  try {
    const profile = await requirePlatformOwner();
    return { profile };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Requiere ser el propietario de la plataforma." };
    }
    throw error;
  }
}

function revalidatePayments() {
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/events");
  revalidatePath("/admin/payments/checkouts");
}

interface ReconcileActionResult {
  error?: string;
  matched?: boolean;
  reason?: string;
  applied?: boolean;
  skipReason?: string | null;
  status?: string;
}

const preapprovalIdSchema = z.string().trim().min(1, "Ingresá el id de la suscripción.");

/**
 * Reconciliación administrativa manual de UNA suscripción real de Mercado
 * Pago (nunca masiva — el endpoint real `POST
 * /api/admin/payments/mercado-pago/reconcile` tampoco lo es, ver
 * `src/lib/payments/reconciliation.ts`). Reutiliza directamente
 * `reconcileMercadoPagoPreapproval` (mismo servicio que llama esa ruta y el
 * propio webhook) en vez de hacer un `fetch` interno — mismo criterio que
 * `resyncMembershipAction` para membresías. No hay modo de prueba/dry-run:
 * esta llamada consulta el proveedor real y puede aplicar una transición de
 * estado real sobre una membresía. La ruta API queda intacta como caller
 * alternativo (ej. scripts), documentada como redundante.
 */
async function reconcileSubscriptionAction(
  _prevState: ReconcileActionResult,
  formData: FormData,
): Promise<ReconcileActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const parsed = preapprovalIdSchema.safeParse(formData.get("preapprovalId"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Id de suscripción inválido." };
  }

  if (!checkRateLimit(`admin:payments:reconcile:${profile.id}`, 30, 60_000)) {
    return { error: "Demasiadas reconciliaciones. Esperá unos minutos." };
  }

  try {
    const outcome = await reconcileMercadoPagoPreapproval(parsed.data, {
      source: "admin",
      actorUserId: profile.id,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "payments.reconcile_subscription",
      entityType: "membership_checkout_attempt",
      metadata: outcome.matched
        ? { matched: true, applied: outcome.applied, skipReason: outcome.skipReason ?? null, status: outcome.membership.status }
        : { matched: false, reason: outcome.reason },
    });

    revalidatePayments();

    if (!outcome.matched) {
      return { matched: false, reason: outcome.reason };
    }

    return {
      matched: true,
      applied: outcome.applied,
      skipReason: outcome.skipReason ?? null,
      status: outcome.membership.status,
    };
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      return { error: "No se pudo consultar la suscripción con el proveedor de pagos." };
    }
    logServerError("reconcileSubscriptionAction", error);
    return { error: "No se pudo reconciliar la suscripción." };
  }
}

interface CleanupActionResult {
  error?: string;
  success?: boolean;
  expiredCount?: number;
}

/**
 * Expira localmente los checkout attempts abandonados. Nunca destructivo
 * (solo cambia `status` a `expired`, ver `checkout-attempts-cleanup.ts`) y
 * nunca llama al proveedor externo. Reutiliza el mismo servicio que
 * `POST /api/admin/payments/mercado-pago/cleanup` en vez de hacer un `fetch`
 * interno.
 */
async function cleanupExpiredCheckoutAttemptsAction(): Promise<CleanupActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  if (!checkRateLimit(`admin:payments:cleanup:${profile.id}`, 10, 60_000)) {
    return { error: "Demasiadas solicitudes. Esperá unos minutos." };
  }

  try {
    const result = await cleanupExpiredCheckoutAttempts();

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "payments.cleanup_expired_checkouts",
      entityType: "membership_checkout_attempt",
      metadata: { expiredCount: result.expiredCount },
    });

    revalidatePayments();
    return { success: true, expiredCount: result.expiredCount };
  } catch (error) {
    logServerError("cleanupExpiredCheckoutAttemptsAction", error);
    return { error: "No se pudo ejecutar la limpieza." };
  }
}

export { reconcileSubscriptionAction, cleanupExpiredCheckoutAttemptsAction };
