import type { NormalizedSubscriptionStatus } from "@/lib/payments/types";

/**
 * Únicos estados reales documentados por Mercado Pago para un `preapproval`
 * (suscripción): `pending`, `authorized`, `paused`, `cancelled`. Mercado Pago
 * no expone un estado propio de "mora"/"vencida" a nivel de preapproval — eso
 * se infiere en la aplicación a partir de los pagos recurrentes
 * (`subscription_authorized_payment`, ver `providers/mercado-pago.ts`), nunca
 * acá. Cualquier valor no listado abajo (typo, campo nuevo, versión de API
 * distinta) cae a `"unknown"` — nunca se inventa una transición para un
 * estado no reconocido.
 */
function mapMercadoPagoSubscriptionStatus(rawStatus: string | null | undefined): NormalizedSubscriptionStatus {
  switch (rawStatus) {
    case "pending":
      return "pending";
    case "authorized":
      return "authorized";
    case "paused":
      return "paused";
    case "cancelled":
      return "canceled";
    default:
      return "unknown";
  }
}

export { mapMercadoPagoSubscriptionStatus };
