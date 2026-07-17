import "server-only";

import { NextResponse } from "next/server";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { createAdminClient } from "@/lib/database/admin";
import { buildCsv } from "@/lib/admin/csv";
import { maskExternalId } from "@/app/(app)/admin/memberships/status-badge";

export const runtime = "nodejs";

const MAX_ROWS = 10_000;

/** Export CSV de membresías para el Platform Owner. Sin tokens, hashes ni IDs de proveedor completos (enmascarados). */
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

  if (!checkRateLimit(`admin:export:memberships:${profile.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas exportaciones. Esperá un momento." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select("id, email, status, plan_id, user_id, provider, provider_subscription_id, current_period_start, current_period_end, grace_period_end, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  const csv = buildCsv(
    ["id", "email", "status", "plan_id", "user_id", "provider", "provider_subscription_id_masked", "current_period_start", "current_period_end", "grace_period_end", "created_at", "updated_at"],
    (data ?? []).map((m) => [
      m.id,
      m.email,
      m.status,
      m.plan_id,
      m.user_id ?? "",
      m.provider ?? "",
      maskExternalId(m.provider_subscription_id),
      m.current_period_start ?? "",
      m.current_period_end ?? "",
      m.grace_period_end ?? "",
      m.created_at,
      m.updated_at,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="memberships-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export { GET };
