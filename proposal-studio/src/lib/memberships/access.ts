import type { MembershipAccessDecision, MembershipAccessInput, MembershipStatus } from "@/lib/memberships/types";

/**
 * Puro, sin dependencias de servidor ni de Supabase: se puede testear con
 * `node --test` sin infraestructura. Nunca confía únicamente en `status` —
 * lo combina con las fechas, porque hasta la Etapa 4 (webhooks de Mercado
 * Pago) nada mueve automáticamente una membresía vencida a `expired`: una
 * membresía puede seguir con `status = 'active'` en la base mucho después de
 * que `current_period_end` ya pasó.
 */
function evaluateMembershipAccess(
  membership: MembershipAccessInput | null | undefined,
  now: Date = new Date(),
): MembershipAccessDecision {
  if (!membership) {
    return { allowed: false, level: "blocked", reason: "no_membership" };
  }

  const { status } = membership;
  const nowMs = now.getTime();

  if (status === "pending") {
    return { allowed: false, level: "blocked", reason: "not_started" };
  }
  if (status === "paused") {
    return { allowed: false, level: "blocked", reason: "paused" };
  }
  if (status === "canceled") {
    return { allowed: false, level: "blocked", reason: "canceled" };
  }
  if (status === "expired") {
    return { allowed: false, level: "blocked", reason: "expired" };
  }
  if (status === "suspended") {
    return { allowed: false, level: "blocked", reason: "suspended" };
  }

  if (status === "active" || status === "authorized") {
    if (membership.currentPeriodEnd) {
      const periodEndMs = new Date(membership.currentPeriodEnd).getTime();
      if (Number.isNaN(periodEndMs) || periodEndMs <= nowMs) {
        return { allowed: false, level: "blocked", reason: "period_expired" };
      }
    }
    return { allowed: true, level: "full", reason: status };
  }

  if (status === "past_due" || status === "grace_period") {
    if (!membership.gracePeriodEnd) {
      return { allowed: false, level: "blocked", reason: "payment_required" };
    }
    const graceEndMs = new Date(membership.gracePeriodEnd).getTime();
    if (Number.isNaN(graceEndMs) || graceEndMs <= nowMs) {
      return { allowed: false, level: "blocked", reason: "period_expired" };
    }
    return { allowed: true, level: "grace", reason: "grace_period" };
  }

  // Estado no contemplado (dato inconsistente): fail-closed.
  return { allowed: false, level: "blocked", reason: "expired" };
}

/**
 * Máquina de estados de `memberships.status`. Toda transición de la
 * aplicación debe pasar por acá (o por la guardia atómica equivalente en
 * `transition_membership_status`, que valida `expected_current_status` pero
 * no repite esta matriz — ver comentario en esa migración).
 */
const MEMBERSHIP_TRANSITIONS: Record<MembershipStatus, readonly MembershipStatus[]> = {
  pending: ["authorized", "canceled", "expired"],
  authorized: ["active", "canceled", "expired"],
  active: ["past_due", "paused", "canceled", "expired", "suspended"],
  past_due: ["grace_period", "active", "suspended", "canceled"],
  grace_period: ["active", "suspended", "canceled", "expired"],
  paused: ["active", "canceled", "expired"],
  suspended: ["active", "canceled", "expired"],
  canceled: [],
  expired: [],
};

function canTransitionMembershipStatus(from: MembershipStatus, to: MembershipStatus): boolean {
  return MEMBERSHIP_TRANSITIONS[from]?.includes(to) ?? false;
}

export { evaluateMembershipAccess, canTransitionMembershipStatus, MEMBERSHIP_TRANSITIONS };
