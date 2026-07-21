import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill, type ProposalStatus } from "@/components/layout/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationLink } from "@/components/ui/pagination-link";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { measurePerformance } from "@/lib/utils/performance";

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
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { user } = await requireActiveUser();
  const supabase = await createClient();

  const {
    data: proposals,
    error,
    count,
  } = await measurePerformance(
    "page:proposals",
    () =>
      supabase
        .from("proposals")
        .select("id, title, status, updated_at, clients(full_name)", { count: "exact" })
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .range(from, to),
    { context: "/proposals" },
  );

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;
  const invalidPage = page > totalPages && count !== null && count > 0;

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
          title="Todavía no hay propuestas"
          description="Creá tu primera propuesta comercial para verla acá."
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
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
                    <TableCell className="text-small text-on-surface-variant">
                      {formatDate(proposal.updated_at)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={proposal.status as ProposalStatus} />
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
                <PaginationLink href={`/proposals?page=${page - 1}`} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </PaginationLink>
                <PaginationLink href={`/proposals?page=${page + 1}`} disabled={page >= totalPages}>
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
