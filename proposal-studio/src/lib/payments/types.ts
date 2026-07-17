const PROVIDER_NAMES = ["mercado_pago"] as const;
type ProviderName = (typeof PROVIDER_NAMES)[number];

/**
 * Estados normalizados, independientes del proveedor. `unknown` es el
 * destino obligatorio de cualquier estado crudo no reconocido — nunca se
 * inventa una transición para un valor no documentado (ver
 * `src/lib/payments/status-map.ts`).
 */
const NORMALIZED_SUBSCRIPTION_STATUSES = [
  "pending",
  "authorized",
  "active",
  "past_due",
  "paused",
  "canceled",
  "expired",
  "suspended",
  "unknown",
] as const;

type NormalizedSubscriptionStatus = (typeof NORMALIZED_SUBSCRIPTION_STATUSES)[number];

interface CreateSubscriptionInput {
  /** `provider_plan_id` del plan local (ver `membership_plans.provider_plan_id`). */
  providerPlanId: string;
  payerEmail: string;
  /** Referencia opaca a la membresía local, ej. `membership:<uuid>`. Nunca datos sensibles. */
  externalReference: string;
  backUrl: string;
}

interface CreateSubscriptionResult {
  providerSubscriptionId: string;
  status: NormalizedSubscriptionStatus;
  /** URL oficial de checkout a la que redirigir al pagador (sandbox o producción según las credenciales). */
  checkoutUrl: string;
}

/** Vista normalizada de una suscripción real consultada contra la API del proveedor (nunca derivada solo del webhook). */
interface NormalizedProviderSubscription {
  providerSubscriptionId: string;
  status: NormalizedSubscriptionStatus;
  /** Estado crudo tal cual lo devuelve el proveedor, para auditoría (`memberships.provider_status`). */
  rawStatus: string;
  payerEmail: string | null;
  /** `payer_id` devuelto por Mercado Pago — identificador externo del pagador. Nunca se usa para correlacionar (la correlación determinística es siempre por `providerPlanId`, ver Paso 2.1) ni como identidad local: solo se persiste para auditoría en `membership_checkout_attempts.payer_id`. */
  payerId: string | null;
  /** `preapproval_plan_id` del plan asociado — clave real de correlación determinística: se busca contra `membership_checkout_attempts.provider_checkout_plan_id` (ver `src/lib/payments/reconciliation.ts`). Nunca se correlaciona por email, orden temporal ni monto. */
  providerPlanId: string | null;
  externalReference: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  lastPaymentAt: string | null;
  lastPaymentApproved: boolean | null;
}

interface NormalizedSubscriptionEvent {
  provider: ProviderName;
  /** Clave idempotente definitiva (real o sintética) — ver cada proveedor para cómo se construye. */
  idempotencyKey: string;
  eventType: string;
  /** Id crudo del recurso que trajo la notificación (preapproval id o payment id según el topic), para auditoría. */
  providerResourceId: string | null;
  /**
   * Id de la suscripción (preapproval) a la que pertenece el evento, ya
   * resuelto por el proveedor sin importar el topic — ej. para un evento de
   * pago recurrente (`subscription_authorized_payment`), el proveedor
   * consulta ese pago y resuelve a qué preapproval pertenece. Es la clave
   * usada para ubicar la membresía local (`memberships.provider_subscription_id`).
   * `null` si el evento no pudo resolverse a ninguna suscripción (se marca
   * `ignored`, nunca se inventa una asociación).
   */
  providerSubscriptionId: string | null;
  /** Señal adicional de un pago recurrente puntual, cuando el topic es de pago. `null` para eventos que no son de pago. */
  paymentSignal: { approved: boolean; paidAt: string | null } | null;
  signatureValid: boolean;
  /** Payload ya sanitizado (sin firma completa) apto para persistir en `payment_provider_events.payload`. */
  payload: Record<string, unknown>;
}

/** Input para crear un plan de suscripción en el catálogo del proveedor (`POST /preapproval_plan` en Mercado Pago). Los valores financieros deben salir siempre del plan local — nunca del navegador. */
interface CreateSubscriptionPlanInput {
  reason: string;
  amount: number;
  currency: string;
  frequency: number;
  frequencyType: "months" | "days";
  backUrl?: string;
}

interface CreatedProviderPlan {
  providerPlanId: string;
  status: string;
}

/** Vista normalizada de un plan de suscripción consultado contra el proveedor (`GET /preapproval_plan/{id}`), usada para comparar contra el plan local antes de asociarlo. */
interface NormalizedProviderPlan {
  providerPlanId: string;
  reason: string;
  amount: number;
  currency: string;
  frequency: number;
  frequencyType: string;
  status: string;
  /** URL de checkout hospedada por el proveedor para este plan (`init_point` en Mercado Pago) — `null` si el proveedor no la expone. */
  initPoint: string | null;
}

export { PROVIDER_NAMES, NORMALIZED_SUBSCRIPTION_STATUSES };
export type {
  ProviderName,
  NormalizedSubscriptionStatus,
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  NormalizedProviderSubscription,
  NormalizedSubscriptionEvent,
  CreateSubscriptionPlanInput,
  CreatedProviderPlan,
  NormalizedProviderPlan,
};
