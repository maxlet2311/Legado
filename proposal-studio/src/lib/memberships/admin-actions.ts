"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { findAuthUserByEmail } from "@/lib/auth/admin-lookup";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { logServerError } from "@/lib/utils/errors";
import {
  getMembershipById,
  linkMembershipToUser,
  transitionMembershipStatus,
  createAuthorizedMembership,
} from "@/lib/memberships/service";
import { canTransitionMembershipStatus } from "@/lib/memberships/access";
import { MembershipServiceError, ACTIVATION_ELIGIBLE_STATUSES } from "@/lib/memberships/types";
import { issueAndSendActivationInvitation } from "@/lib/account-activation/service";
import { ActivationServiceError } from "@/lib/account-activation/types";
import { getSubscriptionProvider, PaymentProviderError } from "@/lib/payments";
import { applyNormalizedSubscriptionEvent } from "@/lib/payments/subscription-sync";

interface ActionResult {
  error?: string;
  success?: boolean;
}

function revalidateMembership(id: string) {
  revalidatePath("/admin/memberships");
  revalidatePath(`/admin/memberships/${id}`);
}

async function requirePlatformOwnerOrError(): Promise<{ profile: Awaited<ReturnType<typeof requirePlatformOwner>> } | { error: string }> {
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

const membershipIdSchema = z.string().uuid();

/** Suspende el acceso de una membresía. Requiere motivo obligatorio. Nunca toca `profiles.is_active`. */
async function suspendMembershipAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const membershipId = membershipIdSchema.safeParse(formData.get("membershipId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!membershipId.success) return { error: "Id de membresía inválido." };
  if (!reason) return { error: "El motivo es obligatorio." };

  if (!checkRateLimit(`admin:membership:suspend:${profile.id}`, 30, 60_000)) {
    return { error: "Demasiadas operaciones. Esperá un momento." };
  }

  const before = await getMembershipById(membershipId.data);
  if (!before) return { error: "La membresía indicada no existe." };

  try {
    const after = await transitionMembershipStatus({
      membershipId: membershipId.data,
      newStatus: "suspended",
      source: "admin",
      reason,
      actorUserId: profile.id,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "membership.suspend",
      entityType: "membership",
      entityId: before.id,
      reason,
      beforeData: { status: before.status },
      afterData: { status: after.status },
    });

    revalidateMembership(before.id);
    return { success: true };
  } catch (error) {
    if (error instanceof MembershipServiceError) return { error: error.message };
    logServerError("suspendMembershipAction", error);
    return { error: "No se pudo suspender la membresía." };
  }
}

/**
 * Reactiva una membresía suspendida. Si tiene proveedor externo asociado,
 * primero consulta su estado real y solo permite el override manual con
 * motivo explícito (`override=true`) — nunca reactiva "a ciegas" contra un
 * estado remoto incompatible.
 */
async function reactivateMembershipAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const membershipId = membershipIdSchema.safeParse(formData.get("membershipId"));
  const reason = String(formData.get("reason") ?? "").trim();
  const override = formData.get("override") === "true";
  if (!membershipId.success) return { error: "Id de membresía inválido." };
  if (!reason) return { error: "El motivo es obligatorio." };

  if (!checkRateLimit(`admin:membership:reactivate:${profile.id}`, 30, 60_000)) {
    return { error: "Demasiadas operaciones. Esperá un momento." };
  }

  const before = await getMembershipById(membershipId.data);
  if (!before) return { error: "La membresía indicada no existe." };

  if (before.provider && before.providerSubscriptionId && !override) {
    try {
      const provider = getSubscriptionProvider();
      const remote = await provider.getSubscription(before.providerSubscriptionId);
      if (remote.status !== "active" && remote.status !== "authorized") {
        return {
          error: `El proveedor externo reporta el estado "${remote.rawStatus}", incompatible con reactivar. Usá el override manual con motivo si estás seguro.`,
        };
      }
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        return { error: "No se pudo consultar el proveedor de pagos. Usá el override manual si necesitás continuar igual." };
      }
      throw error;
    }
  }

  try {
    const after = await transitionMembershipStatus({
      membershipId: membershipId.data,
      newStatus: "active",
      source: "admin",
      reason: override ? `[override manual] ${reason}` : reason,
      actorUserId: profile.id,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "membership.reactivate",
      entityType: "membership",
      entityId: before.id,
      reason,
      beforeData: { status: before.status },
      afterData: { status: after.status },
      metadata: { override },
    });

    revalidateMembership(before.id);
    return { success: true };
  } catch (error) {
    if (error instanceof MembershipServiceError) return { error: error.message };
    logServerError("reactivateMembershipAction", error);
    return { error: "No se pudo reactivar la membresía." };
  }
}

/**
 * Cancela una membresía. `mode: "provider"` cancela primero en Mercado Pago y
 * solo transiciona localmente si el proveedor confirma; `mode: "manual"`
 * transiciona directo (sin proveedor asociado, o cancelación administrativa
 * pura).
 */
async function cancelMembershipAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const membershipId = membershipIdSchema.safeParse(formData.get("membershipId"));
  const reason = String(formData.get("reason") ?? "").trim();
  const mode = formData.get("mode") === "provider" ? "provider" : "manual";
  if (!membershipId.success) return { error: "Id de membresía inválido." };
  if (!reason) return { error: "El motivo es obligatorio." };

  if (!checkRateLimit(`admin:membership:cancel:${profile.id}`, 30, 60_000)) {
    return { error: "Demasiadas operaciones. Esperá un momento." };
  }

  const before = await getMembershipById(membershipId.data);
  if (!before) return { error: "La membresía indicada no existe." };

  if (!canTransitionMembershipStatus(before.status, "canceled")) {
    return { error: `No se puede cancelar una membresía en estado "${before.status}".` };
  }

  let providerStatus: string | null = null;

  if (mode === "provider") {
    if (!before.provider || !before.providerSubscriptionId) {
      return { error: "Esta membresía no tiene una suscripción de proveedor asociada. Usá cancelación manual." };
    }
    try {
      const provider = getSubscriptionProvider();
      await provider.cancelSubscription(before.providerSubscriptionId);
      const remote = await provider.getSubscription(before.providerSubscriptionId);
      providerStatus = remote.rawStatus;
      if (remote.status !== "canceled") {
        return { error: "El proveedor de pagos todavía no confirma la cancelación. Reintentá en unos minutos." };
      }
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        return { error: "No se pudo cancelar la suscripción con el proveedor de pagos." };
      }
      throw error;
    }
  }

  try {
    const after = await transitionMembershipStatus({
      membershipId: membershipId.data,
      newStatus: "canceled",
      source: "admin",
      reason,
      actorUserId: profile.id,
      providerStatus,
      cancelAtPeriodEnd: false,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "membership.cancel",
      entityType: "membership",
      entityId: before.id,
      reason,
      beforeData: { status: before.status },
      afterData: { status: after.status },
      metadata: { mode },
    });

    revalidateMembership(before.id);
    return { success: true };
  } catch (error) {
    if (error instanceof MembershipServiceError) return { error: error.message };
    logServerError("cancelMembershipAction", error);
    return { error: "No se pudo cancelar la membresía." };
  }
}

/**
 * Vincula una membresía sin usuario al perfil cuyo email coincide
 * exactamente. Nunca acepta un `user_id` provisto por el formulario: siempre
 * resuelve el usuario server-side buscando por el email de la propia
 * membresía (`findAuthUserByEmail`), igual que hace la activación normal.
 */
async function linkMembershipAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const membershipId = membershipIdSchema.safeParse(formData.get("membershipId"));
  if (!membershipId.success) return { error: "Id de membresía inválido." };

  if (!checkRateLimit(`admin:membership:link:${profile.id}`, 30, 60_000)) {
    return { error: "Demasiadas operaciones. Esperá un momento." };
  }

  const before = await getMembershipById(membershipId.data);
  if (!before) return { error: "La membresía indicada no existe." };
  if (before.userId) return { error: "La membresía ya está vinculada a un usuario." };

  const match = await findAuthUserByEmail(before.email);
  if (!match) {
    return { error: "No existe una cuenta con el email de esta membresía todavía." };
  }

  try {
    const after = await linkMembershipToUser({
      membershipId: before.id,
      userId: match.id,
      email: before.email,
      source: "admin",
      actorUserId: profile.id,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "membership.link",
      entityType: "membership",
      entityId: before.id,
      beforeData: { userId: before.userId },
      afterData: { userId: after.userId },
    });

    revalidateMembership(before.id);
    return { success: true };
  } catch (error) {
    if (error instanceof MembershipServiceError) return { error: error.message };
    logServerError("linkMembershipAction", error);
    return { error: "No se pudo vincular la membresía." };
  }
}

/**
 * Reenvía la invitación de activación. Solo permitido si la membresía no
 * tiene usuario vinculado todavía y está en un estado que habilita
 * activación (`authorized`/`active`) — nunca `canceled`, `suspended`,
 * `paused` ni `expired`.
 */
async function resendActivationAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const membershipId = membershipIdSchema.safeParse(formData.get("membershipId"));
  if (!membershipId.success) return { error: "Id de membresía inválido." };

  if (!checkRateLimit(`admin:membership:resend:${profile.id}`, 20, 60 * 60_000)) {
    return { error: "Demasiados reenvíos. Esperá unos minutos." };
  }

  const membership = await getMembershipById(membershipId.data);
  if (!membership) return { error: "La membresía indicada no existe." };
  if (membership.userId) return { error: "La membresía ya está vinculada a un usuario." };
  if (!ACTIVATION_ELIGIBLE_STATUSES.includes(membership.status)) {
    return { error: `No se puede emitir una invitación para una membresía en estado "${membership.status}".` };
  }

  try {
    const result = await issueAndSendActivationInvitation({
      membershipId: membership.id,
      createdByUserId: profile.id,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "membership.resend_activation",
      entityType: "membership",
      entityId: membership.id,
      metadata: { emailSent: result.success },
    });

    if (!result.success) {
      return { error: "No se pudo enviar el correo de activación. Revisá la configuración de Resend." };
    }

    revalidateMembership(membership.id);
    return { success: true };
  } catch (error) {
    if (error instanceof ActivationServiceError) return { error: error.message };
    logServerError("resendActivationAction", error);
    return { error: "No se pudo reenviar la invitación." };
  }
}

/** Reconciliación manual contra Mercado Pago — reusa el mismo servicio que `POST /api/admin/memberships/:id/sync`. */
async function resyncMembershipAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const membershipId = membershipIdSchema.safeParse(formData.get("membershipId"));
  if (!membershipId.success) return { error: "Id de membresía inválido." };

  if (!checkRateLimit(`admin:membership:sync:${profile.id}`, 30, 60_000)) {
    return { error: "Demasiadas reconciliaciones. Esperá un momento." };
  }

  const before = await getMembershipById(membershipId.data);
  if (!before) return { error: "La membresía indicada no existe." };
  if (!before.provider || !before.providerSubscriptionId) {
    return { error: "Esta membresía no tiene una suscripción de proveedor asociada." };
  }

  try {
    const provider = getSubscriptionProvider("mercado_pago");
    const remote = await provider.getSubscription(before.providerSubscriptionId);

    const result = await applyNormalizedSubscriptionEvent({
      membership: before,
      remote,
      paymentSignal: null,
      source: "payment_provider",
      actorUserId: profile.id,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "membership.resync",
      entityType: "membership",
      entityId: before.id,
      beforeData: { status: before.status },
      afterData: { status: result.membership.status, applied: result.applied },
      metadata: { providerStatus: remote.rawStatus, skipReason: result.skipReason ?? null },
    });

    revalidateMembership(before.id);
    return { success: true };
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      return { error: "No se pudo consultar la suscripción con el proveedor de pagos." };
    }
    logServerError("resyncMembershipAction", error);
    return { error: "No se pudo reconciliar la membresía." };
  }
}

interface CreateMembershipActionResult {
  error?: string;
  membershipId?: string;
}

/**
 * Alta manual de membresía fuera del checkout de Mercado Pago (mismo
 * contrato que `POST /api/admin/memberships`, ver `createAuthorizedMembership`
 * en `service.ts`). Siempre crea en estado `authorized`, nunca `active` — eso
 * requiere un pago real confirmado por el proveedor.
 */
async function createMembershipAction(
  _prevState: CreateMembershipActionResult,
  formData: FormData,
): Promise<CreateMembershipActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const emailParsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  const planIdParsed = z.string().uuid().safeParse(formData.get("planId"));
  const currentPeriodEndRaw = String(formData.get("currentPeriodEnd") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!emailParsed.success) return { error: "El email ingresado no es válido." };
  if (!planIdParsed.success) return { error: "Seleccioná un plan válido." };
  if (!reason) return { error: "El motivo es obligatorio." };

  if (!checkRateLimit(`admin:membership:create:${profile.id}`, 20, 60 * 60_000)) {
    return { error: "Demasiadas membresías creadas. Esperá unos minutos." };
  }

  try {
    const membership = await createAuthorizedMembership({
      email: emailParsed.data,
      planId: planIdParsed.data,
      currentPeriodEnd: currentPeriodEndRaw || undefined,
      actorUserId: profile.id,
    });

    await recordAdminAuditEvent({
      actorUserId: profile.id,
      action: "membership.create_manual",
      entityType: "membership",
      entityId: membership.id,
      reason,
      afterData: { email: membership.email, planId: membership.planId, status: membership.status },
    });

    revalidatePath("/admin/memberships");
    return { membershipId: membership.id };
  } catch (error) {
    if (error instanceof MembershipServiceError) return { error: error.message };
    logServerError("createMembershipAction", error);
    return { error: "No se pudo crear la membresía." };
  }
}

export {
  suspendMembershipAction,
  reactivateMembershipAction,
  cancelMembershipAction,
  linkMembershipAction,
  resendActivationAction,
  resyncMembershipAction,
  createMembershipAction,
};
