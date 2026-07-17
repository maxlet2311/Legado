import type { Metadata } from "next";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { listAllPlans } from "@/lib/memberships/repository";
import { MigrateUsersForm } from "@/app/(app)/admin/memberships/migrate-users/migrate-users-form";

export const metadata: Metadata = { title: "Migrar usuarios existentes — Admin" };

export default async function MigrateUsersPage() {
  const plans = await listAllPlans();

  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title="Migrar usuarios existentes"
        description="Otorga una membresía `authorized` a usuarios activos que todavía no tienen ninguna — necesario antes de pasar a `enforce`. Nunca crea pagos ficticios ni IDs de Mercado Pago."
        breadcrumbs={[{ label: "Admin" }, { label: "Membresías", href: "/admin/memberships" }, { label: "Migrar usuarios" }]}
      />
      <MigrateUsersForm plans={plans.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))} />
    </ContentContainer>
  );
}
