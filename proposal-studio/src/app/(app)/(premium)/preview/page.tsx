import type { Metadata } from "next";
import { Download } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Vista previa — Proposal Studio™",
};

export default function PreviewPage() {
  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title="Vista previa"
        description="Paso 8 — así se verá el PDF exportado. Debe coincidir exactamente con el documento final."
        breadcrumbs={[{ label: "Panel de Control", href: "/dashboard" }, { label: "Vista previa" }]}
        actions={
          <Button disabled>
            <Download className="h-4 w-4" />
            Generar PDF
          </Button>
        }
      />

      <Card className="mx-auto aspect-[210/297] w-full max-w-2xl bg-white p-16 shadow-md">
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-caption font-semibold uppercase tracking-widest text-on-surface-variant">
            Vista previa del documento
          </p>
          <h2 className="text-h2 font-bold text-on-surface">Propuesta Comercial</h2>
          <p className="text-small text-on-surface-variant">
            El motor de renderizado (render_json → PDF) se implementa en el Sprint 2.
          </p>
        </div>
      </Card>
    </ContentContainer>
  );
}
