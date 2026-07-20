import { z } from "zod";

import { alternativeCategorySchema, benefitCategorySchema, currencySchema } from "../wizard/schemas.ts";

const libraryCategorySchema = z.enum(["alternative", "benefit", "diagnosis", "recommendation"]);

const libraryAlternativeContentSchema = z.object({
  category: alternativeCategorySchema,
  description: z.string().trim().max(4000).optional().default(""),
  insurance_company: z.string().trim().min(1).max(200),
  product_name: z.string().trim().min(1).max(200),
  currency: currencySchema,
  monthly_premium: z.number().nonnegative().nullable(),
  advantages: z.array(z.string().trim().max(500)).max(20).default([]),
  disadvantages: z.array(z.string().trim().max(500)).max(20).default([]),
  notes: z.string().trim().max(4000).optional().default(""),
});

const libraryBenefitContentSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  icon: z.string().trim().min(1).max(60),
  category: benefitCategorySchema,
});

const libraryTextContentSchema = z.object({
  text: z.string().trim().min(1).max(8000),
});

const libraryContentSchema = z.union([
  libraryAlternativeContentSchema,
  libraryBenefitContentSchema,
  libraryTextContentSchema,
]);

const libraryItemCreateSchema = z.object({
  category: libraryCategorySchema,
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  product: z.string().trim().max(200).optional().or(z.literal("")),
  content_json: libraryContentSchema,
  force: z.boolean().optional().default(false),
});

const libraryItemUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  product: z.string().trim().max(200).optional().or(z.literal("")),
  content_json: libraryContentSchema,
});

const libraryItemListFiltersSchema = z.object({
  category: libraryCategorySchema.optional(),
  product: z.string().trim().max(200).optional(),
  search: z.string().trim().max(200).optional(),
});

export {
  libraryCategorySchema,
  libraryAlternativeContentSchema,
  libraryBenefitContentSchema,
  libraryTextContentSchema,
  libraryContentSchema,
  libraryItemCreateSchema,
  libraryItemUpdateSchema,
  libraryItemListFiltersSchema,
};
