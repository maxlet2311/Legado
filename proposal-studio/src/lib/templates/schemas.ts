import { z } from "zod";

const templateCategorySchema = z.enum(["family", "savings", "retirement", "business"]);

const saveAsTemplateSchema = z.object({
  proposal_id: z.string().uuid(),
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  description: z.string().trim().max(1000).optional().default(""),
  category: templateCategorySchema,
  keep_example_amounts: z.boolean().default(false),
});

const applyTemplateSchema = z.object({
  template_id: z.string().uuid(),
  client_id: z.string().uuid().nullable(),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  description: z.string().trim().max(1000).optional().default(""),
  category: templateCategorySchema,
});

export { templateCategorySchema, saveAsTemplateSchema, applyTemplateSchema, updateTemplateSchema };
