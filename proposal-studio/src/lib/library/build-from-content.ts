import type { LibraryAlternativeContent, LibraryBenefitContent } from "@/types/library";
import type { WizardAlternative, WizardBenefit } from "@/types/wizard";

/**
 * Arma el `WizardAlternative` local que se inserta en el store tras copiar un
 * bloque de la Biblioteca. Clona los arrays de `advantages`/`disadvantages`
 * para que editar la copia en el wizard nunca mute el `content_json` del
 * ítem original guardado en la Biblioteca.
 */
function buildAlternativeFromLibraryContent(
  id: string,
  title: string,
  content: LibraryAlternativeContent,
  displayOrder: number,
): WizardAlternative {
  return {
    client_key: id,
    id,
    title,
    description: content.description,
    category: content.category,
    insurance_company: content.insurance_company,
    product_name: content.product_name,
    currency: content.currency,
    monthly_premium: content.monthly_premium,
    details: {
      advantages: [...content.advantages],
      disadvantages: [...content.disadvantages],
      notes: content.notes,
    },
    display_order: displayOrder,
    revision: 1,
  };
}

/** Igual que `buildAlternativeFromLibraryContent`, para beneficios. */
function buildBenefitFromLibraryContent(
  id: string,
  title: string,
  content: LibraryBenefitContent,
  displayOrder: number,
): WizardBenefit {
  return {
    client_key: id,
    id,
    title,
    description: content.description,
    icon: content.icon,
    category: content.category,
    display_order: displayOrder,
    revision: 1,
  };
}

export { buildAlternativeFromLibraryContent, buildBenefitFromLibraryContent };
