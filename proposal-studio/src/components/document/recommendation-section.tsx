import type { SnapshotNarrative } from "@/lib/render/types";
import { toParagraphs } from "@/lib/render/formatters";
import { DocumentSection } from "@/components/document/document-section";

/** Estrategia (06_PDF_ENGINE.md § Estrategia): conecta diagnóstico con alternativas. */
function RecommendationSection({ narrative }: { narrative: SnapshotNarrative | null }) {
  const paragraphs = toParagraphs(narrative?.recommended_strategy);
  if (paragraphs.length === 0) return null;

  return (
    <DocumentSection eyebrow="Nuestra recomendación" title="Estrategia">
      <div style={{ borderLeft: "2px solid var(--ps-secondary)", paddingLeft: "5mm" }}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} style={{ fontSize: "11pt", lineHeight: 1.6, margin: "0 0 3mm 0", whiteSpace: "pre-wrap" }}>
            {paragraph}
          </p>
        ))}
      </div>
    </DocumentSection>
  );
}

export { RecommendationSection };
