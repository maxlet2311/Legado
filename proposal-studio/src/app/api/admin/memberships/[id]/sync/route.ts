import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { getMembershipById } from "@/lib/memberships/service";
import { PaymentProviderError } from "@/lib/payments";
import { reconcileMercadoPagoPreapproval } from "@/lib/payments/reconciliation";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Reconciliación manual (Etapa 4, sección 23): re-consulta el estado real de
 * la suscripción en Mercado Pago y aplica la transición correspondiente si
 * corresponde. Exclusivo del Platform Owner — no hay UI todavía, se invoca
 * igual que el resto de los endpoints administrativos de este proyecto (con
 * la cookie de sesión del owner, ej. `fetch("/api/admin/memberships/<id>/sync",
 * { method: "POST" })`).
 */
async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let profile;
  try {
    profile = await requirePlatformOwner();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Requiere ser el propietario de la plataforma." }, { status: 403 });
    }
    throw error;
  }

  if (!checkRateLimit(`membership:sync:${profile.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas reconciliaciones. Esperá unos minutos." }, { status: 429 });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Id de membresía inválido." }, { status: 400 });
  }

  const membership = await getMembershipById(parsedParams.data.id);
  if (!membership) {
    return NextResponse.json({ error: "La membresía indicada no existe." }, { status: 404 });
  }

  if (!membership.provider || !membership.providerSubscriptionId) {
    return NextResponse.json({ error: "Esta membresía no tiene una suscripción de proveedor asociada." }, { status: 400 });
  }

  try {
    const outcome = await reconcileMercadoPagoPreapproval(membership.providerSubscriptionId, {
      source: "admin",
      actorUserId: profile.id,
    });

    if (!outcome.matched) {
      return NextResponse.json({ error: "No se pudo correlacionar la suscripción con ningún checkout attempt." }, { status: 409 });
    }

    return NextResponse.json({
      applied: outcome.applied,
      skipReason: outcome.skipReason ?? null,
      status: outcome.membership.status,
    });
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      return NextResponse.json({ error: "No se pudo consultar la suscripción con el proveedor de pagos." }, { status: 502 });
    }
    logServerError("POST /api/admin/memberships/:id/sync", error);
    return NextResponse.json({ error: "No se pudo reconciliar la membresía." }, { status: 500 });
  }
}

export { POST };
