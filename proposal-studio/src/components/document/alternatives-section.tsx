import type { SnapshotAlternative } from "@/lib/render/types";
import { formatCurrency } from "@/lib/render/formatters";
import { DocumentSection } from "@/components/document/document-section";

/** Alternativas (06_PDF_ENGINE.md § Alternativas / Alternativa recomendada). */
function AlternativeCard({ alternative }: { alternative: SnapshotAlternative }) {
  const monthly = formatCurrency(alternative.monthly_premium, alternative.currency);
  const insured = formatCurrency(alternative.insured_amount, alternative.currency);

  return (
    <div
      className="ps-card"
      style={{
        border: alternative.is_recommended ? "1.5px solid var(--ps-accent)" : "1px solid #DEDCCF",
        borderRadius: "6px",
        padding: "6mm",
        marginBottom: "5mm",
        position: "relative",
        background: alternative.is_recommended ? "rgba(196,151,82,0.06)" : "#FFFFFF",
      }}
    >
      {alternative.is_recommended ? (
        <span
          style={{
            position: "absolute",
            top: "-3mm",
            right: "6mm",
            background: "var(--ps-accent)",
            color: "var(--ps-text-on-accent)",
            fontSize: "7.5pt",
            padding: "1mm 3mm",
            borderRadius: "10px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {alternative.highlight_label || "Recomendada"}
        </span>
      ) : null}

      <p style={{ fontSize: "8pt", color: "#5A6259", margin: "0 0 1mm 0" }}>{alternative.insurance_company}</p>
      <h3 style={{ fontSize: "12.5pt", margin: "0 0 2mm 0" }}>{alternative.title}</h3>
      <p style={{ fontSize: "9pt", color: "#5A6259", margin: "0 0 3mm 0" }}>{alternative.product_name}</p>

      {alternative.description ? (
        <p style={{ fontSize: "9.5pt", lineHeight: 1.5, margin: "0 0 3mm 0", whiteSpace: "pre-wrap" }}>
          {alternative.description}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "8mm", fontSize: "9.5pt" }}>
        {monthly ? (
          <div>
            <p style={{ margin: 0, color: "#5A6259" }}>Prima mensual</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{monthly}</p>
          </div>
        ) : null}
        {insured ? (
          <div>
            <p style={{ margin: 0, color: "#5A6259" }}>Suma asegurada</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{insured}</p>
          </div>
        ) : null}
      </div>

      {alternative.is_recommended && alternative.recommended_reason ? (
        <p style={{ fontSize: "9pt", marginTop: "3mm", color: "var(--ps-primary)", whiteSpace: "pre-wrap" }}>
          {alternative.recommended_reason}
        </p>
      ) : null}
    </div>
  );
}

function AlternativesSection({ alternatives }: { alternatives: SnapshotAlternative[] }) {
  if (alternatives.length === 0) return null;
  const sorted = [...alternatives].sort((a, b) => a.display_order - b.display_order);

  return (
    <DocumentSection eyebrow="Opciones evaluadas" title="Alternativas">
      {sorted.map((alternative) => (
        <AlternativeCard key={alternative.id} alternative={alternative} />
      ))}
    </DocumentSection>
  );
}

export { AlternativesSection };
