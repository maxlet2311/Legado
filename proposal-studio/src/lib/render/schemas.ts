import { z } from "zod";

/**
 * Valida `render_json` (columna `Json` sin tipar) antes de construir el
 * snapshot que consume el renderer. `render_json` lo produce exclusivamente
 * `emit_proposal_version` (RPC de confianza), pero se valida igual: es la
 * frontera entre "dato jsonb crudo de Postgres" y "árbol de componentes".
 */

const currencySchema = z.enum(["ARS", "USD", "EUR"]);

const proposalSchema = z.object({
  id: z.string(),
  proposal_number: z.string(),
  title: z.string(),
  primary_objective: z.string(),
  proposal_type: z.enum(["individual", "corporate"]),
  product: z.string().nullable(),
  currency: currencySchema,
  orientation: z.enum(["portrait", "landscape"]),
  theme: z.string(),
  font_family: z.string(),
  pdf_format: z.enum(["A4", "Letter"]),
  margin_size: z.enum(["small", "medium", "large"]),
  show_cover: z.boolean(),
  show_summary: z.boolean(),
  show_footer: z.boolean(),
  show_page_numbers: z.boolean(),
  show_legal_note: z.boolean(),
  show_watermark: z.boolean(),
  watermark_text: z.string().nullable(),
  primary_color_override: z.string().nullable(),
  secondary_color_override: z.string().nullable(),
});

const clientSchema = z
  .object({
    id: z.string(),
    full_name: z.string(),
    company_name: z.string().nullable(),
    client_type: z.enum(["individual", "company"]),
    email: z.string(),
    phone: z.string().nullable(),
  })
  .nullable();

const brandSchema = z
  .object({
    id: z.string(),
    commercial_name: z.string(),
    advisor_name: z.string(),
    license_number: z.string().nullable(),
    logo_url: z.string().nullable(),
    primary_color: z.string(),
    secondary_color: z.string(),
    accent_color: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    whatsapp: z.string().nullable(),
    website: z.string().nullable(),
    address: z.string().nullable(),
    footer_text: z.string().nullable(),
    signature_image: z.string().nullable(),
  })
  .nullable();

const narrativeSchema = z
  .object({
    executive_summary: z.string().nullable().default(null),
    current_situation: z.string().nullable().default(null),
    detected_needs: z.string().nullable().default(null),
    objectives: z.string().nullable().default(null),
    detected_risks: z.string().nullable().default(null),
    opportunities: z.string().nullable().default(null),
    recommended_strategy: z.string().nullable().default(null),
    expected_result: z.string().nullable().default(null),
    final_message: z.string().nullable().default(null),
  })
  .nullable();

const alternativeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  insurance_company: z.string(),
  product_name: z.string(),
  currency: currencySchema,
  monthly_premium: z.number().nullable(),
  annual_premium: z.number().nullable(),
  insured_amount: z.number().nullable(),
  is_recommended: z.boolean(),
  recommended_reason: z.string().nullable(),
  financial_details: z
    .object({
      advantages: z.array(z.string()).optional(),
      disadvantages: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
    .nullable(),
  highlight_label: z.string().nullable(),
  display_order: z.number(),
});

const benefitSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  category: z.string(),
  display_order: z.number(),
});

const comparisonSchema = z.object({
  columns: z.array(z.object({ id: z.string(), label: z.string() })),
  rows: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      values: z.record(z.string(), z.string()),
    }),
  ),
});

const templateSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    template_json: z.object({ sections: z.array(z.string()).optional() }).nullable(),
  })
  .nullable();

const documentRenderJsonSchema = z.object({
  proposal: proposalSchema,
  client: clientSchema,
  brand: brandSchema,
  narrative: narrativeSchema,
  alternatives: z.array(alternativeSchema),
  benefits: z.array(benefitSchema),
  comparison: comparisonSchema,
  template: templateSchema,
  version_number: z.number(),
  issued_at: z.string(),
  checksum: z.string(),
  schema_version: z.number(),
});

export { documentRenderJsonSchema };
