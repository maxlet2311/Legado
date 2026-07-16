import type { DocumentSnapshot } from "@/lib/render/types";

/**
 * Footer discreto (06_PDF_ENGINE.md § Footer): asesor, matrícula, teléfono,
 * email, sitio web. Igual que DocumentHeader, sirve de referencia en preview
 * y de fuente para el `footerTemplate` nativo de Puppeteer (que agrega la
 * numeración real "Página X de Y", generada aparte por el motor de PDF).
 */
function DocumentFooter({ snapshot }: { snapshot: DocumentSnapshot }) {
  const { brand } = snapshot;
  if (!brand) return null;

  const parts = [
    brand.advisor_name,
    brand.license_number ? `Mat. ${brand.license_number}` : null,
    brand.phone,
    brand.email,
    brand.website,
  ].filter(Boolean);

  return (
    <div
      style={{
        fontSize: "7.5pt",
        color: "#5A6259",
        width: "100%",
        padding: "0 var(--ps-margin, 12mm)",
        textAlign: "center",
      }}
    >
      {parts.join(" · ")}
    </div>
  );
}

export { DocumentFooter };
