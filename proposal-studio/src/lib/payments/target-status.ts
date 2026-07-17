import type { MembershipStatus } from "@/lib/memberships/types";
import type { NormalizedSubscriptionStatus } from "@/lib/payments/types";

/**
 * Deriva el estado destino a partir del recurso real consultado a Mercado
 * Pago (nunca del payload crudo del webhook, ver sección 14 del alcance de
 * Etapa 4). `preapproval.status` solo puede ser
 * pending/authorized/paused/cancelled (Mercado Pago no expone un estado de
 * "activa con pagos al día" ni de "mora" a ese nivel) — `active` y
 * `past_due` son inferencias propias de la aplicación, derivadas
 * exclusivamente de eventos de pago recurrente (`paymentSignal`), nunca del
 * estado del preapproval. Pura y sin dependencias de servidor: testeable con
 * `node --test` sin infraestructura (mismo criterio que
 * `src/lib/memberships/access.ts`).
 */
function resolveTargetStatus(
  currentStatus: MembershipStatus,
  remoteStatus: NormalizedSubscriptionStatus,
  paymentSignal: { approved: boolean; paidAt: string | null } | null,
): MembershipStatus | null {
  if (paymentSignal) {
    if (paymentSignal.approved) {
      if (currentStatus === "authorized" || currentStatus === "past_due" || currentStatus === "active") {
        return "active";
      }
      return null;
    }
    if (currentStatus === "active") {
      return "past_due";
    }
    return null;
  }

  if (remoteStatus === "unknown") {
    return null;
  }

  // El preapproval cancelado siempre gana: si Mercado Pago dice cancelled,
  // se refleja sin importar en qué estado local esté (siempre que la matriz
  // de transición lo permita — ver `canTransitionMembershipStatus`).
  if (remoteStatus === "canceled" || remoteStatus === "pending" || remoteStatus === "authorized" || remoteStatus === "paused") {
    return remoteStatus;
  }

  return null;
}

export { resolveTargetStatus };
