import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { createAuthorizedMembership } from "@/lib/memberships/service";
import { MembershipServiceError } from "@/lib/memberships/types";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  planId: z.string().uuid(),
  currentPeriodEnd: z.string().datetime().optional(),
});

/**
 * Acción administrativa mínima de la Etapa 3: crea una membresía en estado
 * `authorized` (autorización manual de prueba, nunca `active` — eso
 * representa un pago real, que no existe hasta Mercado Pago en la Etapa 4).
 * Sin panel: se prueba igual que `/api/admin/activation-invitations`, con la
 * cookie de sesión del Platform Owner (ej. `fetch("/api/admin/memberships",
 * { method: "POST", headers: { "Content-Type": "application/json" }, body:
 * JSON.stringify({ email: "nueva@ejemplo.com", planId: "<uuid>" }) })`).
 * No acepta `price` ni ningún dato del proveedor de pagos. Tras crearla,
 * emitir la invitación asociada con `POST /api/admin/activation-invitations`
 * pasando `membershipId`.
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

  if (!checkRateLimit(`membership:create:${profile.id}`, 20, 60 * 60_000)) {
    return NextResponse.json({ error: "Demasiadas membresías creadas. Esperá unos minutos." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  try {
    const membership = await createAuthorizedMembership({
      email: parsed.data.email,
      planId: parsed.data.planId,
      currentPeriodEnd: parsed.data.currentPeriodEnd,
      actorUserId: profile.id,
    });

    return NextResponse.json({ membership });
  } catch (error) {
    if (error instanceof MembershipServiceError) {
      const status = error.code === "duplicate_active_membership" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    logServerError("POST /api/admin/memberships", error);
    return NextResponse.json({ error: "No se pudo crear la membresía." }, { status: 500 });
  }
}

export { POST };
