import "server-only";

import type { MembershipAccessLevel } from "@/lib/memberships/types";
import type { MembershipEnforcementMode } from "@/lib/memberships/config";

type MembershipBypassReason = "platform_owner_system_access" | "internal_service" | "migration";

interface MembershipAuditEvent {
  userId: string;
  surface: string;
  membershipId?: string | null;
  status?: string | null;
  level: MembershipAccessLevel | "unknown";
  decisionAllowed: boolean;
  reason: string;
  enforcementMode: MembershipEnforcementMode;
  bypassReason?: MembershipBypassReason | null;
}

/**
 * Log estructurado de decisiones de membresía (Etapa 5, sección 20). Nunca
 * incluye email completo, tokens, cookies ni payloads — solo `userId` (uuid,
 * no email) y datos de estado ya no sensibles. En modo `enforce` solo se
 * loguean decisiones bloqueadas y bypasses (evita ruido); en `audit` se
 * loguean también los accesos que *hubieran* sido bloqueados, que es el
 * propósito completo de ese modo.
 */
function logMembershipAuditEvent(event: MembershipAuditEvent): void {
  const shouldLog = event.enforcementMode === "audit" || !event.decisionAllowed || Boolean(event.bypassReason);
  if (!shouldLog) return;

  console.log("[memberships:audit]", {
    userId: event.userId,
    surface: event.surface,
    membershipId: event.membershipId ?? null,
    status: event.status ?? null,
    level: event.level,
    decisionAllowed: event.decisionAllowed,
    reason: event.reason,
    enforcementMode: event.enforcementMode,
    bypassReason: event.bypassReason ?? null,
    timestamp: new Date().toISOString(),
  });
}

export { logMembershipAuditEvent };
export type { MembershipBypassReason, MembershipAuditEvent };
