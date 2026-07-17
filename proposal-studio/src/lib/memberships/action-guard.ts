import "server-only";

import { requireActiveMembership } from "@/lib/memberships/guard";
import type { ActiveMembershipContext, RequireActiveMembershipOptions } from "@/lib/memberships/guard";
import { MembershipGuardError } from "@/lib/memberships/guard-errors";
import { mapMembershipErrorToActionMessage } from "@/lib/memberships/error-mapper";

type MembershipGuardOutcome =
  | { ok: true; context: ActiveMembershipContext }
  | { ok: false; error: string };

/**
 * Envoltorio de `requireActiveMembership` para Server Actions (Etapa 5,
 * sección 9): las Actions no deben lanzar hacia el cliente ni depender de un
 * redirect como única respuesta (sección 4) — devuelven un resultado tipado
 * que el llamador puede insertar tal cual en su `ActionResult` existente
 * (todos usan `{ error?: string, ... }` con el resto de campos opcionales,
 * así que `{ error }` siempre es asignable).
 *
 * Cualquier error que no sea de membresía (ej. la señal interna de
 * `redirect()` de Next lanzada por `requireActiveUser` ante sesión ausente)
 * se re-lanza sin tocar — nunca se convierte silenciosamente en `{ error }`.
 */
async function requireActiveMembershipForAction(
  options: RequireActiveMembershipOptions = {},
): Promise<MembershipGuardOutcome> {
  try {
    const context = await requireActiveMembership(options);
    return { ok: true, context };
  } catch (error) {
    const message = mapMembershipErrorToActionMessage(error);
    if (message === null || !(error instanceof MembershipGuardError)) {
      throw error;
    }
    return { ok: false, error: message };
  }
}

export { requireActiveMembershipForAction };
export type { MembershipGuardOutcome };
