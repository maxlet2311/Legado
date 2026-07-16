import type { DocumentSnapshot } from "@/lib/render/types";

/**
 * Header discreto (06_PDF_ENGINE.md § Header): logo + cliente + título
 * abreviado. Se usa tanto en la vista previa (una franja de referencia arriba
 * del documento) como fuente para el `headerTemplate` nativo de Puppeteer,
 * que sí repite en cada página física impresa.
 */
function DocumentHeader({ snapshot }: { snapshot: DocumentSnapshot }) {
  const { proposal, client, brand } = snapshot;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "8pt",
        color: "#5A6259",
        width: "100%",
        padding: "0 var(--ps-margin, 12mm)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {brand?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logo_url} alt="" style={{ height: "6mm", objectFit: "contain" }} />
        ) : null}
        {proposal.title}
      </span>
      <span>{client?.full_name ?? ""}</span>
    </div>
  );
}

export { DocumentHeader };
