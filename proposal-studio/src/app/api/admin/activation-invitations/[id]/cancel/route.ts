import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { cancelActivationInvitation } from "@/lib/account-activation/service";
import { ActivationServiceError } from "@/lib/account-activation/types";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

/** Cancela una invitación pendiente (Sprint 3): el token deja de ser válido de inmediato. Platform Owner únicamente. */
async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let profile;
  try {
    profile = await requirePlatformOwner();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Requiere ser el propietario de la plataforma." }, { status: 403 });
    }
    throw error;
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Identificador de invitación inválido." }, { status: 400 });
  }

  if (!checkRateLimit(`activation-invitation:cancel:${profile.id}`, 30, 60 * 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Esperá unos minutos." }, { status: 429 });
  }

  try {
    await cancelActivationInvitation({ invitationId: parsedParams.data.id, actorUserId: profile.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ActivationServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logServerError("POST /api/admin/activation-invitations/[id]/cancel", error);
    return NextResponse.json({ error: "No se pudo cancelar la invitación." }, { status: 500 });
  }
}

export { POST };
