import type { CSSProperties, ReactNode } from "react";

import type { DocumentSnapshot } from "@/lib/render/types";

interface DocumentShellProps {
  snapshot: DocumentSnapshot;
  children: ReactNode;
}

const MARGIN_MM: Record<DocumentSnapshot["proposal"]["margin_size"], number> = {
  small: 14,
  medium: 20,
  large: 28,
};

/**
 * Contenedor raíz del documento. Un único bloque de CSS (sin Tailwind:
 * el mismo HTML se reutiliza tal cual dentro de Puppeteer para generar el PDF,
 * fuera del pipeline de build de Next) define tamaño de página, orientación,
 * márgenes y las reglas de salto de página de 06_PDF_ENGINE.md (nunca títulos
 * huérfanos, nunca tablas ni Cards partidas).
 */
function DocumentShell({ snapshot, children }: DocumentShellProps) {
  const { proposal, brand } = snapshot;
  const marginMm = MARGIN_MM[proposal.margin_size];
  const primaryColor = proposal.primary_color_override ?? brand?.primary_color ?? "#596B4D";
  const secondaryColor = proposal.secondary_color_override ?? brand?.secondary_color ?? "#F6F2E9";
  const accentColor = brand?.accent_color ?? "#C49752";

  const rootStyle = {
    "--ps-primary": primaryColor,
    "--ps-secondary": secondaryColor,
    "--ps-accent": accentColor,
    "--ps-text-on-primary": snapshot.brandTextOnPrimary,
    "--ps-text-on-accent": snapshot.brandTextOnAccent,
    "--ps-margin": `${marginMm}mm`,
  } as CSSProperties;

  return (
    <div className="ps-doc" data-orientation={proposal.orientation} style={rootStyle}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: ${proposal.pdf_format} ${proposal.orientation}; margin: 0; }
            .ps-doc { font-family: "${proposal.font_family}", Arial, sans-serif; color: #1F2421; }
            .ps-doc * { box-sizing: border-box; }
            .ps-page {
              position: relative;
              width: ${proposal.orientation === "portrait" ? "210mm" : "297mm"};
              min-height: ${proposal.orientation === "portrait" ? "297mm" : "210mm"};
              padding: var(--ps-margin);
              margin: 0 auto 8mm auto;
              background: #FFFFFF;
              break-after: page;
              overflow: hidden;
            }
            .ps-page:last-child { break-after: auto; }
            .ps-section { break-inside: avoid; }
            .ps-section + .ps-section { margin-top: 10mm; }
            .ps-heading { break-after: avoid; }
            .ps-card { break-inside: avoid; }
            table.ps-table { border-collapse: collapse; width: 100%; }
            table.ps-table thead { display: table-header-group; }
            table.ps-table tr { break-inside: avoid; }
            @media screen {
              .ps-doc { background: #E7E4DA; padding: 12px 0; }
              .ps-page { box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
            }
          `,
        }}
      />
      {proposal.show_watermark && proposal.watermark_text ? (
        <div
          style={{
            position: "fixed",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            fontSize: "48pt",
            color: "rgba(31,36,33,0.08)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {proposal.watermark_text}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export { DocumentShell };
