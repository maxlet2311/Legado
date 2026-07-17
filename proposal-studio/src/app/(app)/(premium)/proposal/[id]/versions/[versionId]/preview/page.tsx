import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { buildDocumentSnapshot } from "@/lib/render/build-snapshot";
import { RenderDocument } from "@/lib/render/render-document";
import { formatDateTime } from "@/lib/render/formatters";
import { PreviewActions } from "@/app/(app)/(premium)/proposal/[id]/versions/[versionId]/preview/preview-actions";

export const metadata: Metadata = {
  title: "Preview de versión — Proposal Studio™",
};

/**
 * Preview autenticado de una versión inmutable. Solo lee `proposal_versions`
 * (nunca tablas vivas) y respeta RLS + ownership explícita — nadie más que el
 * dueño de la propuesta puede llegar a esta ruta con datos ajenos.
 */
export default async function VersionPreviewPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const { id, versionId } = await params;
  const { user } = await requireActiveUser();
  const supabase = await createClient();

  const { data: versionRow } = await supabase
    .from("proposal_versions")
    .select("id, proposal_id, version_number, created_at, render_json, user_id")
    .eq("id", versionId)
    .eq("proposal_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!versionRow) {
    notFound();
  }

  const { data: artifact } = await supabase
    .from("proposal_version_artifacts")
    .select("id")
    .eq("proposal_version_id", versionId)
    .eq("artifact_type", "pdf")
    .maybeSingle();

  const snapshot = await buildDocumentSnapshot(supabase, versionRow);

  return (
    <ContentContainer className="max-w-full">
      <PageHeader
        title={`Versión ${snapshot.version_number}`}
        description={`Emitida el ${formatDateTime(snapshot.issued_at)} · ${snapshot.proposal.orientation === "landscape" ? "Horizontal" : "Vertical"}`}
        breadcrumbs={[
          { label: "Panel de Control", href: "/dashboard" },
          { label: "Propuesta", href: `/proposal/${id}` },
          { label: `Versión ${snapshot.version_number}` },
        ]}
        actions={<PreviewActions versionId={versionId} hasPdf={Boolean(artifact)} />}
      />

      <div style={{ overflowX: "auto", padding: "8px 0" }}>
        <RenderDocument snapshot={snapshot} />
      </div>
    </ContentContainer>
  );
}
