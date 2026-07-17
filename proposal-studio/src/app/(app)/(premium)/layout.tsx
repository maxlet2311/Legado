import { redirect } from "next/navigation";

import { requireActiveMembership } from "@/lib/memberships/guard";
import { MembershipGuardError } from "@/lib/memberships/guard-errors";
import { mapMembershipErrorToRedirectPath } from "@/lib/memberships/error-mapper";

/**
 * Área premium (Etapa 5, sección 12): dashboard, propuestas, clientes, marca,
 * biblioteca y preview — todo lo que requiere una membresía con acceso
 * vigente, además de sesión activa (ya cubierto por el layout padre
 * `(app)/layout.tsx`). No envuelve `/account/membership`, que vive como
 * hermano fuera de este grupo — de lo contrario un usuario sin membresía
 * sería redirigido en loop hacia una página que el propio redirect apunta.
 *
 * En modo `off`/`audit` el guard nunca lanza por membresía (ver
 * `src/lib/memberships/guard.ts`), así que esto es un no-op funcional hasta
 * que se configure `MEMBERSHIP_ENFORCEMENT_MODE=enforce`. Los Server Actions
 * y Route Handlers de esta área validan el guard de forma independiente
 * (sección 11: nunca depender solo del layout/middleware).
 */
export default async function PremiumLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireActiveMembership({ surface: "app.premium.layout" });
    return <>{children}</>;
  } catch (error) {
    if (error instanceof MembershipGuardError) {
      redirect(mapMembershipErrorToRedirectPath(error));
    }
    throw error;
  }
}
