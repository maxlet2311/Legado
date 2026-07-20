import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill, type ProposalStatus } from "@/components/layout/status-pill";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Documento
                  </th>
                  <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Cliente
                  </th>
                  <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Fecha
                  </th>
                  <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {proposals.map((proposal) => (
                  <tr key={proposal.id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-8 py-5">
                      <Link href={`/proposal/${proposal.id}`} className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-body font-medium text-on-surface">{proposal.title}</span>
                      </Link>
                    </td>
                    <td className="px-8 py-5 text-small text-on-surface">
                      {proposal.clients?.full_name ?? "—"}
                    </td>
                    <td className="px-8 py-5 text-small text-on-surface-variant">
                      {formatDate(proposal.updated_at)}
                    </td>
                    <td className="px-8 py-5">
                      <StatusPill status={proposal.status as ProposalStatus} />
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
