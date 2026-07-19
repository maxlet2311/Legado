import { z } from "zod";

const currencySchema = z.enum(["ARS", "USD", "EUR"]);

const primaryObjectiveSchema = z.enum([
  "protect_family",
  "build_savings",
  "retirement",
  "business_protection",
  "partners_protection",
  "employee_retention",
  "custom",
]);

const proposalDetailsSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid("Seleccioná un cliente."),
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  proposal_type: z.enum(["individual", "corporate"]),
  primary_objective: primaryObjectiveSchema,
  product: z.string().trim().min(1, "El producto es obligatorio.").max(200),
  currency: currencySchema,
  internal_notes: z.string().trim().max(4000).optional().default(""),
  expected_revision: z.number().int().nonnegative(),
});

const clientCreateSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre es obligatorio."),
  client_type: z.enum(["individual", "company"]),
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  phone: z.string().trim().optional().or(z.literal("")),
  company_name: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

const narrativeSchema = z.object({
  proposal_id: z.string().uuid(),
  current_situation: z.string().trim().max(8000).optional().default(""),
  detected_needs: z.string().trim().max(8000).optional().default(""),
  objectives: z.string().trim().max(8000).optional().default(""),
  detected_risks: z.string().trim().max(8000).optional().default(""),
  opportunities: z.string().trim().max(8000).optional().default(""),
  recommended_strategy: z.string().trim().max(8000).optional().default(""),
  expected_revision: z.number().int().nonnegative().nullable(),
});

const alternativeCategorySchema = z.enum([
  "protection",
  "savings",
  "life_with_savings",
  "retirement",
  "business",
]);

const alternativeSchema = z.object({
  id: z.string().uuid().nullable(),
  proposal_id: z.string().uuid(),
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  description: z.string().trim().max(4000).optional().default(""),
  category: alternativeCategorySchema,
  insurance_company: z.string().trim().min(1, "La compañía es obligatoria.").max(200),
  product_name: z.string().trim().min(1, "El nombre del producto es obligatorio.").max(200),
  currency: currencySchema,
  monthly_premium: z.number().nonnegative().nullable(),
  advantages: z
    .array(z.string().trim().max(500))
    .max(20)
    .default([])
    .transform((items) => items.filter((item) => item.length > 0)),
  disadvantages: z
    .array(z.string().trim().max(500))
    .max(20)
    .default([])
    .transform((items) => items.filter((item) => item.length > 0)),
  notes: z.string().trim().max(4000).optional().default(""),
  display_order: z.number().int().nonnegative(),
  expected_revision: z.number().int().nonnegative().nullable(),
});

const benefitCategorySchema = z.enum([
  "family",
  "retirement",
  "tax",
  "business",
  "legal",
  "financial",
  "health",
  "succession",
]);

const benefitSchema = z.object({
  id: z.string().uuid().nullable(),
  proposal_id: z.string().uuid(),
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  description: z.string().trim().min(1, "La descripción es obligatoria.").max(2000),
  icon: z.string().trim().min(1).max(60),
  category: benefitCategorySchema,
  display_order: z.number().int().nonnegative(),
  expected_revision: z.number().int().nonnegative().nullable(),
});

// Sin HTML ni scripts: solo texto plano corto por celda, apto para el motor de PDF.
const plainTextCell = z
  .string()
  .trim()
  .max(300)
  .refine((value) => !/[<>]/.test(value), "No se permite HTML en la comparativa.");

const comparisonColumnSchema = z.object({
  id: z.string().min(1).max(60),
  label: plainTextCell.pipe(z.string().min(1, "La columna necesita un título.")),
});

const comparisonRowSchema = z.object({
  id: z.string().min(1).max(60),
  label: plainTextCell.pipe(z.string().min(1, "La fila necesita un título.")),
  values: z.record(z.string().min(1).max(60), plainTextCell),
});

const comparisonSchema = z.object({
  proposal_id: z.string().uuid(),
  columns: z.array(comparisonColumnSchema).max(12),
  rows: z.array(comparisonRowSchema).max(50),
  expected_revision: z.number().int().nonnegative().nullable(),
});

const reorderSchema = z.object({
  proposal_id: z.string().uuid(),
  ordered_ids: z.array(z.string().uuid()).min(1),
});

export {
  currencySchema,
  primaryObjectiveSchema,
  proposalDetailsSchema,
  clientCreateSchema,
  narrativeSchema,
  alternativeCategorySchema,
  alternativeSchema,
  benefitCategorySchema,
  benefitSchema,
  comparisonColumnSchema,
  comparisonRowSchema,
  comparisonSchema,
  reorderSchema,
};
