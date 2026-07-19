import type { Metadata } from "next";
import { Layers } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { listAllPlans } from "@/lib/memberships/repository";
import { PlanDialog, ToggleActiveButton, SyncProviderButton } from "@/app/(app)/admin/membership-plans/plan-dialogs";

export const metadata: Metadata = { title: "Planes de membresía — Admin" };

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

export default async function AdminMembershipPlansPage() {
  const plans = await listAllPlans();

  return (
    <ContentContainer className="max-w-360">
      <PageHeader
        title="Planes de membresía"
        description="Catálogo comercial de planes — solo los activos y con proveedor configurado aparecen en /planes."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Planes" }]}
        actions={<PlanDialog mode="create" />}
      />

      {plans.length === 0 ? (
        <EmptyState icon={Layers} title="Todavía no hay planes" description="Creá el primer plan comercial." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Nombre</th>
                  <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Código</th>
                  <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Precio</th>
                  <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Proveedor</th>
                  <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Estado</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-surface-container-low">
                    <td className="px-6 py-4 text-small font-medium text-on-surface">{plan.name}</td>
                    <td className="px-6 py-4 text-small text-on-surface-variant">{plan.code}</td>
                    <td className="px-6 py-4 text-small text-on-surface-variant">{formatPrice(plan.price, plan.currency)}</td>
                    <td className="px-6 py-4 text-small text-on-surface-variant">
                      {plan.provider && plan.providerPlanId ? (
                        plan.provider
                      ) : (
                        <span className="italic text-warning">sin configurar</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={plan.isActive ? "success" : "draft"}>{plan.isActive ? "Activo" : "Inactivo"}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <SyncProviderButton
                          planId={plan.id}
                          provider={plan.provider}
                          hasProviderPlanId={Boolean(plan.providerPlanId)}
                        />
                        <PlanDialog mode="edit" plan={plan} />
                        <ToggleActiveButton planId={plan.id} isActive={plan.isActive} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ContentContainer>
  );
}
