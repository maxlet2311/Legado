import "server-only";

import {
  mercadoPagoProvider,
  createSubscriptionPlan as createMercadoPagoSubscriptionPlan,
  getSubscriptionPlan as getMercadoPagoSubscriptionPlan,
} from "@/lib/payments/providers/mercado-pago";
import type { SubscriptionProvider } from "@/lib/payments/provider";
import type { CreatedProviderPlan, CreateSubscriptionPlanInput, NormalizedProviderPlan, ProviderName } from "@/lib/payments/types";

const MEMBERSHIP_EXTERNAL_REFERENCE_PREFIX = "membership:";

/** Referencia opaca enviada a Mercado Pago (`external_reference`): nunca datos sensibles, solo el id de la membresía. */
function buildMembershipExternalReference(membershipId: string): string {
  return `${MEMBERSHIP_EXTERNAL_REFERENCE_PREFIX}${membershipId}`;
}

/** Devuelve `null` si la referencia no tiene el formato esperado — nunca se asume un id arbitrario. */
function parseMembershipExternalReference(externalReference: string | null | undefined): string | null {
  if (!externalReference?.startsWith(MEMBERSHIP_EXTERNAL_REFERENCE_PREFIX)) {
    return null;
  }
  const id = externalReference.slice(MEMBERSHIP_EXTERNAL_REFERENCE_PREFIX.length);
  return id.length > 0 ? id : null;
}

/**
 * Único punto de acceso a un proveedor de pagos concreto. El resto de la
 * aplicación (checkout, webhook, reconciliación) siempre pasa por acá — nunca
 * importa `providers/mercado-pago.ts` directamente.
 */
function getSubscriptionProvider(provider: ProviderName = "mercado_pago"): SubscriptionProvider {
  switch (provider) {
    case "mercado_pago":
      return mercadoPagoProvider;
    default:
      throw new Error(`Proveedor de pagos no soportado: ${provider}`);
  }
}

/**
 * Provisión de planes en el catálogo del proveedor (`preapproval_plan`) — uso
 * exclusivamente administrativo. Separado de `getSubscriptionProvider`
 * (checkout de un pagador) porque ningún otro proveedor lo implementa todavía
 * y no forma parte del contrato `SubscriptionProvider`.
 */
function createProviderSubscriptionPlan(
  provider: ProviderName,
  input: CreateSubscriptionPlanInput,
): Promise<CreatedProviderPlan> {
  switch (provider) {
    case "mercado_pago":
      return createMercadoPagoSubscriptionPlan(input);
    default:
      throw new Error(`Proveedor de pagos no soportado: ${provider}`);
  }
}

function getProviderSubscriptionPlan(provider: ProviderName, providerPlanId: string): Promise<NormalizedProviderPlan> {
  switch (provider) {
    case "mercado_pago":
      return getMercadoPagoSubscriptionPlan(providerPlanId);
    default:
      throw new Error(`Proveedor de pagos no soportado: ${provider}`);
  }
}

export {
  getSubscriptionProvider,
  buildMembershipExternalReference,
  parseMembershipExternalReference,
  createProviderSubscriptionPlan,
  getProviderSubscriptionPlan,
};
export { PaymentProviderError } from "@/lib/payments/errors";
export { mapMercadoPagoSubscriptionStatus } from "@/lib/payments/status-map";
export type { SubscriptionProvider } from "@/lib/payments/provider";
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
} from "@/lib/payments/types";
