import "server-only";

import { z } from "zod";

import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { logServerError } from "@/lib/utils/errors";
import { evaluateMembershipAccess, canTransitionMembershipStatus } from "@/lib/memberships/access";
import {
  getPlanById,
  getMembershipById as repoGetMembershipById,
  getMembershipByProviderSubscriptionId as repoGetMembershipByProviderSubscriptionId,
  getCurrentMembershipForUser as repoGetCurrentMembershipForUser,
  getCurrentMembershipForEmail as repoGetCurrentMembershipForEmail,
  callCreateMembership,
  callTransitionMembershipStatus,
  callLinkMembershipToUser,
} from "@/lib/memberships/repository";
import { getSubscriptionProvider, PaymentProviderError } from "@/lib/payments";
import { MembershipServiceError, ACTIVATION_ELIGIBLE_STATUSES } from "@/lib/memberships/types";
import type {
  Membership,
  MembershipAccessDecision,
  MembershipHistorySource,
  MembershipStatus,
} from "@/lib/memberships/types";

const emailSchema = z.string().trim().toLowerCase().email();

function normalizeEmailOrThrow(email: string): string {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    throw new MembershipServiceError("invalid_email", "El correo ingresado no tiene un formato válido.");
  }
  return parsed.data;
}

/** Traduce los códigos de error crudos de Postgres/PostgREST a `MembershipServiceError` de dominio. */
function translateDatabaseError(error: unknown, context: string): never {
  const pgError = error as { code?: string; message?: string } | null | undefined;

  if (pgError?.code === "23505") {
    throw new MembershipServiceError(
      "duplicate_active_membership",
      "Ya existe una membresía vigente para ese usuario o correo.",
    );
  }
  if (pgError?.code === "PS409") {
    throw new MembershipServiceError(
      "concurrency_conflict",
      "La membresía cambió de estado en simultáneo. Reintentá la operación.",
    );
  }
  if (pgError?.code === "P0002") {
    throw new MembershipServiceError("profile_not_found", "No existe un perfil para ese usuario.");
  }
  if (pgError?.code === "P0001") {
    throw new MembershipServiceError(
      "membership_not_eligible",
      "La membresía no está disponible para esta operación (estado inválido, email no coincide, o ya vinculada).",
    );
  }

  logServerError(context, error);
  throw new MembershipServiceError("internal_error", "Ocurrió un error inesperado procesando la membresía.");
}

interface CreatePendingMembershipParams {
  email: string;
  planId: string;
  metadata?: Record<string, unknown>;
  provider?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerStatus?: string | null;
  /** Etapa 4: id explícito para poder referenciarlo como `external_reference` antes de llamar al proveedor de pagos (ver `src/lib/payments/checkout.ts`). */
  id?: string;
}

async function assertPlanActive(planId: string) {
  const plan = await getPlanById(planId);
  if (!plan) {
    throw new MembershipServiceError("plan_not_found", "El plan indicado no existe.");
  }
  if (!plan.isActive) {
    throw new MembershipServiceError("plan_inactive", "El plan indicado no está disponible.");
  }
  return plan;
}

/** Membresía en estado `pending`: contratación iniciada, todavía sin autorización de pago (uso futuro, Etapa 4). */
async function createPendingMembership(params: CreatePendingMembershipParams): Promise<Membership> {
  const email = normalizeEmailOrThrow(params.email);
  await assertPlanActive(params.planId);

  try {
    return await callCreateMembership({
      email,
      planId: params.planId,
      status: "pending",
      source: "system",
      metadata: params.metadata,
      provider: params.provider,
      providerCustomerId: params.providerCustomerId,
      providerSubscriptionId: params.providerSubscriptionId,
      providerStatus: params.providerStatus,
      id: params.id,
    });
  } catch (error) {
    translateDatabaseError(error, "createPendingMembership");
  }
}

interface CreateAuthorizedMembershipParams {
  email: string;
  planId: string;
  currentPeriodEnd?: string | null;
  actorUserId: string;
}

/**
 * Membresía en `authorized`: autorización manual de prueba (acción
 * administrativa de la Etapa 3, ver
 * `src/app/api/admin/memberships/route.ts`). Nunca `active` — `active`
 * representa un pago real confirmado, que todavía no existe hasta la
 * integración con Mercado Pago (Etapa 4).
 */
async function createAuthorizedMembership(params: CreateAuthorizedMembershipParams): Promise<Membership> {
  const email = normalizeEmailOrThrow(params.email);
  await assertPlanActive(params.planId);

  try {
    return await callCreateMembership({
      email,
      planId: params.planId,
      status: "authorized",
      source: "admin",
      currentPeriodEnd: params.currentPeriodEnd ?? null,
      actorUserId: params.actorUserId,
      reason: "Autorización manual (Etapa 3, previa a integración de Mercado Pago).",
    });
  } catch (error) {
    translateDatabaseError(error, "createAuthorizedMembership");
  }
}

interface CreateMigratedMembershipParams {
  email: string;
  planId: string;
  currentPeriodEnd: string;
  actorUserId: string;
  userId?: string | null;
}

/**
 * Membresía en `authorized` originada por la migración controlada de
 * usuarios existentes (Etapa 5, sección 7) — nunca `active` (no simula un
 * pago real de Mercado Pago) y siempre con `currentPeriodEnd` explícito
 * (nunca acceso indefinido). `source = "migration"`, distinto de `"admin"`
 * (autorización manual de la Etapa 3), para poder auditar por separado qué
 * membresías vinieron de la migración masiva. Ver
 * `src/lib/memberships/user-migration.ts`.
 */
async function createMigratedMembership(params: CreateMigratedMembershipParams): Promise<Membership> {
  const email = normalizeEmailOrThrow(params.email);
  await assertPlanActive(params.planId);

  try {
    return await callCreateMembership({
      email,
      planId: params.planId,
      status: "authorized",
      source: "migration",
      userId: params.userId ?? null,
      currentPeriodEnd: params.currentPeriodEnd,
      actorUserId: params.actorUserId,
      reason: "Migración controlada de usuario existente previa a la activación de enforcement (Etapa 5).",
    });
  } catch (error) {
    translateDatabaseError(error, "createMigratedMembership");
  }
}

async function getMembershipById(id: string): Promise<Membership | null> {
  return repoGetMembershipById(id);
}

async function getCurrentMembershipForUser(userId: string): Promise<Membership | null> {
  return repoGetCurrentMembershipForUser(userId);
}

async function getCurrentMembershipForEmail(email: string): Promise<Membership | null> {
  return repoGetCurrentMembershipForEmail(normalizeEmailOrThrow(email));
}

async function getMembershipByProviderSubscriptionId(provider: string, providerSubscriptionId: string): Promise<Membership | null> {
  return repoGetMembershipByProviderSubscriptionId(provider, providerSubscriptionId);
}

interface LinkMembershipToUserParams {
  membershipId: string;
  userId: string;
  email: string;
  source?: MembershipHistorySource;
  actorUserId?: string | null;
}

/**
 * Vincula una membresía existente a un usuario ya activado. No acepta
 * `userId` arbitrario del navegador: solo debe invocarse desde
 * `activateAccount` (activación válida) o una acción administrativa
 * protegida futura. Toda la validación de seguridad real (perfil existente,
 * email coincidente, estado habilitado) ocurre atómicamente dentro de
 * `link_membership_to_user` — ver esa migración.
 */
async function linkMembershipToUser(params: LinkMembershipToUserParams): Promise<Membership> {
  const email = normalizeEmailOrThrow(params.email);

  try {
    return await callLinkMembershipToUser({
      membershipId: params.membershipId,
      userId: params.userId,
      email,
      source: params.source,
      actorUserId: params.actorUserId,
    });
  } catch (error) {
    translateDatabaseError(error, "linkMembershipToUser");
  }
}

interface TransitionMembershipStatusParams {
  membershipId: string;
  newStatus: MembershipStatus;
  source: MembershipHistorySource;
  reason?: string;
  actorUserId?: string | null;
  externalEventId?: string | null;
  metadata?: Record<string, unknown>;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  gracePeriodEnd?: string | null;
  providerStatus?: string | null;
  lastPaymentAt?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  clearGracePeriodEnd?: boolean;
}

/**
 * Única vía permitida para cambiar `memberships.status`. Siempre revalida
 * contra el estado actual real en base (nunca confía en un `from` provisto
 * por el llamador) y solo permite transiciones listadas en
 * `canTransitionMembershipStatus`.
 */
async function transitionMembershipStatus(params: TransitionMembershipStatusParams): Promise<Membership> {
  const current = await repoGetMembershipById(params.membershipId);
  if (!current) {
    throw new MembershipServiceError("membership_not_found", "La membresía indicada no existe.");
  }

  if (!canTransitionMembershipStatus(current.status, params.newStatus)) {
    throw new MembershipServiceError(
      "invalid_transition",
      `No se permite pasar de "${current.status}" a "${params.newStatus}".`,
    );
  }

  const nowIso = new Date().toISOString();

  try {
    return await callTransitionMembershipStatus({
      membershipId: params.membershipId,
      expectedCurrentStatus: current.status,
      newStatus: params.newStatus,
      source: params.source,
      reason: params.reason,
      actorUserId: params.actorUserId,
      externalEventId: params.externalEventId,
      metadata: params.metadata,
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
      gracePeriodEnd: params.gracePeriodEnd,
      clearGracePeriodEnd: params.clearGracePeriodEnd,
      providerStatus: params.providerStatus,
      lastPaymentAt: params.lastPaymentAt,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
      canceledAt: params.newStatus === "canceled" ? nowIso : null,
      activatedAt: params.newStatus === "authorized" || params.newStatus === "active" ? nowIso : null,
      suspendedAt: params.newStatus === "suspended" ? nowIso : null,
    });
  } catch (error) {
    translateDatabaseError(error, "transitionMembershipStatus");
  }
}

/** Usada por `/account/membership`: resuelve la sesión, busca la membresía del usuario y evalúa su acceso. */
async function evaluateCurrentUserMembership(): Promise<{
  membership: Membership | null;
  access: MembershipAccessDecision;
}> {
  const { user } = await requireActiveUser();
  const membership = await repoGetCurrentMembershipForUser(user.id);

  const access = evaluateMembershipAccess(
    membership
      ? {
          status: membership.status,
          currentPeriodStart: membership.currentPeriodStart,
          currentPeriodEnd: membership.currentPeriodEnd,
          gracePeriodEnd: membership.gracePeriodEnd,
        }
      : null,
  );

  return { membership, access };
}

/**
 * Cancela la membresía vigente del usuario autenticado. Nunca acepta un
 * `membershipId` provisto por el navegador (Etapa 4, sección 22): siempre
 * resuelve la propia membresía del usuario en sesión. No se marca `canceled`
 * localmente hasta que Mercado Pago confirma la cancelación — evita dejar el
 * estado local desincronizado si la llamada al proveedor falla a mitad de
 * camino.
 */
async function cancelCurrentMembership(): Promise<Membership> {
  const { user } = await requireActiveUser();
  const membership = await repoGetCurrentMembershipForUser(user.id);

  if (!membership) {
    throw new MembershipServiceError("membership_not_found", "No tenés una membresía vigente para cancelar.");
  }
  if (!membership.provider || !membership.providerSubscriptionId) {
    throw new MembershipServiceError(
      "membership_not_eligible",
      "Esta membresía no tiene una suscripción de proveedor asociada para cancelar.",
    );
  }
  if (!canTransitionMembershipStatus(membership.status, "canceled")) {
    throw new MembershipServiceError(
      "invalid_transition",
      `No se puede cancelar una membresía en estado "${membership.status}".`,
    );
  }

  const provider = getSubscriptionProvider();

  try {
    await provider.cancelSubscription(membership.providerSubscriptionId);
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      throw new MembershipServiceError("internal_error", "No se pudo cancelar la suscripción con el proveedor de pagos.");
    }
    throw error;
  }

  // Resincroniza contra el estado real ya confirmado por el proveedor en vez
  // de asumir "cancelled" a ciegas (mismo criterio que la reconciliación
  // administrativa — ver `POST /api/admin/memberships/:id/sync`).
  const remote = await provider.getSubscription(membership.providerSubscriptionId);

  if (remote.status !== "canceled") {
    logServerError("cancelCurrentMembership:not_yet_canceled", {
      membershipId: membership.id,
      remoteStatus: remote.rawStatus,
    });
    throw new MembershipServiceError(
      "internal_error",
      "El proveedor de pagos todavía no confirma la cancelación. Intentá de nuevo en unos minutos.",
    );
  }

  return transitionMembershipStatus({
    membershipId: membership.id,
    newStatus: "canceled",
    source: "system",
    reason: "Cancelación solicitada por el usuario desde la aplicación.",
    actorUserId: user.id,
    providerStatus: remote.rawStatus,
    cancelAtPeriodEnd: false,
  });
}

export {
  createPendingMembership,
  createAuthorizedMembership,
  createMigratedMembership,
  getMembershipById,
  getMembershipByProviderSubscriptionId,
  getCurrentMembershipForUser,
  getCurrentMembershipForEmail,
  linkMembershipToUser,
  transitionMembershipStatus,
  evaluateCurrentUserMembership,
  cancelCurrentMembership,
  ACTIVATION_ELIGIBLE_STATUSES,
};
