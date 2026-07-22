import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill, type ProposalStatus } from "@/components/layout/status-pill";
import { CommercialStatusPill, COMMERCIAL_STATUSES } from "@/components/layout/commercial-status-pill";
import type { CommercialStatus } from "@/types/proposal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationLink } from "@/components/ui/pagination-link";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { measurePerformance } from "@/lib/utils/performance";
import { ProposalFilters } from "@/app/(app)/(premium)/proposals/proposal-filters";

/** Escapa comillas para incrustar `q` de forma segura dentro de un filtro `.or()` de PostgREST (sintaxis `column.ilike."%valor%"`). */
function escapeIlikeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function singleParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export const metadata: Metadata = {
  title: "Propuestas — Proposal Studio™",
};

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Listado completo de propuestas del asesor -- acceso directo desde el menú,
 * sin pasar por el Panel de Control. Paginado server-side (mismo patrón que
 * `/clients` y `/admin/memberships`, ver `PaginationLink`): antes traía
 * todas las filas sin límite, lo que escala mal para un asesor de alto
 * volumen (~200 propuestas/año documentadas). `count: "exact"` no agrega un
 * round-trip extra — PostgREST lo devuelve en la misma respuesta que los
 * datos paginados.
 */
export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const rangeFrom = (page - 1) * PAGE_SIZE;
  const rangeTo = rangeFrom + PAGE_SIZE - 1;

  const q = singleParam(params.q);
  const statusFilter = singleParam(params.status);
  const dateFrom = singleParam(params.from);
  const dateTo = singleParam(params.to);
  const isValidCommercialStatus = (value: string): value is CommercialStatus =>
    (COMMERCIAL_STATUSES as string[]).includes(value);

  const { user } = await requireActiveUser();
  const supabase = await createClient();

  const {
    data: proposals,
    error,
    count,
  } = await measurePerformance(
    "page:proposals",
    () => {
      let query = supabase
        .from("proposals")
        .select("id, title, status, commercial_status, updated_at, created_at, clients!inner(full_name)", {
          count: "exact",
        })
        .eq("user_id", user.id);

      if (q) {
        const safeQ = escapeIlikeValue(q);
        query = query.or(`title.ilike."%${safeQ}%",clients.full_name.ilike."%${safeQ}%"`);
      }
      if (statusFilter && isValidCommercialStatus(statusFilter)) {
        query = query.eq("commercial_status", statusFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
      }

      return query.order("updated_at", { ascending: false }).range(rangeFrom, rangeTo);
    },
    { context: "/proposals" },
  );

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;
  const invalidPage = page > totalPages && count !== null && count > 0;
  const hasFilters = Boolean(q || statusFilter || dateFrom || dateTo);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (statusFilter) baseParams.set("status", statusFilter);
  if (dateFrom) baseParams.set("from", dateFrom);
  if (dateTo) baseParams.set("to", dateTo);
  function pageHref(targetPage: number): string {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(targetPage));
    return `/proposals?${p.toString()}`;
  }

  return (
    <ContentContainer>
      <PageHeader
        title="Propuestas"
        description="Todas tus propuestas, ordenadas por última edición."
        actions={
          <Button asChild>
            <Link href="/proposals/new">Nueva Propuesta</Link>
          </Button>
        }
      />

      <ProposalFilters current={{ q, status: statusFilter, from: dateFrom, to: dateTo }} />

      {error ? (
        <p className="text-small text-error">No pudimos cargar tus propuestas. Intentá de nuevo.</p>
      ) : invalidPage ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-small text-error">
          La página solicitada no existe.{" "}
          <Link href="/proposals" className="underline">
            Volver a la primera página
          </Link>
          .
        </p>
      ) : !proposals || proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "Sin resultados para estos filtros" : "Todavía no hay propuestas"}
          description={
            hasFilters
              ? "Probá con otro texto de búsqueda o ajustá los filtros."
              : "Creá tu primera propuesta comercial para verla acá."
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell>
                      <Link href={`/proposal/${proposal.id}`} className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-body font-medium text-on-surface">{proposal.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-small text-on-surface">
                      {proposal.clients?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-small text-on-surface-variant sm:table-cell">
                      {formatDate(proposal.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <CommercialStatusPill status={proposal.commercial_status as CommercialStatus} />
                        <StatusPill status={proposal.status as ProposalStatus} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-small text-on-surface-variant">
                Página {page} de {totalPages} ({count} propuesta{count === 1 ? "" : "s"})
              </p>
              <div className="flex gap-2">
                <PaginationLink href={pageHref(page - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </PaginationLink>
                <PaginationLink href={pageHref(page + 1)} disabled={page >= totalPages}>
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
