import {
  MembershipGuardError,
  MembershipRequiredError,
  MembershipPastDueError,
  MembershipSuspendedError,
  MembershipDataInconsistentError,
  MembershipServiceUnavailableError,
} from "./guard-errors.ts";

/**
 * Mapper único de errores de membresía (Etapa 5, sección 5): ningún llamador
 * decide por su cuenta a qué ruta redirigir o qué código HTTP devolver —
 * todos pasan por acá. Nunca expone IDs internos, SQL, nombres de policies,
 * ni el estado técnico crudo del proveedor.
 */

/** Sección 4: redirecciones sugeridas para navegación de páginas. */
function mapMembershipErrorToRedirectPath(error: MembershipGuardError): string {
  if (error instanceof MembershipPastDueError) {
    return "/account/membership?payment=required";
  }
  if (error instanceof MembershipSuspendedError) {
    return "/account/membership?status=suspended";
  }
  if (error instanceof MembershipDataInconsistentError) {
    return "/account/membership?status=inconsistent";
  }
  if (error instanceof MembershipServiceUnavailableError) {
    return "/account/membership?status=unavailable";
  }
  if (error instanceof MembershipRequiredError) {
    switch (error.reason) {
      case "no_membership":
      case "canceled":
      case "expired":
        return "/planes";
      case "not_started":
        return "/suscripcion/resultado";
      case "paused":
        return "/account/membership?status=paused";
      default:
        return "/account/membership?status=required";
    }
  }
  return "/account/membership";
}

interface MembershipHttpErrorBody {
  status: number;
  error: string;
  code: string;
}

/** Sección 4: códigos HTTP para Route Handlers/APIs. `402` se documenta explícitamente como convención interna (no hay uno más específico en el patrón HTTP estándar para "pago de membresía requerido"). */
function mapMembershipErrorToHttpResponse(error: MembershipGuardError): MembershipHttpErrorBody {
  if (error instanceof MembershipSuspendedError) {
    return { status: 403, error: "Tu membresía se encuentra suspendida.", code: error.code };
  }
  if (error instanceof MembershipPastDueError) {
    return { status: 402, error: "Tu membresía tiene un pago pendiente de regularización.", code: error.code };
  }
  if (error instanceof MembershipDataInconsistentError) {
    return { status: 409, error: "El estado de tu membresía es inconsistente. Contactá a soporte.", code: error.code };
  }
  if (error instanceof MembershipServiceUnavailableError) {
    return { status: 503, error: "El servicio de membresías no está disponible. Intentá de nuevo en unos minutos.", code: error.code };
  }
  if (error instanceof MembershipRequiredError) {
    return { status: 402, error: "Necesitás una membresía activa para esta operación.", code: error.code };
  }
  return { status: 500, error: "Ocurrió un error inesperado.", code: "membership_unknown_error" };
}

/** Mismo mapeo que las APIs pero como mensaje plano, para el patrón `ActionResult<{ error?: string }>` de las Server Actions. */
function mapMembershipErrorToActionMessage(error: unknown): string | null {
  if (!(error instanceof MembershipGuardError)) {
    return null;
  }
  return mapMembershipErrorToHttpResponse(error).error;
}

export { mapMembershipErrorToRedirectPath, mapMembershipErrorToHttpResponse, mapMembershipErrorToActionMessage };
export type { MembershipHttpErrorBody };
