import "server-only";

// Import explícito de la variante Node (no la genérica "react-dom/server"):
// Next.js bloquea esa segunda por regla de build en el directorio `app`,
// pensada para desincentivar SSR manual — acá es un uso legítimo y aislado
// (serializar el documento a HTML estático para Puppeteer, runtime Node).
import { renderToStaticMarkup } from "react-dom/server.node";
import { PDFDocument } from "pdf-lib";

import { RenderDocument } from "@/lib/render/render-document";
import type { DocumentSnapshot } from "@/lib/render/types";

const RENDER_ENGINE = "chromium-puppeteer";
const RENDER_ENGINE_VERSION = "1";

function wrapHtml(bodyMarkup: string): string {
  return `<!doctype html><html lang="es-AR"><head><meta charset="utf-8" /></head><body>${bodyMarkup}</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFooterTemplate(snapshot: DocumentSnapshot): string {
  const { brand } = snapshot;
  const parts = [brand?.advisor_name, brand?.license_number ? `Mat. ${brand.license_number}` : null, brand?.phone, brand?.email]
    .filter((part): part is string => Boolean(part))
    .map(escapeHtml)
    .join(" &middot; ");

  return `
    <div style="width:100%; font-size:7.5px; color:#5A6259; padding:0 14mm; display:flex; justify-content:space-between; align-items:center; font-family:Arial,sans-serif;">
      <span>${parts}</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  `;
}

function buildHeaderTemplate(snapshot: DocumentSnapshot): string {
  const title = escapeHtml(snapshot.proposal.title);
  const client = snapshot.client?.full_name ? escapeHtml(snapshot.client.full_name) : "";

  return `
    <div style="width:100%; font-size:7.5px; color:#5A6259; padding:0 14mm; display:flex; justify-content:space-between; font-family:Arial,sans-serif;">
      <span>${title}</span>
      <span>${client}</span>
    </div>
  `;
}

async function launchBrowser() {
  if (process.env.VERCEL) {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch({ headless: true });
}

/**
 * Genera el PDF real de una versión emitida. Portada y contenido se
 * renderizan como dos PDFs separados (la portada nunca lleva header/footer
 * ni numeración de página — 06_PDF_ENGINE.md § Numeración: "todas las
 * páginas, excepto la portada") y se combinan con pdf-lib en un único
 * archivo final.
 */
async function generateProposalVersionPdf(snapshot: DocumentSnapshot): Promise<Buffer> {
  const format = snapshot.proposal.pdf_format === "Letter" ? "Letter" : "A4";
  const landscape = snapshot.proposal.orientation === "landscape";

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();

    const pdfBuffers: Buffer[] = [];

    if (snapshot.proposal.show_cover) {
      const coverHtml = wrapHtml(renderToStaticMarkup(RenderDocument({ snapshot, variant: "cover" })));
      await page.setContent(coverHtml, { waitUntil: "load" });
      const coverPdf = await page.pdf({ format, landscape, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
      pdfBuffers.push(Buffer.from(coverPdf));
    }

    const contentHtml = wrapHtml(renderToStaticMarkup(RenderDocument({ snapshot, variant: "content" })));
    await page.setContent(contentHtml, { waitUntil: "load" });
    const contentPdf = await page.pdf({
      format,
      landscape,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: buildHeaderTemplate(snapshot),
      footerTemplate: buildFooterTemplate(snapshot),
      margin: { top: "16mm", bottom: "14mm", left: 0, right: 0 },
    });
    pdfBuffers.push(Buffer.from(contentPdf));

    if (pdfBuffers.length === 1) {
      return pdfBuffers[0]!;
    }

    const merged = await PDFDocument.create();
    for (const buffer of pdfBuffers) {
      const doc = await PDFDocument.load(buffer);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      for (const copiedPage of pages) {
        merged.addPage(copiedPage);
      }
    }
    return Buffer.from(await merged.save());
  } finally {
    await browser.close();
  }
}

export { generateProposalVersionPdf, RENDER_ENGINE, RENDER_ENGINE_VERSION };
