import type { SnapshotBenefit } from "@/lib/render/types";
import { DocumentSection } from "@/components/document/document-section";

/** Beneficios (06_PDF_ENGINE.md § Beneficios): Cards breves, sin párrafos largos. */
function BenefitsSection({ benefits }: { benefits: SnapshotBenefit[] }) {
  if (benefits.length === 0) return null;
  const sorted = [...benefits].sort((a, b) => a.display_order - b.display_order);

  return (
    <DocumentSection eyebrow="Lo que incluye" title="Beneficios">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5mm" }}>
        {sorted.map((benefit) => (
          <div
            key={benefit.id}
            className="ps-card"
            style={{ border: "1px solid #DEDCCF", borderRadius: "6px", padding: "5mm" }}
          >
            <p style={{ fontSize: "8pt", color: "var(--ps-accent)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2mm 0" }}>
              {benefit.icon}
            </p>
            <h3 style={{ fontSize: "10.5pt", margin: "0 0 1.5mm 0" }}>{benefit.title}</h3>
            <p style={{ fontSize: "9pt", lineHeight: 1.45, margin: 0, color: "#3A413C" }}>{benefit.description}</p>
          </div>
        ))}
      </div>
    </DocumentSection>
  );
}

export { BenefitsSection };
