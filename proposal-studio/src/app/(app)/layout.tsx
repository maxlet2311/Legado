import { AppShell } from "@/components/layout/app-shell";
import { requireActiveUser } from "@/lib/auth/authorization-guards";

/**
 * Área autenticada general (Etapa 5, sección 12): sesión + perfil activo,
 * sin membresía. Cubre `/account/membership` (debe seguir accesible para un
 * usuario autenticado sin membresía vigente, para que pueda ver su estado y
 * regularizarlo) además de todo lo premium, que a su vez está protegido por
 * el layout anidado `(premium)/layout.tsx` con `requireActiveMembership`.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireActiveUser();

  return <AppShell profile={profile}>{children}</AppShell>;
}
