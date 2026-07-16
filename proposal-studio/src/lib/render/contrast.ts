/**
 * Fallback de contraste (06_PDF_ENGINE.md § Accesibilidad): decide texto
 * blanco o negro según la luminancia relativa del color de marca. Solo afecta
 * el render — nunca modifica `brands.primary_color` / `accent_color`.
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = Number.parseInt(value, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(hex: string): number {
  const channels = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x: contraste de blanco (#FFFFFF) sobre `hex` vs. negro (#000000). */
function pickContrastText(hex: string | null | undefined, fallback = "#596B4D"): "#000000" | "#FFFFFF" {
  const color = hex && /^#[0-9A-Fa-f]{3,6}$/.test(hex) ? hex : fallback;
  const luminance = relativeLuminance(color);
  const contrastWithWhite = (1.05) / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? "#FFFFFF" : "#000000";
}

export { pickContrastText, relativeLuminance };
