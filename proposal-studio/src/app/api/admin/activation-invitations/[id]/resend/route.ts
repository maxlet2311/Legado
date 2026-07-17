import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { resendActivationInvitation } from "@/lib/account-activation/service";
import { ActivationServiceError } from "@/lib/account-activation/types";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Reenvía una invitación pendiente (Sprint 3): invalida el token anterior y
 * emite uno nuevo para el mismo destinatario. Acción exclusiva de Platform
 * Owner.
 */
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

  if (!checkRateLimit(`activation-invitation:resend:${profile.id}`, 20, 60 * 60_000)) {
    return NextResponse.json({ error: "Demasiadas invitaciones reenviadas. Esperá unos minutos." }, { status: 429 });
  }

  try {
    const result = await resendActivationInvitation({
      invitationId: parsedParams.data.id,
      actorUserId: profile.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "La invitación se reemitió pero no pudimos enviar el correo. Podés reintentar." },
        { status: 502 },
      );
    }

    return NextResponse.json({ sent: true, emailSent: result.emailSent });
  } catch (error) {
    if (error instanceof ActivationServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logServerError("POST /api/admin/activation-invitations/[id]/resend", error);
    return NextResponse.json({ error: "No se pudo reenviar la invitación." }, { status: 500 });
  }
}

export { POST };
