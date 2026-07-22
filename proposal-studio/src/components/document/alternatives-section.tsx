import type { SnapshotAlternative } from "@/lib/render/types";
import { formatCurrency } from "@/lib/render/formatters";
import { DocumentSection } from "@/components/document/document-section";

/**
 * Reglas de grilla por cantidad de alternativas (brief § 4 "Alternativas
 * analizadas"): nunca se reduce la tipografía para forzar todo en una
 * página; en su lugar se ajusta la cantidad de columnas.
 */
function getGridColumns(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 2; // 4, 5 o 6: dos columnas, varias filas — mantiene legibilidad de cada tarjeta.
}

function AlternativeCard({ alternative, spotlight = false }: { alternative: SnapshotAlternative; spotlight?: boolean }) {
  const monthly = formatCurrency(alternative.monthly_premium, alternative.currency);
  const insured = formatCurrency(alternative.insured_amount, alternative.currency);
  const advantages = alternative.financial_details?.advantages?.filter((item) => item.trim()) ?? [];
  const disadvantages = alternative.financial_details?.disadvantages?.filter((item) => item.trim()) ?? [];
  const notes = alternative.financial_details?.notes?.trim();

  return (
    <div
      className="ps-card"
      style={{
        border: spotlight ? "1.5px solid var(--ps-accent)" : "1px solid #DEDCCF",
        borderRadius: "8px",
        padding: spotlight ? "8mm" : "6mm",
        marginBottom: "5mm",
        position: "relative",
        background: spotlight ? "color-mix(in srgb, var(--ps-accent) 6%, white)" : "#FFFFFF",
      }}
    >
      {spotlight ? (
        <span
          style={{
            position: "absolute",
            top: "-3.2mm",
            left: "6mm",
            background: "var(--ps-accent)",
            color: "var(--ps-text-on-accent)",
            fontSize: "7.5pt",
            fontWeight: 700,
            padding: "1.2mm 3.5mm",
            borderRadius: "10px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {alternative.highlight_label || "Recomendada"}
        </span>
      ) : null}

      <p style={{ fontSize: "8pt", color: "#5A6259", margin: `${spotlight ? "3mm" : "0"} 0 1mm 0` }}>
        {alternative.insurance_company}
      </p>
      <h3 style={{ fontSize: spotlight ? "15pt" : "12.5pt", margin: "0 0 2mm 0", fontFamily: "var(--ps-font-display)" }}>
        {alternative.title}
      </h3>
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
            <p style={{ margin: 0, fontWeight: 700 }}>{monthly}</p>
          </div>
        ) : null}
        {insured ? (
          <div>
            <p style={{ margin: 0, color: "#5A6259" }}>Suma asegurada</p>
            <p style={{ margin: 0, fontWeight: 700 }}>{insured}</p>
          </div>
        ) : null}
      </div>

      {spotlight && alternative.recommended_reason ? (
        <p
          style={{
            fontSize: "10pt",
            marginTop: "4mm",
            paddingTop: "4mm",
            borderTop: "1px solid color-mix(in srgb, var(--ps-accent) 30%, transparent)",
            color: "var(--ps-primary)",
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
          }}
        >
          {alternative.recommended_reason}
        </p>
      ) : null}

      {advantages.length > 0 || disadvantages.length > 0 ? (
        <div style={{ display: "flex", gap: "8mm", marginTop: "3mm", fontSize: "9pt" }}>
          {advantages.length > 0 ? (
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 1mm 0", fontWeight: 600, color: "#3F6B4F" }}>Ventajas</p>
              <ul style={{ margin: 0, paddingLeft: "4mm" }}>
                {advantages.map((item, index) => (
                  <li key={index} style={{ marginBottom: "0.5mm" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {disadvantages.length > 0 ? (
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 1mm 0", fontWeight: 600, color: "#9C4B3F" }}>Desventajas</p>
              <ul style={{ margin: 0, paddingLeft: "4mm" }}>
                {disadvantages.map((item, index) => (
                  <li key={index} style={{ marginBottom: "0.5mm" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {notes ? (
        <p style={{ fontSize: "8.5pt", marginTop: "3mm", color: "#5A6259", whiteSpace: "pre-wrap" }}>{notes}</p>
      ) : null}
    </div>
  );
}

/**
 * Alternativas (brief § 4 y § 5): la(s) recomendada(s) se destacan primero
 * en composición protagonista de ancho completo; el resto se distribuye en
 * grilla según la cantidad total, sin duplicar la recomendada en la grilla.
 */
function AlternativesSection({ alternatives }: { alternatives: SnapshotAlternative[] }) {
  if (alternatives.length === 0) return null;
  const sorted = [...alternatives].sort((a, b) => a.display_order - b.display_order);
  const recommended = sorted.filter((alternative) => alternative.is_recommended);
  const rest = sorted.filter((alternative) => !alternative.is_recommended);
  const columns = getGridColumns(rest.length);
  const [soloRest] = rest;

  return (
    <DocumentSection eyebrow="Opciones evaluadas" title="Alternativas" anchor flow>
      {recommended.map((alternative) => (
        <AlternativeCard key={alternative.id} alternative={alternative} spotlight />
      ))}

      {soloRest ? (
        // Un solo elemento en la grilla: se cae del grid de columnas (que lo
        // estiraría a `1fr` = 100% del ancho) y se cap+alinea como card suelta.
        <div style={{ maxWidth: "min(var(--ps-card-max), 100%)" }}>
          <AlternativeCard alternative={soloRest} />
        </div>
      ) : rest.length > 1 ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "5mm", alignItems: "start" }}>
          {rest.map((alternative) => (
            <AlternativeCard key={alternative.id} alternative={alternative} />
          ))}
        </div>
      ) : null}
    </DocumentSection>
  );
}

export { AlternativesSection };
