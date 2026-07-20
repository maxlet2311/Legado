interface RawAlternative {
  title: string;
  description: string | null;
  category: string;
  insurance_company: string;
  product_name: string;
  currency: string;
  monthly_premium: number | null;
  financial_details: { advantages?: string[]; disadvantages?: string[]; notes?: string } | null;
  display_order: number;
}

interface RawBenefit {
  title: string;
  description: string;
  icon: string;
  category: string;
  display_order: number;
}

interface RawNarrative {
  current_situation: string | null;
  detected_needs: string | null;
  objectives: string | null;
  detected_risks: string | null;
  opportunities: string | null;
  recommended_strategy: string | null;
}

interface RawComparison {
  columns: unknown[];
  rows: unknown[];
}

interface RawProposalBundle {
  proposal_type: string;
  primary_objective: string;
  product: string | null;
  currency: string;
  narrative: RawNarrative | null;
  alternatives: RawAlternative[];
  benefits: RawBenefit[];
  comparison: RawComparison | null;
}

interface TemplateJson {
  proposal_type: string;
  primary_objective: string;
  product: string | null;
  currency: string;
  narrative: RawNarrative | null;
  alternatives: Array<Omit<RawAlternative, "monthly_premium"> & { monthly_premium: number | null }>;
  benefits: RawBenefit[];
  comparison: RawComparison | null;
  is_example_values: boolean;
}

/**
 * Arma el `template_json` a guardar en `proposal_templates`. Nunca incluye
 * `client_id` ni ningún dato de `clients` (el bundle de entrada ya no los trae).
 * Por defecto anula los montos (`monthly_premium`) salvo que el asesor tilde
 * explícitamente "usar como valores de ejemplo" (`keepExampleAmounts`).
 */
function sanitizeProposalForTemplate(
  bundle: RawProposalBundle,
  keepExampleAmounts: boolean,
): TemplateJson {
  return {
    proposal_type: bundle.proposal_type,
    primary_objective: bundle.primary_objective,
    product: bundle.product,
    currency: bundle.currency,
    narrative: bundle.narrative,
    alternatives: bundle.alternatives.map((alt) => ({
      ...alt,
      monthly_premium: keepExampleAmounts ? alt.monthly_premium : null,
    })),
    benefits: bundle.benefits,
    comparison: bundle.comparison,
    is_example_values: keepExampleAmounts,
  };
}

/** Campos que quedan en null/placeholder tras aplicar la plantilla y requieren revisión del asesor. */
function fieldsRequiringReview(template: TemplateJson): string[] {
  const fields: string[] = [];
  if (!template.is_example_values && template.alternatives.some((a) => a.monthly_premium === null)) {
    fields.push("monthly_premium");
  }
  if (!template.narrative || !template.narrative.current_situation?.trim()) {
    fields.push("current_situation");
  }
  return fields;
}

export { sanitizeProposalForTemplate, fieldsRequiringReview };
export type { RawProposalBundle, TemplateJson, RawAlternative, RawBenefit, RawNarrative, RawComparison };
