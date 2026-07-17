import "server-only";

import { createProviderSubscriptionPlan, getProviderSubscriptionPlan } from "@/lib/payments/index";
import { buildCreateSubscriptionPlanInput, compareProviderPlan, maskProviderPlanId } from "@/lib/payments/plan-comparison";
import type { MembershipPlan } from "@/lib/memberships/types";
import { getSiteUrl } from "@/lib/utils/env";

class PlanProvisioningError extends Error {
  code:
    | "already_associated_mismatch"
    | "remote_plan_not_found"
    | "remote_plan_mismatch"
    | "provider_response_missing_id";

  constructor(code: PlanProvisioningError["code"], message: string) {
    super(message);
    this.name = "PlanProvisioningError";
    this.code = code;
  }
}

interface SyncPlanWithProviderResult {
  providerPlanId: string;
  providerPlanIdMasked: string;
  status: string;
  wasAlreadyAssociated: boolean;
}

/**
 * Crea (o, si ya existe una asociación, verifica) el plan de Mercado Pago
 * correspondiente a un plan local y devuelve el resultado sanitizado listo
 * para persistir/auditar. No escribe en la base — el llamador (Server Action)
 * decide cómo persistir `provider`/`provider_plan_id` y qué auditar, para
 * mantener esta función pura de efectos de red hacia el proveedor.
 */
async function syncPlanWithProvider(plan: MembershipPlan): Promise<SyncPlanWithProviderResult> {
  if (plan.provider === "mercado_pago" && plan.providerPlanId) {
    // Idempotencia: si ya hay una asociación, se verifica contra el proveedor
    // en vez de crear un plan nuevo (ver sección 7 del runbook de Paso 1).
    const remote = await getProviderSubscriptionPlan("mercado_pago", plan.providerPlanId);
    const comparison = compareProviderPlan(plan, remote);
    if (!comparison.matches) {
      throw new PlanProvisioningError(
        "already_associated_mismatch",
        `El plan local ya está asociado a ${maskProviderPlanId(plan.providerPlanId)} pero los valores no coinciden: ${comparison.mismatches.join("; ")}`,
      );
    }
    return {
      providerPlanId: plan.providerPlanId,
      providerPlanIdMasked: maskProviderPlanId(plan.providerPlanId),
      status: remote.status,
      wasAlreadyAssociated: true,
    };
  }

  const backUrl = `${getSiteUrl()}/admin/membership-plans`;
  const created = await createProviderSubscriptionPlan("mercado_pago", buildCreateSubscriptionPlanInput(plan, backUrl));
  if (!created.providerPlanId) {
    throw new PlanProvisioningError("provider_response_missing_id", "Mercado Pago no devolvió un id de plan.");
  }

  // Persistir el id inmediatamente después de una respuesta exitosa es
  // responsabilidad del llamador — acá solo se valida la correspondencia
  // antes de devolverlo, para no asociar un plan mal formado.
  const remote = await getProviderSubscriptionPlan("mercado_pago", created.providerPlanId);
  const comparison = compareProviderPlan(plan, remote);
  if (!comparison.matches) {
    throw new PlanProvisioningError(
      "remote_plan_mismatch",
      `El plan recién creado en Mercado Pago (${maskProviderPlanId(created.providerPlanId)}) no coincide con el plan local: ${comparison.mismatches.join("; ")}`,
    );
  }

  return {
    providerPlanId: created.providerPlanId,
    providerPlanIdMasked: maskProviderPlanId(created.providerPlanId),
    status: remote.status,
    wasAlreadyAssociated: false,
  };
}

export { syncPlanWithProvider, PlanProvisioningError };
export type { SyncPlanWithProviderResult };
