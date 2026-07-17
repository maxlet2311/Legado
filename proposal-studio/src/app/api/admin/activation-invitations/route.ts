import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { issueAndSendActivationInvitation, listActivationInvitations } from "@/lib/account-activation/service";
import { ActivationServiceError } from "@/lib/account-activation/types";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

/**
 * Lista invitaciones para el panel administrativo (Sprint 3, "ver estado").
 * Nunca incluye `token_hash`: `listActivationInvitations` ya lo excluye del
 * select.
 */
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

  if (!checkRateLimit(`activation-invitation:list:${profile.id}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Esperá unos minutos." }, { status: 429 });
  }

  const invitations = await listActivationInvitations();
  return NextResponse.json({ invitations });
}

const bodySchema = z
  .object({
    // Opcional cuando se provee `membershipId`: el email se deriva de la membresía.
    email: z.string().trim().toLowerCase().email().optional(),
    membershipId: z.string().uuid().optional(),
    expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
  })
  .refine((data) => Boolean(data.email) || Boolean(data.membershipId), {
    message: "Se requiere email o membershipId.",
  });

/**
 * Acción administrativa mínima de la Etapa 2: no hay panel de administración
 * todavía, así que emitir una invitación se prueba directamente contra este
 * endpoint (con la cookie de sesión del Platform Owner autenticado en el
 * navegador, ej. copiando el header `Cookie` a un `curl`, o desde la consola
 * del navegador con `fetch("/api/admin/activation-invitations", { method:
 * "POST", headers: { "Content-Type": "application/json" }, body:
 * JSON.stringify({ email: "nueva@ejemplo.com" }) })` estando logueado como
 * owner). Etapa 5: el enlace ya no se devuelve en la respuesta HTTP — se
 * envía por email real (`issueAndSendActivationInvitation`); esta respuesta
 * solo confirma si el envío tuvo éxito.
 *
 * Etapa 3: acepta `membershipId` en vez de (o adicionalmente a) `email` para
 * emitir una invitación comercial asociada a una membresía `authorized`/
 * `active` (ver `POST /api/admin/memberships` para crear esa membresía
 * primero).
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

  if (!checkRateLimit(`activation-invitation:create:${profile.id}`, 20, 60 * 60_000)) {
    return NextResponse.json({ error: "Demasiadas invitaciones emitidas. Esperá unos minutos." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  try {
    const result = await issueAndSendActivationInvitation({
      email: parsed.data.email,
      membershipId: parsed.data.membershipId,
      createdByUserId: profile.id,
      expiresInHours: parsed.data.expiresInHours,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "La invitación se generó pero no pudimos enviar el correo. Podés reintentar." },
        { status: 502 },
      );
    }

    // Ya no se devuelve el enlace/token en la respuesta (Etapa 5, sección 2):
    // el canal de entrega es el email, nunca la respuesta HTTP de este endpoint.
    // `emailSent: false` (Sprint 3, EMAIL_ENABLED=false) es éxito igual: la
    // invitación quedó creada y auditada, solo se omitió el envío real.
    return NextResponse.json({ sent: true, emailSent: result.emailSent });
  } catch (error) {
    if (error instanceof ActivationServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logServerError("POST /api/admin/activation-invitations", error);
    return NextResponse.json({ error: "No se pudo crear la invitación." }, { status: 500 });
  }
}

export { GET, POST };
