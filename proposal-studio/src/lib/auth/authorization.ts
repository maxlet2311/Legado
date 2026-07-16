import type { Profile } from "@/lib/auth/session";

/**
 * Helpers puros de autorización (sin dependencias de servidor: se pueden
 * importar tanto desde Server Components/Actions como desde componentes
 * cliente, por ejemplo para mostrar una etiqueta de rol). Nunca reemplazan un
 * guard server-side — ver `requireAdmin`/`requirePlatformOwner` en
 * `@/lib/auth/authorization-guards`.
 *
 * `role` es la función operativa del usuario dentro del producto (hoy:
 * "admin" | "advisor"). `is_platform_owner` es ortogonal a `role`: identifica
 * al único dueño máximo de la plataforma (ver migración
 * `20260716010000_platform_owner.sql` y docs/AUTH_AND_ROLES.md). Un admin
 * operativo NO es automáticamente el platform owner.
 */
function isAdmin(profile: Profile): boolean {
  return profile.role === "admin";
}

function isPlatformOwner(profile: Profile): boolean {
  return profile.role === "admin" && profile.is_platform_owner === true;
}

function canAccessAdminArea(profile: Profile): boolean {
  return profile.is_active && profile.role === "admin";
}

/** Lanzada por `requireAdmin`/`requirePlatformOwner` cuando la sesión no cumple el guard. */
class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export { isAdmin, isPlatformOwner, canAccessAdminArea, ForbiddenError };
