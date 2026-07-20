import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Carga determinística de tipografías para el documento (preview + PDF).
 *
 * El renderer no puede depender de `next/font` (genera HTML crudo fuera del
 * pipeline de build de Next, servido tal cual a Puppeteer — ver
 * `document-shell.tsx`) ni de Google Fonts en tiempo de generación (frágil:
 * requiere red, y Chromium headless en Vercel no tiene las fuentes del
 * sistema instaladas). En su lugar se embeben como `@font-face` con
 * `data:` URIs leyendo los `.woff2` estáticos de `@fontsource/*`
 * (self-hosted, sin red, mismo binario en cada render).
 */

const FONT_FILES: Array<{ family: string; weight: number; style: "normal" | "italic"; pkg: string; file: string }> = [
  { family: "Fraunces", weight: 400, style: "normal", pkg: "@fontsource/fraunces", file: "fraunces-latin-400-normal.woff2" },
  { family: "Fraunces", weight: 600, style: "normal", pkg: "@fontsource/fraunces", file: "fraunces-latin-600-normal.woff2" },
  { family: "Fraunces", weight: 700, style: "normal", pkg: "@fontsource/fraunces", file: "fraunces-latin-700-normal.woff2" },
  { family: "Fraunces", weight: 900, style: "normal", pkg: "@fontsource/fraunces", file: "fraunces-latin-900-normal.woff2" },
  { family: "Inter", weight: 400, style: "normal", pkg: "@fontsource/inter", file: "inter-latin-400-normal.woff2" },
  { family: "Inter", weight: 500, style: "normal", pkg: "@fontsource/inter", file: "inter-latin-500-normal.woff2" },
  { family: "Inter", weight: 600, style: "normal", pkg: "@fontsource/inter", file: "inter-latin-600-normal.woff2" },
  { family: "Inter", weight: 700, style: "normal", pkg: "@fontsource/inter", file: "inter-latin-700-normal.woff2" },
];

let cachedCss: string | null = null;

/** Nombre de la fuente display (títulos editoriales) embebida de forma determinística. */
const DISPLAY_FONT = "Fraunces";
/** Nombre de la fuente de lectura (cuerpo de texto) embebida de forma determinística. */
const BODY_FONT = "Inter";

function loadFontAsDataUri(pkg: string, file: string): string | null {
  try {
    const path = join(process.cwd(), "node_modules", pkg, "files", file);
    const buffer = readFileSync(path);
    return `data:font/woff2;base64,${buffer.toString("base64")}`;
  } catch {
    // Si el paquete no está disponible (entorno inusual), el documento cae al
    // stack de fallback (`var(--ps-font-body)`, etc.) en vez de romper el render.
    return null;
  }
}

/** CSS `@font-face` embebido, calculado una sola vez por proceso (evita releer disco en cada render). */
function getEmbeddedFontFacesCss(): string {
  if (cachedCss !== null) return cachedCss;

  const blocks = FONT_FILES.map(({ family, weight, style, pkg, file }) => {
    const dataUri = loadFontAsDataUri(pkg, file);
    if (!dataUri) return "";
    return `
      @font-face {
        font-family: "${family}";
        font-style: ${style};
        font-weight: ${weight};
        font-display: swap;
        src: url(${dataUri}) format("woff2");
      }`;
  });

  cachedCss = blocks.join("\n");
  return cachedCss;
}

export { getEmbeddedFontFacesCss, DISPLAY_FONT, BODY_FONT };
