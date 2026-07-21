import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ChevronLeft, ChevronRight, AlertTriangle, Download, Plus } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationLink } from "@/components/ui/pagination-link";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { listMembershipsForAdmin, listAllPlans } from "@/lib/memberships/repository";
import { evaluateMembershipAccess } from "@/lib/memberships/access";
import { MEMBERSHIP_STATUSES } from "@/lib/memberships/types";
import type { MembershipStatus } from "@/lib/memberships/types";
import { MembershipStatusBadge, formatDate, maskExternalId } from "@/app/(app)/admin/memberships/status-badge";
import { MembershipFilters } from "@/app/(app)/admin/memberships/membership-filters";

export const metadata: Metadata = { title: "Membresías — Admin" };

const PAGE_SIZE = 20;

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function single(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function AdminMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const status = single(params.status);
  const planId = single(params.plan);
  const provider = single(params.provider);
  const linkedParam = single(params.linked);
  const search = single(params.q);

  const linked = linkedParam === "linked" ? true : linkedParam === "unlinked" ? false : undefined;
  const statusFilter =
    status && (MEMBERSHIP_STATUSES as readonly string[]).includes(status) ? (status as MembershipStatus) : undefined;

  const [plans, { items, total }] = await Promise.all([
    listAllPlans(),
    listMembershipsForAdmin({
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter,
      planId,
      provider,
      linked,
      search,
    }),
  ]);

  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  function buildPageHref(target: number) {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (planId) next.set("plan", planId);
    if (provider) next.set("provider", provider);
    if (linkedParam) next.set("linked", linkedParam);
    if (search) next.set("q", search);
    next.set("page", String(target));
    return `/admin/memberships?${next.toString()}`;
  }

  return (
    <ContentContainer className="max-w-360">
      <PageHeader
        title="Membresías"
        description="Administración de membresías comerciales — Platform Owner."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Membresías" }]}
        actions={
          <div className="flex gap-2">
            <Link
              href="/admin/memberships/new"
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-small font-medium text-on-primary hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Nueva membresía
            </Link>
            <a
              href="/api/admin/exports/memberships"
              className="flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-small font-medium text-on-surface hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" /> Membresías
            </a>
            <a
              href="/api/admin/exports/history"
              className="flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-small font-medium text-on-surface hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" /> Historial
            </a>
            <a
              href="/api/admin/exports/failed-events"
              className="flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-small font-medium text-on-surface hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" /> Eventos fallidos
            </a>
          </div>
        }
      />

      <MembershipFilters
        plans={plans.map((p) => ({ id: p.id, name: p.name }))}
        current={{ status, plan: planId, provider, linked: linkedParam, q: search }}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No hay membresías que coincidan con los filtros"
          description="Probá ajustar los filtros o la búsqueda."
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acceso</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead />
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => {
                  const access = evaluateMembershipAccess({
                    status: m.status,
                    currentPeriodStart: m.currentPeriodStart,
                    currentPeriodEnd: m.currentPeriodEnd,
                    gracePeriodEnd: m.gracePeriodEnd,
                  });
                  const inconsistent =
                    (["active", "past_due", "grace_period"].includes(m.status) && !m.currentPeriodEnd) ||
                    (m.status === "grace_period" && !m.gracePeriodEnd);

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-small font-medium text-on-surface">
                        <Link href={`/admin/memberships/${m.id}`} className="hover:underline">
                          {m.email}
                        </Link>
                        {inconsistent && (
                          <span className="ml-2 inline-flex items-center gap-1 text-caption text-warning" title="Inconsistencia detectada">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-small text-on-surface-variant">
                        {m.userFullName ?? <span className="italic text-outline">sin vincular</span>}
                      </TableCell>
                      <TableCell className="text-small text-on-surface-variant">{m.planName ?? "—"}</TableCell>
                      <TableCell>
                        <MembershipStatusBadge status={m.status} />
                      </TableCell>
                      <TableCell className="text-small">
                        {access.allowed ? (
                          <span className="text-success">Permitido</span>
                        ) : (
                          <span className="text-error">Bloqueado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-small text-on-surface-variant">
                        {m.provider ?? "—"}
                        {m.providerSubscriptionId && (
                          <span className="ml-1 text-caption text-outline">({maskExternalId(m.providerSubscriptionId)})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-small text-on-surface-variant">{formatDate(m.currentPeriodEnd)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/memberships/${m.id}`}
                          className="text-small font-medium text-primary hover:underline"
                        >
                          Ver
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-small text-on-surface-variant">
                Página {page} de {totalPages} ({total} membresía{total === 1 ? "" : "s"})
              </p>
              <div className="flex gap-2">
                <PaginationLink href={buildPageHref(page - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </PaginationLink>
                <PaginationLink href={buildPageHref(page + 1)} disabled={page >= totalPages}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </div>
            </div>
          )}
        </>
      )}
    </ContentContainer>
  );
}
