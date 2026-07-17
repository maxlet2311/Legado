import "server-only";

import { NextResponse } from "next/server";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { computeMembershipHealth } from "@/lib/admin/health";
import { buildCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";

async function GET() {
  let profile;
  try {
    profile = await requirePlatformOwner();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Requiere ser el propietario de la plataforma." }, { status: 403 });
    }
    throw error;
  }

  if (!checkRateLimit(`admin:export:health:${profile.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas exportaciones. Esperá un momento." }, { status: 429 });
  }

  const report = await computeMembershipHealth();

  const rows: [string, string | number][] = [
    ["total_memberships", report.totalMemberships],
    ...Object.entries(report.byStatus).map(([status, count]) => [`status_${status}`, count] as [string, number]),
    ["with_access", report.withAccess],
    ["blocked", report.blocked],
    ["without_user", report.withoutUser],
    ["inconsistent_count", report.inconsistentCount],
    ["failed_provider_events", report.failedProviderEvents],
    ["pending_invitations", report.pendingInvitations],
    ["expired_invitations", report.expiredInvitations],
    ["active_users_without_membership", report.activeUsersWithoutMembership],
    ["orphan_oauth_users", report.orphanOAuthUsers],
    ["incomplete_plans", report.incompletePlans],
    ["generated_at", report.generatedAt],
  ];

  const csv = buildCsv(["metric", "value"], rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="membership-health-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export { GET };
