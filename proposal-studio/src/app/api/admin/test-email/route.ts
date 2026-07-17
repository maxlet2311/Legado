import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { sendTransactionalEmail, EmailDeliveryError, EmailDisabledError } from "@/lib/email/client";
import { logServerError } from "@/lib/utils/errors";

export const runtime = "nodejs";

const bodySchema = z.object({ to: z.string().trim().email() });

/**
 * Envía un correo de prueba real (Resend) — solo cuando el Platform Owner lo
 * pide explícitamente desde `/admin/settings`, nunca automáticamente. No
 * expone `RESEND_API_KEY` ni ningún secreto en la respuesta ni en logs.
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

  if (!checkRateLimit(`admin:test-email:${profile.id}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Demasiados correos de prueba. Esperá unos minutos." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresá un email de destino válido." }, { status: 400 });
  }

  try {
    await sendTransactionalEmail({
      to: parsed.data.to,
      subject: "Proposal Studio™ — correo de prueba (Etapa 6)",
      html: "<p>Este es un correo de prueba enviado desde el panel administrativo de Proposal Studio™.</p>",
      text: "Este es un correo de prueba enviado desde el panel administrativo de Proposal Studio™.",
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "settings.test_email_sent",
      entityType: "email_config",
      metadata: { toDomain: parsed.data.to.split("@")[1] ?? null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof EmailDisabledError) {
      return NextResponse.json(
        { error: "EMAIL_ENABLED=false: el envío real está deshabilitado. Activalo cuando Resend marque el dominio como VERIFIED." },
        { status: 503 },
      );
    }
    if (error instanceof EmailDeliveryError) {
      logServerError("POST /api/admin/test-email", { message: error.message });
      return NextResponse.json(
        { error: "No se pudo enviar el correo. Revisá RESEND_API_KEY y EMAIL_FROM en la configuración del entorno." },
        { status: 502 },
      );
    }
    logServerError("POST /api/admin/test-email", error);
    return NextResponse.json({ error: "No se pudo enviar el correo de prueba." }, { status: 500 });
  }
}

export { POST };
