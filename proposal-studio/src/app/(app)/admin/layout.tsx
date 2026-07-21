import type { ReactNode } from "react";
import Link from "next/link";

import { ContentContainer } from "@/components/layout/content-container";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { measurePerformance } from "@/lib/utils/performance";

const ADMIN_NAV = [
  { label: "Membresías", href: "/admin/memberships" },
  { label: "Invitaciones", href: "/admin/invitations" },
  { label: "Auditoría", href: "/admin/audit" },
  { label: "Pagos", href: "/admin/payments" },
  { label: "Planes", href: "/admin/membership-plans" },
  { label: "Salud", href: "/admin/memberships/health" },
  { label: "Migrar usuarios", href: "/admin/memberships/migrate-users" },
  { label: "Configuración", href: "/admin/settings" },
];

/**
 * Layout raíz de `/admin/**`. `requirePlatformOwner()` corre acá (gatea toda
 * la sección) y de nuevo en cada Server Action/Route Handler individual
 * (defensa en profundidad, mismo criterio que el resto de la app — ver
 * `authorization-guards.ts`).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await measurePerformance("layout:admin", () => requirePlatformOwner());
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return (
        <ContentContainer className="py-20">
          <EmptyState
            title="No tenés permiso para acceder a esta sección"
            description="Esta área es exclusiva del propietario de la plataforma."
          />
        </ContentContainer>
      );
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      <div className="border-b border-outline-variant bg-surface">
        <nav className="mx-auto flex max-w-360 items-center gap-6 overflow-x-auto px-6 py-4">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-small font-medium text-on-surface-variant hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="px-6 py-10">{children}</div>
    </div>
  );
}
