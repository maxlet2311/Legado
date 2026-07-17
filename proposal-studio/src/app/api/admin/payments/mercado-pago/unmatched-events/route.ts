import "server-only";

import { NextResponse } from "next/server";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { listUnmatchedEvents } from "@/lib/payments/webhook-events";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

/** Lista eventos de webhook huérfanos (Paso 2.1, sección 7) para reconciliación administrativa vía `POST /api/admin/payments/mercado-pago/reconcile`. */
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

  if (!checkRateLimit(`payments:mercado-pago:unmatched-events:${profile.id}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Esperá unos minutos." }, { status: 429 });
  }

  try {
    const events = await listUnmatchedEvents();
    return NextResponse.json({ events });
  } catch (error) {
    logServerError("GET /api/admin/payments/mercado-pago/unmatched-events", error);
    return NextResponse.json({ error: "No se pudieron listar los eventos huérfanos." }, { status: 500 });
  }
}

export { GET };
