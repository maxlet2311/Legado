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

/** Portada (06_PDF_ENGINE.md § Portada): nunca tablas, nunca datos técnicos. */
function DocumentCover({ snapshot }: { snapshot: DocumentSnapshot }) {
  const { proposal, client, brand } = snapshot;
  const subtitle = OBJECTIVE_LABELS[proposal.primary_objective] ?? proposal.primary_objective;

  return (
    <section
      className="ps-page"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "var(--ps-secondary)",
      }}
    >
      <div>
        {brand?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- HTML servido a Puppeteer, fuera del pipeline de <Image>.
          <img
            src={brand.logo_url}
            alt={brand.commercial_name}
            style={{ maxHeight: "22mm", maxWidth: "70mm", objectFit: "contain" }}
          />
        ) : null}
      </div>

      <div style={{ maxWidth: "140mm" }}>
        <p style={{ fontSize: "11pt", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ps-primary)", marginBottom: "6mm" }}>
          {subtitle}
        </p>
        <h1 style={{ fontSize: "28pt", lineHeight: 1.15, margin: 0, color: "#1F2421" }}>{proposal.title}</h1>
        {client ? (
          <p style={{ fontSize: "14pt", marginTop: "8mm", color: "#3A413C" }}>
            Preparado para {client.full_name}
            {client.company_name ? ` — ${client.company_name}` : ""}
          </p>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "9.5pt", color: "#5A6259" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>{brand?.advisor_name ?? "—"}</p>
          <p style={{ margin: 0 }}>{brand?.commercial_name ?? ""}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0 }}>Propuesta N.º {proposal.proposal_number}</p>
          <p style={{ margin: 0 }}>{formatDate(snapshot.issued_at)}</p>
        </div>
      </div>
    </section>
  );
}

export { DocumentCover };
