import type { DocumentSnapshot } from "@/lib/render/types";
import { DocumentSection } from "@/components/document/document-section";

const OBJECTIVE_LABELS: Record<string, string> = {
  protect_family: "Protección familiar",
  build_savings: "Construcción de ahorro",
  retirement: "Planificación de retiro",
  business_protection: "Protección del negocio",
  partners_protection: "Protección de socios",
  employee_retention: "Retención de talento",
  custom: "Estrategia a medida",
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: "Persona",
  company: "Empresa",
};

interface SummaryItem {
  label: string;
  value: string;
  description?: string;
}

/**
 * Resumen ejecutivo (brief § 2): entre 3 y 5 datos clave, construidos
 * exclusivamente a partir de campos reales del snapshot. Un dato se omite
 * por completo si su campo de origen no tiene contenido — nunca se rellena
 * con un placeholder.
 */
function buildSummaryItems(snapshot: DocumentSnapshot): SummaryItem[] {
  const { proposal, client, alternatives } = snapshot;
  const items: SummaryItem[] = [];

  items.push({
    label: "Objetivo principal",
    value: OBJECTIVE_LABELS[proposal.primary_objective] ?? proposal.primary_objective,
  });

  if (client) {
    items.push({
      label: "Perfil del cliente",
      value: CLIENT_TYPE_LABELS[client.client_type] ?? client.client_type,
      description: client.company_name ?? undefined,
    });
  }

  if (proposal.product?.trim()) {
    items.push({ label: "Producto", value: proposal.product });
  }

  if (alternatives.length > 0) {
    items.push({
      label: "Alternativas evaluadas",
      value: String(alternatives.length),
      description: alternatives.some((alternative) => alternative.is_recommended) ? "Con recomendación" : undefined,
    });
  }

  items.push({ label: "Moneda de referencia", value: proposal.currency });

  return items.slice(0, 5);
}

function ExecutiveSummarySection({ snapshot }: { snapshot: DocumentSnapshot }) {
  const items = buildSummaryItems(snapshot);
  if (items.length < 3) return null;

  return (
    <DocumentSection eyebrow="En síntesis" title="Resumen ejecutivo">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length >= 4 ? 4 : items.length}, 1fr)`, gap: "5mm" }}>
        {items.map((item) => (
          <div
            key={item.label}
            className="ps-card"
            style={{ borderTop: "2.5px solid var(--ps-accent)", padding: "4mm 3mm 0 0" }}
          >
            <p style={{ fontSize: "8pt", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A6259", margin: "0 0 2mm 0" }}>
              {item.label}
            </p>
            <p style={{ fontSize: "15pt", fontFamily: "var(--ps-font-display)", fontWeight: 600, margin: 0, color: "#1B211C" }}>
              {item.value}
            </p>
            {item.description ? (
              <p style={{ fontSize: "8.5pt", color: "#5A6259", margin: "1mm 0 0 0" }}>{item.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </DocumentSection>
  );
}

export { ExecutiveSummarySection };
