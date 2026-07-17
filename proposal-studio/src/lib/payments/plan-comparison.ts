import type { CreateSubscriptionPlanInput, NormalizedProviderPlan } from "@/lib/payments/types";
import type { MembershipPlan } from "@/lib/memberships/types";

/**
 * Mercado Pago solo documenta `frequency_type: "months"` para
 * `preapproval_plan` (con `frequency` hasta 12) — no existe un
 * `frequency_type` de años, por eso "year" se representa como 12 meses.
 */
const BILLING_INTERVAL_TO_MONTHS_MULTIPLIER: Record<MembershipPlan["billingInterval"], number> = {
  month: 1,
  year: 12,
};

function expectedFrequencyMonths(plan: Pick<MembershipPlan, "billingInterval" | "billingIntervalCount">): number {
  return plan.billingIntervalCount * BILLING_INTERVAL_TO_MONTHS_MULTIPLIER[plan.billingInterval];
}

/** Deriva el body de `POST /preapproval_plan` exclusivamente a partir del plan local — nunca de un input externo. */
function buildCreateSubscriptionPlanInput(
  plan: Pick<MembershipPlan, "name" | "price" | "currency" | "billingInterval" | "billingIntervalCount">,
  backUrl: string,
): CreateSubscriptionPlanInput {
  return {
    reason: plan.name,
    amount: plan.price,
    currency: plan.currency,
    frequency: expectedFrequencyMonths(plan),
    frequencyType: "months",
    backUrl,
  };
}

/**
 * `reason` del preapproval_plan exclusivo de un checkout attempt (Paso 2.1,
 * sección 5): reconocible operativamente, nunca incluye email, nombre,
 * UUID completo ni ningún otro dato personal — `ref` es un identificador
 * corto no reversible (ver `buildAttemptReasonRef`), nunca la fuente de
 * verdad de la correlación (esa es siempre `provider_checkout_plan_id`).
 */
function buildExclusiveCheckoutPlanInput(
  plan: Pick<MembershipPlan, "name" | "price" | "currency" | "billingInterval" | "billingIntervalCount">,
  backUrl: string,
  ref: string,
): CreateSubscriptionPlanInput {
  return {
    reason: `Proposal Studio — ${plan.name} — Ref ${ref}`,
    amount: plan.price,
    currency: plan.currency,
    frequency: expectedFrequencyMonths(plan),
    frequencyType: "months",
    backUrl,
  };
}

/** Identificador corto y no reversible para el `reason` del plan exclusivo — nunca el uuid del checkout attempt ni de la membership. */
function buildAttemptReasonRef(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

interface PlanComparisonResult {
  matches: boolean;
  mismatches: string[];
}

/** Compara el plan remoto contra el plan local en los campos financieros que deben coincidir 1:1 antes de asociar. */
function compareProviderPlan(
  local: Pick<MembershipPlan, "price" | "currency" | "billingInterval" | "billingIntervalCount">,
  remote: NormalizedProviderPlan,
): PlanComparisonResult {
  const expectedFrequency = expectedFrequencyMonths(local);
  const mismatches: string[] = [];

  if (Math.round(remote.amount * 100) !== Math.round(local.price * 100)) {
    mismatches.push(`monto: local=${local.price} remoto=${remote.amount}`);
  }
  if (remote.currency !== local.currency) {
    mismatches.push(`moneda: local=${local.currency} remoto=${remote.currency}`);
  }
  if (remote.frequency !== expectedFrequency || remote.frequencyType !== "months") {
    mismatches.push(`frecuencia: local=${expectedFrequency} months remoto=${remote.frequency} ${remote.frequencyType}`);
  }

  return { matches: mismatches.length === 0, mismatches };
}

/** Nunca se persiste ni se loguea el id externo completo — solo un prefijo suficiente para reconciliación manual. */
function maskProviderPlanId(providerPlanId: string): string {
  if (providerPlanId.length <= 6) return "***";
  return `${providerPlanId.slice(0, 4)}...${providerPlanId.slice(-2)}`;
}

export {
  buildCreateSubscriptionPlanInput,
  buildExclusiveCheckoutPlanInput,
  buildAttemptReasonRef,
  compareProviderPlan,
  maskProviderPlanId,
};
export type { PlanComparisonResult };
