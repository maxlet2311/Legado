const ENFORCEMENT_MODES = ["off", "audit", "enforce"] as const;
type MembershipEnforcementMode = (typeof ENFORCEMENT_MODES)[number];

const DEFAULT_MODE: MembershipEnforcementMode = "audit";

let warnedInvalidOnce = false;
let warnedOffOnce = false;

/**
 * Modo de transición del guard de membresía (Etapa 5, sección 6). Deliberadamente
 * server-only (nunca `NEXT_PUBLIC_`): no debe poder inspeccionarse ni
 * manipularse desde el bundle cliente.
 *
 * - `off`: solo `requireActiveUser` (sesión + perfil activo). Ninguna
 *   consulta a `memberships` — sirve para desarrollo o como interruptor de
 *   emergencia si el servicio de membresías está caído. Nunca debe ser el
 *   default silencioso: genera una advertencia server-side.
 * - `audit` (default hasta completar la migración, sección 22): calcula la
 *   decisión real de acceso y la registra, pero **nunca bloquea** — ni a
 *   usuarios sin membresía ni ante una falla del servicio. Es el modo seguro
 *   mientras las tablas de membresía no estén aplicadas remotamente.
 * - `enforce`: aplica el bloqueo real. Requiere que las migraciones de
 *   Etapas 2–4 ya estén aplicadas y los usuarios existentes migrados (ver
 *   `src/lib/memberships/user-migration.ts`).
 */
function getMembershipEnforcementMode(): MembershipEnforcementMode {
  const raw = process.env.MEMBERSHIP_ENFORCEMENT_MODE?.trim().toLowerCase();

  if (!raw) {
    return DEFAULT_MODE;
  }

  if (!ENFORCEMENT_MODES.includes(raw as MembershipEnforcementMode)) {
    if (process.env.NODE_ENV === "production") {
      // Nunca se permite un valor inválido en producción: falla cerrado hacia
      // el modo seguro (`audit`) en vez de arriesgar un `enforce` accidental
      // por un typo en la variable de entorno.
      if (!warnedInvalidOnce) {
        warnedInvalidOnce = true;
        console.error(
          `[memberships] MEMBERSHIP_ENFORCEMENT_MODE="${raw}" no es válido en producción. Usando "${DEFAULT_MODE}" como fallback seguro.`,
        );
      }
      return DEFAULT_MODE;
    }
    if (!warnedInvalidOnce) {
      warnedInvalidOnce = true;
      console.warn(`[memberships] MEMBERSHIP_ENFORCEMENT_MODE="${raw}" no es válido. Usando "${DEFAULT_MODE}".`);
    }
    return DEFAULT_MODE;
  }

  const mode = raw as MembershipEnforcementMode;

  if (mode === "off" && !warnedOffOnce) {
    warnedOffOnce = true;
    console.warn(
      "[memberships] MEMBERSHIP_ENFORCEMENT_MODE=off: el acceso premium NO valida membresía, solo sesión activa. " +
        "Uso exclusivo para desarrollo o emergencia — nunca dejar así en producción de forma permanente.",
    );
  }

  return mode;
}

export { getMembershipEnforcementMode, ENFORCEMENT_MODES };
export type { MembershipEnforcementMode };
