const MEMBERSHIP_STATUSES = [
  "pending",
  "authorized",
  "active",
  "past_due",
  "grace_period",
  "paused",
  "canceled",
  "expired",
  "suspended",
] as const;

type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** Estados considerados "vigentes" a efectos de unicidad (ver índices parciales de la migración `memberships`). */
const CURRENT_MEMBERSHIP_STATUSES: readonly MembershipStatus[] = [
  "pending",
  "authorized",
  "active",
  "past_due",
  "grace_period",
  "paused",
];

/** Únicos estados desde los que una membresía puede vincularse a un usuario en la activación. */
const ACTIVATION_ELIGIBLE_STATUSES: readonly MembershipStatus[] = ["authorized", "active"];

type MembershipHistorySource = "system" | "admin" | "payment_provider" | "migration" | "activation";

type MembershipAccessLevel = "full" | "grace" | "blocked";

type MembershipAccessReason =
  | "active"
  | "authorized"
  | "grace_period"
  | "not_started"
  | "period_expired"
  | "payment_required"
  | "paused"
  | "canceled"
  | "expired"
  | "suspended"
  | "no_membership";

interface MembershipAccessDecision {
  allowed: boolean;
  level: MembershipAccessLevel;
  reason: MembershipAccessReason;
}

/** Forma mínima e independiente del esquema de Supabase que necesita `evaluateMembershipAccess`. Mantenerla pura y testeable sin conexión real. */
interface MembershipAccessInput {
  status: MembershipStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  gracePeriodEnd?: string | null;
}

/** Vista de dominio (camelCase) de una fila de `memberships`, usada por el servicio y la UI. */
interface Membership {
  id: string;
  userId: string | null;
  email: string;
  planId: string;
  status: MembershipStatus;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerStatus: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  lastPaymentAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: "month" | "year";
  billingIntervalCount: number;
  isActive: boolean;
  sortOrder: number;
  features: Record<string, unknown>;
  provider: string | null;
  providerPlanId: string | null;
}

class MembershipServiceError extends Error {
  code:
    | "plan_not_found"
    | "plan_inactive"
    | "duplicate_active_membership"
    | "membership_not_found"
    | "invalid_transition"
    | "concurrency_conflict"
    | "membership_not_eligible"
    | "email_mismatch"
    | "profile_not_found"
    | "invalid_email"
    | "internal_error";

  constructor(code: MembershipServiceError["code"], message: string) {
    super(message);
    this.name = "MembershipServiceError";
    this.code = code;
  }
}

export { MEMBERSHIP_STATUSES, CURRENT_MEMBERSHIP_STATUSES, ACTIVATION_ELIGIBLE_STATUSES, MembershipServiceError };
export type {
  MembershipStatus,
  MembershipHistorySource,
  MembershipAccessLevel,
  MembershipAccessReason,
  MembershipAccessDecision,
  MembershipAccessInput,
  Membership,
  MembershipPlan,
};
