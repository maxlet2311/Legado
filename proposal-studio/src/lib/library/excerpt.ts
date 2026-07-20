import type { LibraryItem } from "@/types/library";

/** Extracto de una línea del contenido de un ítem de Biblioteca, para mostrar en la tarjeta sin abrir un diálogo. */
function libraryItemExcerpt(item: LibraryItem): string {
  const content = item.content_json;
  if ("text" in content) return content.text;
  if ("insurance_company" in content) {
    return content.description?.trim() || `${content.insurance_company} · ${content.product_name}`;
  }
  return content.description;
}

export { libraryItemExcerpt };
