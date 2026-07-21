import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill, type ProposalStatus } from "@/components/layout/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";

export const metadata: Metadata = {
  title: "Propuestas — Proposal Studio™",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Listado completo de propuestas del asesor -- acceso directo desde el menú, sin pasar por el Panel de Control. */
export default async function ProposalsPage() {
  const { user } = await requireActiveUser();
  const supabase = await createClient();

  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("id, title, status, updated_at, clients(full_name)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

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
      ) : !proposals || proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Todavía no hay propuestas"
          description="Creá tu primera propuesta comercial para verla acá."
        />
      ) : (
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
      )}
    </ContentContainer>
  );
}
