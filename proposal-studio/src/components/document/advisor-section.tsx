import type { SnapshotBrand, SnapshotNarrative } from "@/lib/render/types";
import { toParagraphs } from "@/lib/render/formatters";
import { DocumentSection } from "@/components/document/document-section";

const DEFAULT_CLOSING = "Coordinemos una reunión para resolver dudas y avanzar juntos con la estrategia propuesta.";

/** Próximos pasos + datos del asesor (06_PDF_ENGINE.md § Próximos pasos). */
function AdvisorSection({ narrative, brand }: { narrative: SnapshotNarrative | null; brand: SnapshotBrand | null }) {
  const closingParagraphs = toParagraphs(narrative?.final_message) || [];
  const closing = closingParagraphs.length > 0 ? closingParagraphs : [DEFAULT_CLOSING];

  return (
    <DocumentSection eyebrow="Sigamos avanzando" title="Próximos pasos">
      {closing.map((paragraph, index) => (
        <p key={index} style={{ fontSize: "11pt", lineHeight: 1.6, margin: "0 0 3mm 0" }}>
          {paragraph}
        </p>
      ))}

      {brand ? (
        <div style={{ marginTop: "8mm", paddingTop: "5mm", borderTop: "1px solid #DEDCCF", fontSize: "9.5pt" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{brand.advisor_name}</p>
          {brand.license_number ? <p style={{ margin: 0, color: "#5A6259" }}>Matrícula {brand.license_number}</p> : null}
          {brand.phone ? <p style={{ margin: 0, color: "#5A6259" }}>{brand.phone}</p> : null}
          {brand.email ? <p style={{ margin: 0, color: "#5A6259" }}>{brand.email}</p> : null}
          {brand.website ? <p style={{ margin: 0, color: "#5A6259" }}>{brand.website}</p> : null}
        </div>
      ) : null}
    </DocumentSection>
  );
}

export { AdvisorSection };
