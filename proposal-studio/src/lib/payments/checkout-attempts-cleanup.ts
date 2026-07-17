import "server-only";

import { expireStaleCheckoutAttempts } from "@/lib/payments/checkout-attempts-repository";
import { logServerError } from "@/lib/utils/errors";

interface CleanupResult {
  expiredCount: number;
}

/**
 * Expira localmente los checkout attempts abiertos (`creating`/`ready`/
 * `redirected`) cuyo `expires_at` ya pasó (Paso 2.1, sección 9). Nunca
 * intenta desactivar el `preapproval_plan` exclusivo del lado de Mercado
 * Pago: la validación de viabilidad (sección 1) no encontró un mecanismo
 * oficial documentado para archivar/eliminar un plan — solo `reason`,
 * `auto_recurring`, `payment_methods_allowed` y `back_url` son actualizables
 * vía `PUT /preapproval_plan/{id}`. El plan externo queda simplemente sin
 * uso; no se borra evidencia local (el attempt expirado se conserva para
 * auditoría). Invocable desde una acción administrativa o un job futuro —
 * nunca se ejecuta automáticamente durante esta migración.
 */
async function cleanupExpiredCheckoutAttempts(): Promise<CleanupResult> {
  try {
    const expiredCount = await expireStaleCheckoutAttempts();
    return { expiredCount };
  } catch (error) {
    logServerError("cleanupExpiredCheckoutAttempts:failed", error);
    throw error;
  }
}

export { cleanupExpiredCheckoutAttempts };
export type { CleanupResult };
