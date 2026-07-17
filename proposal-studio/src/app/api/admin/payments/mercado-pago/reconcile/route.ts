import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { reconcileMercadoPagoPreapproval } from "@/lib/payments/reconciliation";
import { PaymentProviderError } from "@/lib/payments";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({ preapprovalId: z.string().trim().min(1) });

/**
 * Reconciliación administrativa manual de un evento huérfano (Paso 2.1,
 * sección 7): reintenta la correlación determinística contra el proveedor
 * real. Nunca acepta ni permite elegir una membership arbitraria — la única
 * entrada es el id real de la suscripción en Mercado Pago, y la correlación
 * sigue siendo exclusivamente por `provider_checkout_plan_id`
 * (`reconcileMercadoPagoPreapproval`, reutilizado tal cual del webhook).
 */
async function POST(request: Request) {
  let profile;
  try {
    profile = await requirePlatformOwner();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Requiere ser el propietario de la plataforma." }, { status: 403 });
    }
    throw error;
  }

  if (!checkRateLimit(`payments:mercado-pago:reconcile:${profile.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas reconciliaciones. Esperá unos minutos." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Id de suscripción inválido." }, { status: 400 });
  }

  try {
    const outcome = await reconcileMercadoPagoPreapproval(parsed.data.preapprovalId, {
      source: "admin",
      actorUserId: profile.id,
    });

    if (!outcome.matched) {
      return NextResponse.json({ matched: false, reason: outcome.reason });
    }

    return NextResponse.json({
      matched: true,
      applied: outcome.applied,
      skipReason: outcome.skipReason ?? null,
      status: outcome.membership.status,
    });
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      return NextResponse.json({ error: "No se pudo consultar la suscripción con el proveedor de pagos." }, { status: 502 });
    }
    logServerError("POST /api/admin/payments/mercado-pago/reconcile", error);
    return NextResponse.json({ error: "No se pudo reconciliar la suscripción." }, { status: 500 });
  }
}

export { POST };
