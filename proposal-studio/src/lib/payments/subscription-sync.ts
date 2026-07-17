import "server-only";

import { canTransitionMembershipStatus } from "@/lib/memberships/access";
import { transitionMembershipStatus, linkMembershipToUser, getCurrentMembershipForUser } from "@/lib/memberships/service";
import { ACTIVATION_ELIGIBLE_STATUSES, CURRENT_MEMBERSHIP_STATUSES } from "@/lib/memberships/types";
import type { Membership, MembershipHistorySource } from "@/lib/memberships/types";
import { findAuthUserByEmail } from "@/lib/auth/admin-lookup";
import { getMembershipGracePeriodDays } from "@/lib/utils/env";
import { logServerError } from "@/lib/utils/errors";
import { parseMembershipExternalReference } from "@/lib/payments/index";
import { resolveTargetStatus } from "@/lib/payments/target-status";
import type { NormalizedProviderSubscription } from "@/lib/payments/types";

type SyncSkipReason =
  | "external_reference_mismatch"
  | "not_applicable_for_current_status"
  | "already_current"
  | "invalid_transition"
  | "unknown_provider_status";

interface ApplySyncParams {
  membership: Membership;
  remote: NormalizedProviderSubscription;
  paymentSignal: { approved: boolean; paidAt: string | null } | null;
  source: MembershipHistorySource;
  externalEventId?: string | null;
  actorUserId?: string | null;
}

interface ApplySyncResult {
  applied: boolean;
  membership: Membership;
  skipReason?: SyncSkipReason;
}

/**
 * Etapa 4 sección 21: si el email de la membresía ya corresponde a un
 * usuario existente, se vincula automáticamente (nunca se crea una segunda
 * cuenta). Si ese usuario ya tiene otra membresía vigente incompatible, no
 * se vincula — se registra la inconsistencia para reparación administrativa
 * manual, sin otorgar acceso duplicado.
 *
 * Etapa 5, sección 2 ("generación bajo demanda"): si no existe usuario, esta
 * función **ya no genera ni envía ningún token acá**. El webhook solo deja
 * la membresía en un estado elegible (`authorized`/`active`, sin
 * `user_id`) — el token se genera recién cuando el usuario lo pide en
 * `/request-activation` (`issueAndSendActivationInvitation`). Esto evita
 * generar tokens que nadie solicitó y que podrían perderse sin entrega.
 */
async function linkExistingUserOrInvite(membership: Membership): Promise<void> {
  const existingUser = await findAuthUserByEmail(membership.email);

  if (!existingUser) {
    console.log("[payments] membership_awaiting_activation_request", { membershipId: membership.id });
    return;
  }

  const existingMembership = await getCurrentMembershipForUser(existingUser.id);
  const hasIncompatibleMembership =
    existingMembership && existingMembership.id !== membership.id && CURRENT_MEMBERSHIP_STATUSES.includes(existingMembership.status);

  if (hasIncompatibleMembership) {
    logServerError("subscriptionSync:link_conflict_needs_manual_repair", {
      membershipId: membership.id,
      userId: existingUser.id,
      conflictingMembershipId: existingMembership.id,
    });
    return;
  }

  try {
    await linkMembershipToUser({
      membershipId: membership.id,
      userId: existingUser.id,
      email: membership.email,
      source: "payment_provider",
      actorUserId: null,
    });
  } catch (error) {
    logServerError("subscriptionSync:auto_link_failed", { membershipId: membership.id, userId: existingUser.id, error });
  }
}

/**
 * Aplica un evento ya normalizado y verificado contra el recurso real a una
 * membresía local. Único punto de la aplicación que decide "qué status le
 * pongo" y "cuándo emitir invitación" para eventos de Mercado Pago — usado
 * tanto por el webhook como por la reconciliación administrativa manual.
 */
async function applyNormalizedSubscriptionEvent(params: ApplySyncParams): Promise<ApplySyncResult> {
  const { membership, remote, paymentSignal, source, externalEventId, actorUserId } = params;

  const referencedMembershipId = parseMembershipExternalReference(remote.externalReference);
  if (referencedMembershipId && referencedMembershipId !== membership.id) {
    logServerError("subscriptionSync:external_reference_mismatch", {
      membershipId: membership.id,
      providerSubscriptionId: remote.providerSubscriptionId,
    });
    return { applied: false, membership, skipReason: "external_reference_mismatch" };
  }

  const target = resolveTargetStatus(membership.status, remote.status, paymentSignal);

  if (!target) {
    return { applied: false, membership, skipReason: remote.status === "unknown" ? "unknown_provider_status" : "not_applicable_for_current_status" };
  }

  if (target === membership.status) {
    return { applied: false, membership, skipReason: "already_current" };
  }

  if (!canTransitionMembershipStatus(membership.status, target)) {
    logServerError("subscriptionSync:invalid_transition", {
      membershipId: membership.id,
      from: membership.status,
      to: target,
    });
    return { applied: false, membership, skipReason: "invalid_transition" };
  }

  const wasEligibleBefore = ACTIVATION_ELIGIBLE_STATUSES.includes(membership.status);
  const graceDays = getMembershipGracePeriodDays();
  const nowMs = Date.now();

  const updated = await transitionMembershipStatus({
    membershipId: membership.id,
    newStatus: target,
    source,
    reason: `Sincronizado desde Mercado Pago (preapproval ${remote.rawStatus}).`,
    actorUserId: actorUserId ?? undefined,
    externalEventId: externalEventId ?? undefined,
    currentPeriodStart: remote.currentPeriodStart,
    currentPeriodEnd: remote.currentPeriodEnd,
    providerStatus: remote.rawStatus,
    lastPaymentAt: paymentSignal?.paidAt ?? undefined,
    gracePeriodEnd: target === "past_due" ? new Date(nowMs + graceDays * 86_400_000).toISOString() : undefined,
    clearGracePeriodEnd: target === "active",
  });

  if (!wasEligibleBefore && ACTIVATION_ELIGIBLE_STATUSES.includes(target) && !updated.userId) {
    await linkExistingUserOrInvite(updated);
  }

  return { applied: true, membership: updated };
}

export { applyNormalizedSubscriptionEvent };
export type { ApplySyncParams, ApplySyncResult, SyncSkipReason };
