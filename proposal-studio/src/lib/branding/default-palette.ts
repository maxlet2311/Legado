/**
 * Paleta "Personas" por defecto cuando no hay marca configurada. Debe coincidir
 * exactamente con los tokens `--color-persona-*` en `src/app/globals.css`
 * (docs/03_DESIGN_SYSTEM.md + default de `brands` en docs/04_DATA_MODEL.md) —
 * única fuente de verdad para no desincronizar el form de Mi Marca y el
 * fallback del motor de PDF.
 */
const DEFAULT_BRAND_PALETTE = {
  primary: "#596B4D",
  secondary: "#F6F2E9",
  accent: "#C49752",
} as const;

export { DEFAULT_BRAND_PALETTE };
