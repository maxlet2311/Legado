import type { SnapshotBrand, SnapshotNarrative } from "@/lib/render/types";
import { toParagraphs } from "@/lib/render/formatters";
import { DocumentSection } from "@/components/document/document-section";

const DEFAULT_CLOSING = "Coordinemos una reunión para resolver dudas y avanzar juntos con la estrategia propuesta.";

function ContactChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "9pt",
        color: "var(--ps-text-on-primary)",
        background: "color-mix(in srgb, var(--ps-primary) 85%, black)",
        padding: "2mm 4mm",
        borderRadius: "20px",
        marginRight: "2.5mm",
        marginBottom: "2.5mm",
      }}
    >
      {label}
    </span>
  );
}

/**
 * Cierre comercial (brief § 10): síntesis + próximo paso + datos de contacto
 * del asesor como llamados a la acción editoriales (nunca botones falsos en
 * el PDF — 06_PDF_ENGINE.md § Cierre).
 */
function AdvisorSection({ narrative, brand }: { narrative: SnapshotNarrative | null; brand: SnapshotBrand | null }) {
  const closingParagraphs = toParagraphs(narrative?.final_message) || [];
  const closing = closingParagraphs.length > 0 ? closingParagraphs : [DEFAULT_CLOSING];

  const contactChips = brand
    ? [
        brand.phone,
        brand.whatsapp ? `WhatsApp ${brand.whatsapp}` : null,
        brand.email,
        brand.website,
      ].filter((value): value is string => Boolean(value))
    : [];

  return (
    <DocumentSection eyebrow="Sigamos avanzando" title="Próximos pasos">
      <div
        style={{
          background: "var(--ps-primary)",
          color: "var(--ps-text-on-primary)",
          borderRadius: "10px",
          padding: "8mm 9mm",
        }}
      >
        {closing.map((paragraph, index) => (
          <p key={index} style={{ fontSize: "12pt", lineHeight: 1.6, margin: index === closing.length - 1 ? 0 : "0 0 3mm 0" }}>
            {paragraph}
          </p>
        ))}
      </div>

      {brand ? (
        <div style={{ marginTop: "6mm" }}>
          <p style={{ margin: "0 0 2mm 0", fontWeight: 700, fontSize: "10.5pt", color: "#1B211C" }}>{brand.advisor_name}</p>
          {brand.license_number ? (
            <p style={{ margin: "0 0 3mm 0", color: "#5A6259", fontSize: "9pt" }}>Matrícula {brand.license_number}</p>
          ) : null}
          {contactChips.length > 0 ? <div>{contactChips.map((chip) => <ContactChip key={chip} label={chip} />)}</div> : null}
        </div>
      ) : null}
    </DocumentSection>
  );
}

export { AdvisorSection };
