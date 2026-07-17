import "server-only";

import { NextResponse } from "next/server";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { cleanupExpiredCheckoutAttempts } from "@/lib/payments/checkout-attempts-cleanup";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

/**
 * Expira localmente los checkout attempts abandonados (Paso 2.1, sección 9).
 * Nunca destructivo: solo cambia `status` a `expired`, no borra evidencia ni
 * intenta desactivar el `preapproval_plan` externo (sin mecanismo oficial
 * confirmado — ver `checkout-attempts-cleanup.ts`). No se ejecuta
 * automáticamente todavía; disponible para invocar manualmente o cablear a
 * un job en una etapa posterior.
 */
async function POST() {
  let profile;
  try {
    profile = await requirePlatformOwner();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Requiere ser el propietario de la plataforma." }, { status: 403 });
    }
    throw error;
  }

  if (!checkRateLimit(`payments:mercado-pago:cleanup:${profile.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Esperá unos minutos." }, { status: 429 });
  }

  try {
    const result = await cleanupExpiredCheckoutAttempts();
    return NextResponse.json(result);
  } catch (error) {
    logServerError("POST /api/admin/payments/mercado-pago/cleanup", error);
    return NextResponse.json({ error: "No se pudo ejecutar la limpieza." }, { status: 500 });
  }
}

export { POST };
