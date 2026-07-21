import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill, type ProposalStatus } from "@/components/layout/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import {
  ArchiveButton,
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

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, title, status, client_id, orientation, clients(full_name, email)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!proposal) {
    notFound();
  }

  const { data: narrative } = await supabase
    .from("proposal_narratives")
    .select("executive_summary")
    .eq("proposal_id", proposal.id)
    .maybeSingle();

  const { data: versions } = await supabase
    .from("proposal_versions")
    .select("id, version_number, created_at, render_json")
    .eq("proposal_id", proposal.id)
    .order("version_number", { ascending: false });

  const versionIds = (versions ?? []).map((version) => version.id);
  const { data: artifacts } = versionIds.length
    ? await supabase
        .from("proposal_version_artifacts")
        .select("proposal_version_id")
        .in("proposal_version_id", versionIds)
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
