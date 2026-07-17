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

/** Nunca incluye `payload` (puede contener datos crudos del proveedor) — solo metadata de diagnóstico. */
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

  if (!checkRateLimit(`admin:export:failed-events:${profile.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas exportaciones. Esperá un momento." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_provider_events")
    .select("id, provider, event_type, provider_resource_id, processing_status, attempt_count, error_message, created_at")
    .eq("processing_status", "failed")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  const csv = buildCsv(
    ["id", "provider", "event_type", "provider_resource_id_masked", "processing_status", "attempt_count", "error_message", "created_at"],
    (data ?? []).map((e) => [
      e.id,
      e.provider,
      e.event_type,
      maskExternalId(e.provider_resource_id),
      e.processing_status,
      e.attempt_count,
      e.error_message ?? "",
      e.created_at,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="failed-provider-events-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export { GET };
