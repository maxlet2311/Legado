import "server-only";

import { NextResponse } from "next/server";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { createAdminClient } from "@/lib/database/admin";
import { buildCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";

const MAX_ROWS = 10_000;

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

  if (!checkRateLimit(`admin:export:history:${profile.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas exportaciones. Esperá un momento." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("membership_status_history")
    .select("id, membership_id, previous_status, new_status, source, actor_user_id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  const csv = buildCsv(
    ["id", "membership_id", "previous_status", "new_status", "source", "actor_user_id", "reason", "created_at"],
    (data ?? []).map((h) => [h.id, h.membership_id, h.previous_status ?? "", h.new_status, h.source, h.actor_user_id ?? "", h.reason ?? "", h.created_at]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="membership-history-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export { GET };
