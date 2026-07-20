import type { DocumentSnapshot, Orientation, PdfFormat } from "@/lib/render/types";

/** Mapeo único de `margin_size` a mm — compartido entre `DocumentShell` (CSS) y `pdf.ts` (header/footer de Puppeteer). */
const MARGIN_MM: Record<DocumentSnapshot["proposal"]["margin_size"], number> = {
  small: 14,
  medium: 20,
  large: 28,
};

/** Tamaños físicos reales en mm — deben coincidir con los que Puppeteer usa vía `page.pdf({ format })`. */
const PAGE_SIZES_MM: Record<PdfFormat, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

/**
 * Ancho/alto de página en mm para un `pdf_format`+`orientation` dados. Antes
 * el CSS de la portada asumía siempre A4 (210×297mm) sin importar
 * `pdf_format`, generando un desajuste visual cuando la propuesta usaba
 * Letter (06_PDF_ENGINE.md § Formatos). Única fuente de verdad para ambos
 * lados: preview y `pdf.ts`.
 */
function getPageSizeMm(format: PdfFormat, orientation: Orientation): { width: number; height: number } {
  const size = PAGE_SIZES_MM[format] ?? PAGE_SIZES_MM.A4;
  return orientation === "landscape" ? { width: size.height, height: size.width } : size;
}

export { getPageSizeMm, MARGIN_MM };
