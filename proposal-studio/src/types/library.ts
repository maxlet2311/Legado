import type { z } from "zod";

import type {
  libraryAlternativeContentSchema,
  libraryBenefitContentSchema,
  libraryCategorySchema,
  libraryContentSchema,
  libraryTextContentSchema,
} from "@/lib/library/schemas";

export type LibraryCategory = z.infer<typeof libraryCategorySchema>;
export type LibraryAlternativeContent = z.infer<typeof libraryAlternativeContentSchema>;
export type LibraryBenefitContent = z.infer<typeof libraryBenefitContentSchema>;
export type LibraryTextContent = z.infer<typeof libraryTextContentSchema>;
export type LibraryContent = z.infer<typeof libraryContentSchema>;

export interface LibraryItem {
  id: string;
  category: LibraryCategory;
  title: string;
  product: string | null;
  content_json: LibraryContent;
  created_at: string;
  updated_at: string;
}
