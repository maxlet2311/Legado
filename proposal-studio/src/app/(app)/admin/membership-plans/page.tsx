import type { Metadata } from "next";
import { Layers } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
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
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="text-small font-medium text-on-surface">{plan.name}</TableCell>
                  <TableCell className="text-small text-on-surface-variant">{plan.code}</TableCell>
                  <TableCell className="text-small text-on-surface-variant">{formatPrice(plan.price, plan.currency)}</TableCell>
                  <TableCell className="text-small text-on-surface-variant">
                    {plan.provider && plan.providerPlanId ? (
                      plan.provider
                    ) : (
                      <span className="italic text-warning">sin configurar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "success" : "draft"}>{plan.isActive ? "Activo" : "Inactivo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <SyncProviderButton
                        planId={plan.id}
                        provider={plan.provider}
                        hasProviderPlanId={Boolean(plan.providerPlanId)}
                      />
                      <PlanDialog mode="edit" plan={plan} />
                      <ToggleActiveButton planId={plan.id} isActive={plan.isActive} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </ContentContainer>
  );
}
