import Link from "next/link";
import { Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/render/formatters";
import { VersionRowActions } from "@/app/(app)/(premium)/proposal/[id]/version-row-actions";

interface VersionListItem {
  id: string;
  version_number: number;
  created_at: string;
  render_json: { proposal?: { orientation?: string }; template?: { title?: string } | null };
  hasArtifact: boolean;
}

/**
 * Historial de versiones inmutables (sin editar ni eliminar). Cada fila
 * expone únicamente: número, fecha, template, orientación, estado del PDF,
 * preview, generar y descargar.
 */
function VersionHistory({ proposalId, versions }: { proposalId: string; versions: VersionListItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Versiones emitidas</CardTitle>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <EmptyState compact title="Todavía no se emitió ninguna versión." description="Emitila desde el resumen del wizard." />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {versions.map((version) => {
              const orientation = version.render_json.proposal?.orientation === "landscape" ? "Horizontal" : "Vertical";
              const templateTitle = version.render_json.template?.title ?? "Editorial Premium";

              return (
                <li key={version.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-on-surface">Versión {version.version_number}</p>
                    <p className="text-small text-on-surface-variant">
                      {formatDateTime(version.created_at)} · {templateTitle} · {orientation}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={version.hasArtifact ? "success" : "draft"}>
                      {version.hasArtifact ? "PDF generado" : "Sin PDF"}
                    </Badge>
                    <Button variant="secondary" asChild>
                      <Link href={`/proposal/${proposalId}/versions/${version.id}/preview`}>
                        <Eye className="h-4 w-4" />
                        Preview
                      </Link>
                    </Button>
                    <VersionRowActions versionId={version.id} hasPdf={version.hasArtifact} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export { VersionHistory };
export type { VersionListItem };
