import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill, type ProposalStatus } from "@/components/layout/status-pill";
import type { CommercialStatus } from "@/types/proposal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { measurePerformance } from "@/lib/utils/performance";
import {
  ArchiveButton,
  CommercialStatusSelect,
  DuplicateButton,
  EditTitleDialog,
  OrientationToggle,
  SaveAsTemplateDialog,
} from "@/app/(app)/(premium)/proposal/[id]/proposal-actions";
import { VersionHistory } from "@/app/(app)/(premium)/proposal/[id]/version-history";

export const metadata: Metadata = {
  title: "Propuesta — Proposal Studio™",
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireActiveUser();
  const supabase = await createClient();

  // Las tres consultas son independientes entre sí: `proposal_narratives` y
  // `proposal_versions` tienen su propia policy RLS `user_id = auth.uid()`
  // (ver `supabase/migrations/20260715170015_rls_policies.sql`), no dependen
  // de que la query de `proposals` resuelva primero para estar protegidas —
  // paralelizarlas es seguro. Solo `proposal_version_artifacts` depende del
  // resultado de `versions` (necesita los ids) y queda secuencial después.
  const [{ data: proposal }, { data: narrative }, { data: versions }] = await measurePerformance(
    "page:proposal.detail",
    () =>
      Promise.all([
        measurePerformance(
          "db:proposals.get",
          () =>
            supabase
              .from("proposals")
              .select("id, title, status, commercial_status, client_id, orientation, clients(full_name, email)")
              .eq("id", id)
              .eq("user_id", user.id)
              .maybeSingle(),
          { context: "/proposal/[id]" },
        ),
        measurePerformance(
          "db:proposal_narratives.get",
          () => supabase.from("proposal_narratives").select("executive_summary").eq("proposal_id", id).maybeSingle(),
          { context: "/proposal/[id]" },
        ),
        measurePerformance(
          "db:proposal_versions.list",
          () =>
            supabase
              .from("proposal_versions")
              .select("id, version_number, created_at, render_json")
              .eq("proposal_id", id)
              .order("version_number", { ascending: false }),
          { context: "/proposal/[id]" },
        ),
      ]),
    { context: "/proposal/[id]" },
  );

  if (!proposal) {
    notFound();
  }

  const versionIds = (versions ?? []).map((version) => version.id);
  const { data: artifacts } = versionIds.length
    ? await measurePerformance(
        "db:proposal_version_artifacts.list",
        () =>
          supabase
            .from("proposal_version_artifacts")
            .select("proposal_version_id")
            .in("proposal_version_id", versionIds),
        { context: "/proposal/[id]", count: versionIds.length },
      )
    : { data: [] as { proposal_version_id: string }[] };

  const artifactVersionIds = new Set((artifacts ?? []).map((artifact) => artifact.proposal_version_id));
  const versionListItems = (versions ?? []).map((version) => ({
    id: version.id,
    version_number: version.version_number,
    created_at: version.created_at,
    render_json: version.render_json as {
      proposal?: { orientation?: string };
      template?: { title?: string } | null;
    },
    hasArtifact: artifactVersionIds.has(version.id),
  }));

  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title={proposal.title}
        description={`Cliente: ${proposal.clients?.full_name ?? "—"}`}
        breadcrumbs={[{ label: "Panel de Control", href: "/dashboard" }, { label: "Propuesta" }]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={proposal.status as ProposalStatus} />
            <CommercialStatusSelect
              proposalId={proposal.id}
              status={proposal.commercial_status as CommercialStatus}
            />
            <OrientationToggle
              proposalId={proposal.id}
              orientation={(proposal.orientation as "portrait" | "landscape") ?? "portrait"}
            />
            <Button variant="secondary" asChild>
              <Link href={`/proposal/${proposal.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Continuar edición
              </Link>
            </Button>
            <EditTitleDialog proposalId={proposal.id} currentTitle={proposal.title} />
            <SaveAsTemplateDialog proposalId={proposal.id} />
            <DuplicateButton proposalId={proposal.id} />
            <ArchiveButton proposalId={proposal.id} disabled={proposal.status === "archived"} />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Resumen ejecutivo</CardTitle>
        </CardHeader>
        <CardContent>
          {narrative?.executive_summary ? (
            <p className="text-body text-on-surface-variant">{narrative.executive_summary}</p>
          ) : (
            <EmptyState
              compact
              title="Todavía no se redactó el resumen ejecutivo."
              description="Completá la narrativa, las alternativas, los beneficios y la comparativa desde el wizard."
            />
          )}
        </CardContent>
      </Card>

      <VersionHistory proposalId={proposal.id} versions={versionListItems} />
    </ContentContainer>
  );
}
