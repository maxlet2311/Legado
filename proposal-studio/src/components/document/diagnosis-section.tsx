import type { SnapshotNarrative } from "@/lib/render/types";
import { toParagraphs } from "@/lib/render/formatters";
import { DocumentSection } from "@/components/document/document-section";

function Block({ label, text }: { label: string; text: string | null | undefined }) {
  const paragraphs = toParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <div style={{ marginBottom: "6mm" }}>
      <h3 style={{ fontSize: "10.5pt", color: "var(--ps-primary)", margin: "0 0 2mm 0" }}>{label}</h3>
      {paragraphs.map((paragraph, index) => (
        <p key={index} style={{ fontSize: "10.5pt", lineHeight: 1.5, margin: "0 0 2mm 0", whiteSpace: "pre-wrap" }}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/** Diagnóstico (06_PDF_ENGINE.md § Diagnóstico): situación, riesgos, oportunidades, objetivos. */
function DiagnosisSection({ narrative }: { narrative: SnapshotNarrative | null }) {
  if (!narrative) return null;
  const hasContent = [
    narrative.current_situation,
    narrative.detected_needs,
    narrative.detected_risks,
    narrative.opportunities,
    narrative.objectives,
  ].some((value) => value && value.trim().length > 0);
  if (!hasContent) return null;

  return (
    <DocumentSection eyebrow="Comprensión de la situación" title="Diagnóstico">
      <Block label="Situación actual" text={narrative.current_situation} />
      <Block label="Necesidades detectadas" text={narrative.detected_needs} />
      <Block label="Riesgos" text={narrative.detected_risks} />
      <Block label="Oportunidades" text={narrative.opportunities} />
      <Block label="Objetivos" text={narrative.objectives} />
    </DocumentSection>
  );
}

export { DiagnosisSection };
