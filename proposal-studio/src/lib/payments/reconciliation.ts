import "server-only";

import { getSubscriptionProvider } from "@/lib/payments/index";
import { applyNormalizedSubscriptionEvent } from "@/lib/payments/subscription-sync";
import { resolveAttemptMatch } from "@/lib/payments/attempt-match";
import {
  findOpenCheckoutAttemptByProviderPlanId,
  linkCheckoutAttemptSubscription,
  updateCheckoutAttemptLifecycleStatus,
  getCheckoutAttemptByProviderSubscriptionId,
} from "@/lib/payments/checkout-attempts-repository";
import { getMembershipById, getMembershipByProviderSubscriptionId } from "@/lib/memberships/service";
import { logServerError } from "@/lib/utils/errors";
import type { ApplySyncResult } from "@/lib/payments/subscription-sync";

type ReconcileOutcome =
  | { matched: false; reason: "unmatched" }
  | { matched: false; reason: "multiple_attempts_conflict" }
  | { matched: false; reason: "attempt_membership_missing" }
  | ({ matched: true } & ApplySyncResult);

interface ReconcileParams {
  provider?: "mercado_pago";
  source: "payment_provider" | "admin";
  externalEventId?: string | null;
  actorUserId?: string | null;
}

/**
 * Único punto de correlación determinística real (Paso 2.1, sección 8):
 * reconsulta siempre el recurso contra el proveedor (nunca confía en el
 * payload de un webhook) y resuelve a qué membership pertenece exclusivamente
 * por `(provider, provider_checkout_plan_id)` — nunca por email, orden
 * temporal ni monto. Reutilizada tal cual por el webhook, la reconciliación
 * administrativa manual y cualquier job/health-check futuro: la lógica de
 * correlación vive acá una única vez.
 */
async function reconcileMercadoPagoPreapproval(
  preapprovalId: string,
  params: ReconcileParams,
): Promise<ReconcileOutcome> {
  const provider = getSubscriptionProvider(params.provider ?? "mercado_pago");
  const remote = await provider.getSubscription(preapprovalId);

  const paymentSignal = null;

  // Camino idempotente: ya vinculada (webhook reintentado, o reconciliación
  // repetida). No se vuelve a buscar por plan exclusivo — evita relincular.
  const alreadyLinked = await getMembershipByProviderSubscriptionId("mercado_pago", preapprovalId);
  if (alreadyLinked) {
    const result = await applyNormalizedSubscriptionEvent({
      membership: alreadyLinked,
      remote,
      paymentSignal,
      source: params.source,
      externalEventId: params.externalEventId,
      actorUserId: params.actorUserId,
    });
    await syncAttemptLifecycle(preapprovalId, result);
    return { matched: true, ...result };
  }

  if (!remote.providerPlanId) {
    return { matched: false, reason: "unmatched" };
  }

  const candidates = await findOpenCheckoutAttemptByProviderPlanId("mercado_pago", remote.providerPlanId);
  const resolution = resolveAttemptMatch(candidates);

  if (resolution.outcome === "unmatched") {
    return { matched: false, reason: "unmatched" };
  }

  if (resolution.outcome === "conflict") {
    logServerError("reconcileMercadoPagoPreapproval:multiple_attempts_conflict", {
      candidateCount: resolution.attempts.length,
    });
    return { matched: false, reason: "multiple_attempts_conflict" };
  }

  const attempt = resolution.attempt;
  const membership = await getMembershipById(attempt.membershipId);
  if (!membership) {
    logServerError("reconcileMercadoPagoPreapproval:attempt_membership_missing", { attemptId: attempt.id });
    return { matched: false, reason: "attempt_membership_missing" };
  }

  // Idempotente ante carrera: si otro evento concurrente ya vinculó este
  // mismo attempt, el CAS no pisa nada y se re-resuelve por
  // provider_subscription_id (mismo criterio que `linkMembershipProviderSubscription`).
  await linkCheckoutAttemptSubscription({
    attemptId: attempt.id,
    providerSubscriptionId: preapprovalId,
    payerId: remote.payerId,
  });

  const targetMembership = (await getMembershipByProviderSubscriptionId("mercado_pago", preapprovalId)) ?? membership;

  const result = await applyNormalizedSubscriptionEvent({
    membership: targetMembership,
    remote,
    paymentSignal,
    source: params.source,
    externalEventId: params.externalEventId,
    actorUserId: params.actorUserId,
  });

  await syncAttemptLifecycle(preapprovalId, result);

  return { matched: true, ...result };
}

/** Refleja el resultado de la transición de membership en el attempt vinculado: `completed` si terminó en un estado con acceso, `canceled` si se canceló, o se deja `matched` en el resto de los casos intermedios. */
async function syncAttemptLifecycle(preapprovalId: string, result: ApplySyncResult): Promise<void> {
  if (!result.applied) return;

  const attempt = await getCheckoutAttemptByProviderSubscriptionId("mercado_pago", preapprovalId);
  if (!attempt) return;

  if (result.membership.status === "canceled") {
    await updateCheckoutAttemptLifecycleStatus({ attemptId: attempt.id, status: "canceled" });
    return;
  }

  if (result.membership.status === "active" || result.membership.status === "authorized") {
    await updateCheckoutAttemptLifecycleStatus({ attemptId: attempt.id, status: "completed" });
  }
}

export { reconcileMercadoPagoPreapproval };
export type { ReconcileOutcome };
