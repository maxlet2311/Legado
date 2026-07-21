import type { CSSProperties, ReactNode } from "react";

import type { DocumentSnapshot } from "@/lib/render/types";
import { getPageSizeMm, MARGIN_MM } from "@/lib/render/page-geometry";
import { getEmbeddedFontFacesCss, DISPLAY_FONT, BODY_FONT } from "@/lib/render/fonts";
import { DEFAULT_BRAND_PALETTE } from "@/lib/branding/default-palette";

interface DocumentShellProps {
  snapshot: DocumentSnapshot;
  children: ReactNode;
}

/**
 * Contenedor raíz del documento. Un único bloque de CSS (sin Tailwind: el
 * mismo HTML se reutiliza tal cual dentro de Puppeteer para generar el PDF,
 * fuera del pipeline de build de Next) define tokens de marca, tipografía
 * embebida, tamaño real de página según `pdf_format`+`orientation`, y las
 * reglas de flujo/salto de página: la portada es siempre una hoja propia;
 * el resto del documento fluye de forma continua y solo las secciones
 * protagonistas (Alternativas, Comparativa) fuerzan inicio de página nueva
 * — nunca "una sección = una hoja" fija (06_PDF_ENGINE.md § Paginación).
 */
function DocumentShell({ snapshot, children }: DocumentShellProps) {
  const { proposal, brand } = snapshot;
  const marginMm = MARGIN_MM[proposal.margin_size];
  const primaryColor = proposal.primary_color_override ?? brand?.primary_color ?? DEFAULT_BRAND_PALETTE.primary;
  const secondaryColor = proposal.secondary_color_override ?? brand?.secondary_color ?? DEFAULT_BRAND_PALETTE.secondary;
  const accentColor = brand?.accent_color ?? DEFAULT_BRAND_PALETTE.accent;
  const pageSize = getPageSizeMm(proposal.pdf_format, proposal.orientation);

  const rootStyle = {
    "--ps-primary": primaryColor,
    "--ps-secondary": secondaryColor,
    "--ps-accent": accentColor,
    "--ps-text-on-primary": snapshot.brandTextOnPrimary,
    "--ps-text-on-accent": snapshot.brandTextOnAccent,
    "--ps-margin": `${marginMm}mm`,
    "--ps-page-width": `${pageSize.width}mm`,
    "--ps-page-height": `${pageSize.height}mm`,
    "--ps-font-display": `"${DISPLAY_FONT}", Georgia, serif`,
    "--ps-font-body": `"${proposal.font_family}", "${BODY_FONT}", Arial, sans-serif`,
  } as CSSProperties;

  return (
    <div className="ps-doc" data-orientation={proposal.orientation} style={rootStyle}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            ${getEmbeddedFontFacesCss()}

            /* Sin \`margin: 0\` acá: la portada y el contenido reciben su margen
               real desde \`page.pdf({ margin })\` en pdf.ts (0 para portada,
               16mm/14mm para contenido). Una regla \`@page { margin: 0 }\`
               compartida pisaba ese margen de la API en TODAS las páginas de
               contenido, dejando el header pegado al borde físico de la hoja. */
            @page { size: ${proposal.pdf_format} ${proposal.orientation}; }

            /* El navegador aplica \`body { margin: 8px }\` por UA stylesheet
               (wrapHtml en pdf.ts no la resetea). Sin este reset, esos 8px
               sumados a una portada con alto exacto de página física
               (--ps-page-height) desbordan a una segunda página en blanco. */
            html, body { margin: 0; padding: 0; }

            .ps-doc {
              font-family: var(--ps-font-body);
              color: #1F2421;
              -webkit-font-smoothing: antialiased;
            }
            .ps-doc * { box-sizing: border-box; }
            .ps-doc h1, .ps-doc h2, .ps-doc h3 { font-family: var(--ps-font-display); font-weight: 600; }

            .ps-cover-page {
              position: relative;
              width: var(--ps-page-width);
              height: var(--ps-page-height);
              /* overflow:hidden es crítico: sin él, el círculo decorativo
                 absolutamente posicionado (offsets negativos) puede quedar
                 sin contener y hacer que Chromium calcule una segunda
                 página física en blanco al paginar la portada. */
              overflow: hidden;
              background: #FFFFFF;
            }

            .ps-content {
              padding: 0 var(--ps-margin);
            }

            .ps-section { break-inside: avoid; margin-top: 14mm; }
            .ps-section:first-child { margin-top: 0; }
            .ps-section--flow { break-inside: auto; }
            /* margin-top: 0 -- una sección que fuerza salto de página ya
               arranca detrás del margen físico de página (16mm, pdf.ts);
               heredar además el margin-top: 14mm de .ps-section duplicaba/
               desalineaba el espacio superior de esa hoja. */
            .ps-section--anchor { break-before: page; margin-top: 0; }
            .ps-heading { break-after: avoid; }
            .ps-card { break-inside: avoid; }

            table.ps-table { border-collapse: collapse; width: 100%; }
            table.ps-table thead { display: table-header-group; }
            table.ps-table tr { break-inside: avoid; }

            @media screen {
              .ps-doc { background: #E7E4DA; padding: 12px 0; }
              .ps-cover-page { box-shadow: 0 1px 3px rgba(0,0,0,0.15); margin: 0 auto 8px auto; }
              .ps-content { max-width: var(--ps-page-width); margin: 0 auto; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.15); padding-top: var(--ps-margin); padding-bottom: var(--ps-margin); }
              .ps-section--anchor { break-before: auto; border-top: 1px dashed #C7C2B4; padding-top: 10mm; }
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
