import type { Metadata } from "next";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { listAllPlans } from "@/lib/memberships/repository";
import { NewMembershipForm } from "@/app/(app)/admin/memberships/new/new-membership-form";

export const metadata: Metadata = { title: "Nueva membresía — Admin" };

export default async function NewMembershipPage() {
  const plans = await listAllPlans();

  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title="Nueva membresía"
        description="Alta manual fuera del checkout de Mercado Pago. Crea la membresía en estado `authorized`, nunca `active` — eso representa un pago real confirmado por el proveedor."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Membresías", href: "/admin/memberships" }, { label: "Nueva" }]}
      />
      <NewMembershipForm plans={plans.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))} />
    </ContentContainer>
  );
}
