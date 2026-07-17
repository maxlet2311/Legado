import type { MembershipAccessReason } from "@/lib/memberships/types";

/** Base común: nunca exponer `.message` crudo al cliente — usar siempre `error-mapper.ts`. */
abstract class MembershipGuardError extends Error {
  abstract readonly code: string;
  readonly reason: MembershipAccessReason | "service_unavailable" | "data_inconsistent";

  constructor(message: string, reason: MembershipGuardError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

/** Sin membresía, `pending`, `paused`, `canceled`, `expired`, o período vencido. */
class MembershipRequiredError extends MembershipGuardError {
  readonly code = "membership_required";
  constructor(reason: MembershipAccessReason) {
    super(`Acceso premium requerido (razón: ${reason}).`, reason);
  }
}

/** `past_due`/`grace_period` sin período de gracia vigente: pago necesario para continuar. */
class MembershipPastDueError extends MembershipGuardError {
  readonly code = "membership_past_due";
  constructor() {
    super("El pago de la membresía está pendiente de regularización.", "payment_required");
  }
}

/** `suspended`. */
class MembershipSuspendedError extends MembershipGuardError {
  readonly code = "membership_suspended";
  constructor() {
    super("La membresía se encuentra suspendida.", "suspended");
  }
}

/** Estado/fechas de la membresía no encajan en ningún caso conocido (fail-closed, nunca se otorga acceso). */
class MembershipDataInconsistentError extends MembershipGuardError {
  readonly code = "membership_data_inconsistent";
  constructor() {
    super("El estado de la membresía es inconsistente.", "data_inconsistent");
  }
}

/** La membresía no pudo consultarse (tabla inexistente, error de red/Supabase). Solo se lanza en modo `enforce`. */
class MembershipServiceUnavailableError extends MembershipGuardError {
  readonly code = "membership_service_unavailable";
  constructor(cause?: unknown) {
    super("El servicio de membresías no está disponible temporalmente.", "service_unavailable");
    this.cause = cause;
  }
}

export {
  MembershipGuardError,
  MembershipRequiredError,
  MembershipPastDueError,
  MembershipSuspendedError,
  MembershipDataInconsistentError,
  MembershipServiceUnavailableError,
};
