import type { SnapshotTemplate } from "@/lib/render/types";

/**
 * Registry extensible de templates documentales. Sprint 4 Core implementa
 * únicamente "editorial-premium" (06_PDF_ENGINE.md § Orden recomendado); las
 * demás plantillas de sistema (savings, retirement, business) comparten hoy
 * la misma implementación visual y se diferencian por contenido, no por
 * layout. Agregar una plantilla nueva es agregar una entrada acá + su propio
 * `DocumentShell`, sin tocar el resto del renderer.
 */

const DEFAULT_SECTION_ORDER = [
  "cover",
  "executive_summary",
  "diagnosis",
  "strategy",
  "alternatives",
  "comparison",
  "benefits",
  "call_to_action",
  "advisor",
  "legal_note",
] as const;

export type DocumentSectionId = (typeof DEFAULT_SECTION_ORDER)[number];

export interface TemplateDefinition {
  key: string;
  label: string;
  sectionOrder: DocumentSectionId[];
}

const EDITORIAL_PREMIUM: TemplateDefinition = {
  key: "editorial-premium",
  label: "Editorial Premium",
  sectionOrder: [...DEFAULT_SECTION_ORDER],
};

const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  "editorial-premium": EDITORIAL_PREMIUM,
};

/** Sprint 4 Core: toda propuesta resuelve a la única plantilla implementada. */
function resolveTemplate(_template: SnapshotTemplate | null): TemplateDefinition {
  void _template;
  return EDITORIAL_PREMIUM;
}

export { TEMPLATE_REGISTRY, resolveTemplate, DEFAULT_SECTION_ORDER };
