import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminAuditEvents } from "@/lib/admin/audit-queries";
import { AuditFilters } from "@/app/(app)/admin/audit/audit-filters";
import { AuditTable } from "@/app/(app)/admin/audit/audit-table";

export const metadata: Metadata = { title: "Auditoría — Admin" };

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

/** Convierte una fecha `YYYY-MM-DD` de `<input type="date">` a rango ISO inclusivo. */
function toStartOfDayIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toEndOfDayIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const actor = single(params.actor);
  const action = single(params.action);
  const entityType = single(params.entityType);
  const entityId = single(params.entityId);
  const from = single(params.from);
  const to = single(params.to);

  const { items, total } = await listAdminAuditEvents({
    page,
    pageSize: PAGE_SIZE,
    actorUserId: actor,
    action,
    entityType,
    entityId,
    dateFrom: toStartOfDayIso(from),
    dateTo: toEndOfDayIso(to),
  });

  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  function buildPageHref(target: number) {
    const next = new URLSearchParams();
    if (actor) next.set("actor", actor);
    if (action) next.set("action", action);
    if (entityType) next.set("entityType", entityType);
    if (entityId) next.set("entityId", entityId);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    next.set("page", String(target));
    return `/admin/audit?${next.toString()}`;
  }

  return (
    <ContentContainer className="max-w-360">
      <PageHeader
        title="Auditoría"
        description="Historial append-only de acciones administrativas sobre membresías, planes e invitaciones. Platform Owner."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Auditoría" }]}
      />

      <AuditFilters current={{ actor, action, entityType, entityId, from, to }} />

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No hay eventos que coincidan con los filtros"
            description="Probá ajustar los filtros o el rango de fechas."
          />
        ) : (
          <>
            <AuditTable items={items} />

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2">
                <p className="text-small text-on-surface-variant">
                  Página {page} de {totalPages} ({total} evento{total === 1 ? "" : "s"})
                </p>
                <div className="flex gap-2">
                  <Link
                    href={page > 1 ? buildPageHref(page - 1) : "#"}
                    aria-disabled={page <= 1}
                    className={`flex items-center gap-1 rounded-md border border-outline-variant px-4 py-2 text-small font-medium ${
                      page <= 1 ? "pointer-events-none opacity-40" : "text-on-surface hover:border-primary hover:text-primary"
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Link>
                  <Link
                    href={page < totalPages ? buildPageHref(page + 1) : "#"}
                    aria-disabled={page >= totalPages}
                    className={`flex items-center gap-1 rounded-md border border-outline-variant px-4 py-2 text-small font-medium ${
                      page >= totalPages ? "pointer-events-none opacity-40" : "text-on-surface hover:border-primary hover:text-primary"
                    }`}
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ContentContainer>
  );
}
