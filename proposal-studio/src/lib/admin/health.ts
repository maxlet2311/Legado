import "server-only";

import { createAdminClient } from "@/lib/database/admin";
import { evaluateMembershipAccess } from "@/lib/memberships/access";
import { MEMBERSHIP_STATUSES, ACTIVATION_ELIGIBLE_STATUSES } from "@/lib/memberships/types";
import type { MembershipStatus } from "@/lib/memberships/types";

interface MembershipHealthReport {
  totalMemberships: number;
  byStatus: Record<MembershipStatus, number>;
  withAccess: number;
  blocked: number;
  withoutUser: number;
  inconsistentCount: number;
  inconsistentMembershipIds: string[];
  failedProviderEvents: number;
  pendingInvitations: number;
  expiredInvitations: number;
  activeUsersWithoutMembership: number;
  orphanOAuthUsers: number;
  incompletePlans: number;
  generatedAt: string;
}

/**
 * Recalcula el estado de salud completo. Todas las consultas van contra
 * `createAdminClient()` (service role, bypassa RLS a propósito — es lectura
 * administrativa agregada, no una vista por usuario). No pagina
 * `auth.admin.listUsers` más allá de lo necesario para detectar huérfanos:
 * a la escala actual (decenas/cientos de usuarios) es aceptable; documentado
 * como deuda si el volumen crece mucho (ver `docs/MEMBERSHIP_OPERATIONS.md`).
 */
async function computeMembershipHealth(): Promise<MembershipHealthReport> {
  const admin = createAdminClient();

  const [membershipsRes, plansRes, invitationsRes, failedEventsRes, profilesRes] = await Promise.all([
    admin.from("memberships").select("id, status, user_id, current_period_start, current_period_end, grace_period_end"),
    admin.from("membership_plans").select("id, provider, provider_plan_id, is_active"),
    admin.from("account_activation_invitations").select("id, status, expires_at"),
    admin.from("payment_provider_events").select("id", { count: "exact", head: true }).eq("processing_status", "failed"),
    admin.from("profiles").select("id, is_active, is_platform_owner"),
  ]);

  const memberships = membershipsRes.data ?? [];
  const byStatus = Object.fromEntries(MEMBERSHIP_STATUSES.map((s) => [s, 0])) as Record<MembershipStatus, number>;
  let withAccess = 0;
  let withoutUser = 0;
  const inconsistentIds: string[] = [];

  for (const m of memberships) {
    const status = m.status as MembershipStatus;
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    if (!m.user_id) withoutUser += 1;

    const access = evaluateMembershipAccess({
      status,
      currentPeriodStart: m.current_period_start,
      currentPeriodEnd: m.current_period_end,
      gracePeriodEnd: m.grace_period_end,
    });
    if (access.allowed) withAccess += 1;

    const inconsistent =
      (["active", "past_due", "grace_period"].includes(status) && !m.current_period_end) ||
      (status === "grace_period" && !m.grace_period_end);
    if (inconsistent) inconsistentIds.push(m.id);
  }

  const nowIso = new Date().toISOString();
  const invitations = invitationsRes.data ?? [];
  const pendingInvitations = invitations.filter((i) => i.status === "pending" && i.expires_at > nowIso).length;
  const expiredInvitations = invitations.filter((i) => i.status === "pending" && i.expires_at <= nowIso).length;

  const plans = plansRes.data ?? [];
  const incompletePlans = plans.filter((p) => p.is_active && (!p.provider || !p.provider_plan_id)).length;

  const profiles = profilesRes.data ?? [];
  const activeNonOwnerProfileIds = new Set(profiles.filter((p) => p.is_active && !p.is_platform_owner).map((p) => p.id));
  const membershipUserIds = new Set(memberships.filter((m) => m.user_id).map((m) => m.user_id as string));
  const activeUsersWithoutMembership = [...activeNonOwnerProfileIds].filter((id) => !membershipUserIds.has(id)).length;

  let orphanOAuthUsers = 0;
  {
    const profileIds = new Set(profiles.map((p) => p.id));
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error || !data) break;
      orphanOAuthUsers += data.users.filter((u) => !profileIds.has(u.id)).length;
      if (data.users.length < perPage) break;
      page += 1;
    }
  }

  return {
    totalMemberships: memberships.length,
    byStatus,
    withAccess,
    blocked: memberships.length - withAccess,
    withoutUser,
    inconsistentCount: inconsistentIds.length,
    inconsistentMembershipIds: inconsistentIds,
    failedProviderEvents: failedEventsRes.count ?? 0,
    pendingInvitations,
    expiredInvitations,
    activeUsersWithoutMembership,
    orphanOAuthUsers,
    incompletePlans,
    generatedAt: new Date().toISOString(),
  };
}

export { computeMembershipHealth, ACTIVATION_ELIGIBLE_STATUSES };
export type { MembershipHealthReport };
