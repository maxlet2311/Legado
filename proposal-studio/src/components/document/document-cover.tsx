import type { DocumentSnapshot } from "@/lib/render/types";
import { formatDate } from "@/lib/render/formatters";

const OBJECTIVE_LABELS: Record<string, string> = {
  protect_family: "Protección familiar",
  build_savings: "Construcción de ahorro",
  retirement: "Planificación de retiro",
  business_protection: "Protección del negocio",
  partners_protection: "Protección de socios",
  employee_retention: "Retención de talento",
  custom: "Estrategia a medida",
};

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  individual: "Propuesta individual",
  corporate: "Propuesta empresarial",
};

/**
 * Portada (06_PDF_ENGINE.md § Portada): composición editorial, nunca una
 * simple cabecera horizontal. Solo usa campos reales del snapshot — si algo
 * falta (logo, cliente, producto) el bloque correspondiente se omite en vez
 * de mostrar un placeholder.
 */
function DocumentCover({ snapshot }: { snapshot: DocumentSnapshot }) {
  const { proposal, client, brand } = snapshot;
  const objectiveLabel = OBJECTIVE_LABELS[proposal.primary_objective] ?? proposal.primary_objective;
  const typeLabel = PROPOSAL_TYPE_LABELS[proposal.proposal_type];

  return (
    <div
      className="ps-cover-page"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "var(--ps-margin)",
        background: "var(--ps-secondary)",
        color: "#1F2421",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: "-60mm",
          top: "-60mm",
          width: "160mm",
          height: "160mm",
          borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--ps-primary) 16%, transparent) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        {brand?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- HTML servido a Puppeteer, fuera del pipeline de <Image>.
          <img
            src={brand.logo_url}
            alt={brand.commercial_name}
            style={{ maxHeight: "20mm", maxWidth: "70mm", objectFit: "contain" }}
          />
        ) : (
          <span />
        )}
        {typeLabel ? (
          <span
            style={{
              fontSize: "8pt",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ps-text-on-primary)",
              background: "var(--ps-primary)",
              padding: "2mm 4mm",
              borderRadius: "20px",
              fontWeight: 600,
            }}
          >
            {typeLabel}
          </span>
        ) : null}
      </div>

      <div style={{ position: "relative", maxWidth: "150mm" }}>
        <p
          style={{
            fontSize: "10.5pt",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ps-primary)",
            fontWeight: 700,
            margin: "0 0 6mm 0",
          }}
        >
          {objectiveLabel}
        </p>
        <h1 style={{ fontSize: "30pt", lineHeight: 1.12, margin: 0, color: "#1B211C", fontWeight: 700 }}>
          {proposal.title}
        </h1>
        {client ? (
          <p style={{ fontSize: "13pt", marginTop: "8mm", color: "#3A413C", fontFamily: "var(--ps-font-body)" }}>
            Preparado para <strong>{client.full_name}</strong>
            {client.company_name ? ` — ${client.company_name}` : ""}
          </p>
        ) : null}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: brand ? "space-between" : "flex-end",
          alignItems: "flex-end",
          fontSize: "9.5pt",
          color: "#5A6259",
          borderTop: "1px solid color-mix(in srgb, var(--ps-primary) 25%, transparent)",
          paddingTop: "5mm",
        }}
      >
        {brand ? (
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: "#1F2421" }}>{brand.advisor_name}</p>
            {brand.commercial_name ? <p style={{ margin: 0 }}>{brand.commercial_name}</p> : null}
          </div>
        ) : null}
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0 }}>Propuesta N.º {proposal.proposal_number}</p>
          <p style={{ margin: 0 }}>{formatDate(snapshot.issued_at)}</p>
        </div>
      </div>
    </div>
  );
}

export { DocumentCover };
