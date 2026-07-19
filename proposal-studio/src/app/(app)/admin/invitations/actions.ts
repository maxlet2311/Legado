"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { logServerError } from "@/lib/utils/errors";
import {
  issueAndSendActivationInvitation,
  cancelActivationInvitation,
  forceExpireActivationInvitation,
  resendActivationInvitation,
} from "@/lib/account-activation/service";
import { ActivationServiceError } from "@/lib/account-activation/types";

interface ActionResult {
  error?: string;
  success?: boolean;
  emailSent?: boolean;
}

/**
 * Defensa en profundidad, mismo criterio que `admin-actions.ts` de
 * membresías: el layout de `/admin` ya exige `requirePlatformOwner()`, pero
 * cada Server Action lo vuelve a chequear de forma independiente.
 */
async function requirePlatformOwnerOrError(): Promise<
  { profile: Awaited<ReturnType<typeof requirePlatformOwner>> } | { error: string }
> {
  try {
    const profile = await requirePlatformOwner();
    return { profile };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Requiere ser el propietario de la plataforma." };
    }
    throw error;
  }
}

function revalidateInvitations() {
  revalidatePath("/admin/invitations");
}

const invitationIdSchema = z.string().uuid();
const createSchema = z.object({ email: z.string().trim().toLowerCase().email() });

/**
 * Emite una invitación por email libre (sin `membershipId`) — es la primera
 * vez que este flujo queda accesible desde una UI en vez de `curl`/consola
 * del navegador (ver docstring histórico en
 * `src/app/api/admin/activation-invitations/route.ts`). El envío de correo
 * se registra en auditoría acá, en la capa de la acción — la propia
 * `issueAndSendActivationInvitation` no audita por diseño (la usan también
 * flujos automáticos/sistema sin actor administrativo, ej. webhooks).
 */
async function createInvitationAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const parsed = createSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  if (!checkRateLimit(`admin:invitation:create:${profile.id}`, 20, 60 * 60_000)) {
    return { error: "Demasiadas invitaciones emitidas. Esperá unos minutos." };
  }

  try {
    const result = await issueAndSendActivationInvitation({
      email: parsed.data.email,
      createdByUserId: profile.id,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "activation_invitation.created",
      entityType: "account_activation_invitation",
      metadata: { email: parsed.data.email, emailSent: result.emailSent, success: result.success },
    });

    if (!result.success) {
      return { error: "La invitación se generó pero no pudimos enviar el correo. Podés reintentar." };
    }

    revalidateInvitations();
    return { success: true, emailSent: result.emailSent };
  } catch (error) {
    if (error instanceof ActivationServiceError) return { error: error.message };
    logServerError("createInvitationAction", error);
    return { error: "No se pudo crear la invitación." };
  }
}

async function cancelInvitationAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const invitationId = invitationIdSchema.safeParse(formData.get("invitationId"));
  if (!invitationId.success) return { error: "Id de invitación inválido." };

  if (!checkRateLimit(`admin:invitation:cancel:${profile.id}`, 30, 60 * 60_000)) {
    return { error: "Demasiadas solicitudes. Esperá unos minutos." };
  }

  try {
    await cancelActivationInvitation({ invitationId: invitationId.data, actorUserId: profile.id });
    revalidateInvitations();
    return { success: true };
  } catch (error) {
    if (error instanceof ActivationServiceError) return { error: error.message };
    logServerError("cancelInvitationAction", error);
    return { error: "No se pudo cancelar la invitación." };
  }
}

async function forceExpireInvitationAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const invitationId = invitationIdSchema.safeParse(formData.get("invitationId"));
  if (!invitationId.success) return { error: "Id de invitación inválido." };

  if (!checkRateLimit(`admin:invitation:force-expire:${profile.id}`, 30, 60 * 60_000)) {
    return { error: "Demasiadas solicitudes. Esperá unos minutos." };
  }

  try {
    await forceExpireActivationInvitation({ invitationId: invitationId.data, actorUserId: profile.id });
    revalidateInvitations();
    return { success: true };
  } catch (error) {
    if (error instanceof ActivationServiceError) return { error: error.message };
    logServerError("forceExpireInvitationAction", error);
    return { error: "No se pudo forzar el vencimiento de la invitación." };
  }
}

async function resendInvitationAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const invitationId = invitationIdSchema.safeParse(formData.get("invitationId"));
  if (!invitationId.success) return { error: "Id de invitación inválido." };

  if (!checkRateLimit(`admin:invitation:resend:${profile.id}`, 20, 60 * 60_000)) {
    return { error: "Demasiados reenvíos. Esperá unos minutos." };
  }

  try {
    const result = await resendActivationInvitation({ invitationId: invitationId.data, actorUserId: profile.id });

    if (!result.success) {
      return { error: "La invitación se reemitió pero no pudimos enviar el correo. Podés reintentar." };
    }

    revalidateInvitations();
    return { success: true, emailSent: result.emailSent };
  } catch (error) {
    if (error instanceof ActivationServiceError) return { error: error.message };
    logServerError("resendInvitationAction", error);
    return { error: "No se pudo reenviar la invitación." };
  }
}

export { createInvitationAction, cancelInvitationAction, forceExpireInvitationAction, resendInvitationAction };
