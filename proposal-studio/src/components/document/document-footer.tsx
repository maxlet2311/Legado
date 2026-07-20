import type { DocumentSnapshot } from "@/lib/render/types";

/**
 * Footer repetible del PDF (06_PDF_ENGINE.md § Footer): asesor, matrícula,
 * contacto y numeración. Única fuente de verdad para el `footerTemplate`
 * nativo de Puppeteer — ver nota en `document-header.tsx`. La numeración usa
 * las clases propias de Puppeteer (`pageNumber`/`totalPages`), que solo
 * funcionan dentro de este template aislado.
 */
function DocumentFooter({ snapshot, marginMm }: { snapshot: DocumentSnapshot; marginMm: number }) {
  const { brand, proposal } = snapshot;

  const parts = [
    brand?.advisor_name,
    brand?.license_number ? `Mat. ${brand.license_number}` : null,
    brand?.phone,
    brand?.email,
  ].filter((part): part is string => Boolean(part));

  return (
    <div
      style={{
        width: "100%",
        fontSize: "7.5px",
        color: "#5A6259",
        padding: `0 ${marginMm}mm`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <span>{parts.join(" · ")}</span>
      {proposal.show_page_numbers ? (
        <span>
          <span className="pageNumber" /> / <span className="totalPages" />
        </span>
      ) : null}
    </div>
  );
}

export { DocumentFooter };
