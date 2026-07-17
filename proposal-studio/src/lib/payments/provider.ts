import type {
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  NormalizedProviderSubscription,
  NormalizedSubscriptionEvent,
} from "@/lib/payments/types";

/**
 * Contrato que cualquier proveedor de pagos recurrentes debe implementar.
 * Nada fuera de `src/lib/payments/**` debe importar un proveedor concreto
 * (ej. `providers/mercado-pago.ts`) directamente — siempre a través de
 * `getSubscriptionProvider()` en `src/lib/payments/index.ts`.
 */
interface SubscriptionProvider {
  createSubscription(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult>;
  getSubscription(providerSubscriptionId: string): Promise<NormalizedProviderSubscription>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  parseWebhook(request: Request): Promise<NormalizedSubscriptionEvent>;
}

export type { SubscriptionProvider };
