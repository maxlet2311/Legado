import "server-only";

import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { isPlatformOwner } from "@/lib/auth/authorization";
import type { Profile } from "@/lib/auth/session";
import { getCurrentMembershipForUser } from "@/lib/memberships/service";
import { evaluateMembershipAccess } from "@/lib/memberships/access";
import type { Membership, MembershipAccessDecision } from "@/lib/memberships/types";
import { getMembershipEnforcementMode } from "@/lib/memberships/config";
import { logMembershipAuditEvent, type MembershipBypassReason } from "@/lib/memberships/audit-log";
import {
  MembershipRequiredError,
  MembershipPastDueError,
  MembershipSuspendedError,
  MembershipDataInconsistentError,
  MembershipServiceUnavailableError,
} from "@/lib/memberships/guard-errors";

interface ActiveMembershipContext {
  user: Awaited<ReturnType<typeof requireActiveUser>>["user"];
  profile: Profile;
  /**
   * `null` en modo `off`, ante bypass del Platform Owner, o cuando el
   * usuario nunca contrató (sección 3 del alcance de Etapa 5 sugiere un tipo
   * no-nulo; se relaja deliberadamente acá porque el modo de transición
   * segura — objetivo central de esta etapa — exige poder representar
   * "todavía no hay membresía que evaluar" sin lanzar).
   */
  membership: Membership | null;
  access: MembershipAccessDecision;
}

/** Decisión sintética usada en modo `off` y en el bypass del Platform Owner: nunca proviene de datos reales de membresía. */
const PASS_THROUGH_ACCESS: MembershipAccessDecision = { allowed: true, level: "full", reason: "active" };

interface RequireActiveMembershipOptions {
  /** Identifica la superficie en los logs de auditoría (sección 20), ej. `"proposal.create"`, `"pdf.generate"`. */
  surface?: string;
  /**
   * Bypass explícito y centralizado (sección 10) — nunca activar por un
   * parámetro que llegue del cliente. Reservado a superficies de
   * plataforma/sistema, no a funciones comerciales normales usadas por el
   * Platform Owner como si fuera un usuario pagante.
   */
  allowPlatformOwnerBypass?: boolean;
  bypassReason?: MembershipBypassReason;
}

/** Traduce el estado real de la membresía a la excepción tipada correspondiente (sección 5: nunca por comparación de strings de mensaje). */
function toGuardError(membership: Membership, access: MembershipAccessDecision): Error {
  switch (membership.status) {
    case "suspended":
      return new MembershipSuspendedError();
    case "past_due":
    case "grace_period":
      return new MembershipPastDueError();
    case "pending":
    case "paused":
    case "canceled":
    case "expired":
      return new MembershipRequiredError(access.reason);
    case "active":
    case "authorized":
      // Solo puede llegar acá con `access.allowed === false` por período vencido.
      return new MembershipRequiredError("period_expired");
    default:
      return new MembershipDataInconsistentError();
  }
}

/**
 * Guard central de acceso premium (Etapa 5). Se apoya en `requireActiveUser`
 * (sesión + perfil + `is_active`, sin cambios) y agrega la validación de
 * membresía respetando `MEMBERSHIP_ENFORCEMENT_MODE`:
 *
 * - `off`: no consulta `memberships` en absoluto — devuelve un acceso
 *   sintético "full". Único modo seguro si las tablas de membresía todavía
 *   no existen y se necesita apagar por completo esta capa.
 * - `audit`: consulta y calcula la decisión real, la registra, pero **nunca
 *   lanza** por una membresía inválida ni por una falla del servicio —
 *   devuelve igual un contexto utilizable (default hasta completar la
 *   migración de Etapas 2–4).
 * - `enforce`: lanza el error tipado correspondiente cuando el acceso no
 *   está permitido, o `MembershipServiceUnavailableError` si la consulta
 *   falla (fail-closed: una falla del servicio en `enforce` nunca se trata
 *   como acceso concedido).
 */
async function requireActiveMembership(options: RequireActiveMembershipOptions = {}): Promise<ActiveMembershipContext> {
  const { user, profile } = await requireActiveUser();
  const surface = options.surface ?? "unknown";
  const mode = getMembershipEnforcementMode();

  if (options.allowPlatformOwnerBypass && isPlatformOwner(profile)) {
    logMembershipAuditEvent({
      userId: user.id,
      surface,
      level: "full",
      decisionAllowed: true,
      reason: "platform_owner_bypass",
      enforcementMode: mode,
      bypassReason: options.bypassReason ?? "platform_owner_system_access",
    });
    return { user, profile, membership: null, access: PASS_THROUGH_ACCESS };
  }

  if (mode === "off") {
    return { user, profile, membership: null, access: PASS_THROUGH_ACCESS };
  }

  let membership: Membership | null;
  try {
    membership = await getCurrentMembershipForUser(user.id);
  } catch (error) {
    logMembershipAuditEvent({
      userId: user.id,
      surface,
      level: "unknown",
      decisionAllowed: mode === "audit",
      reason: "service_unavailable",
      enforcementMode: mode,
    });
    if (mode === "enforce") {
      throw new MembershipServiceUnavailableError(error);
    }
    // audit: nunca bloquea por una falla del servicio de membresías.
    return { user, profile, membership: null, access: PASS_THROUGH_ACCESS };
  }

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

  logMembershipAuditEvent({
    userId: user.id,
    surface,
    membershipId: membership?.id ?? null,
    status: membership?.status ?? null,
    level: access.level,
    decisionAllowed: access.allowed,
    reason: access.reason,
    enforcementMode: mode,
  });

  if (access.allowed) {
    return { user, profile, membership, access };
  }

  if (mode === "audit") {
    // Nunca bloquea: se devuelve igual el contexto (con `access.allowed === false`
    // visible para quien quiera reaccionar), pero no se lanza.
    return { user, profile, membership, access };
  }

  throw membership ? toGuardError(membership, access) : new MembershipRequiredError("no_membership");
}

export { requireActiveMembership, PASS_THROUGH_ACCESS };
export type { ActiveMembershipContext, RequireActiveMembershipOptions };
