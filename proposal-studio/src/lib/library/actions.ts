"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError, logServerError } from "@/lib/utils/errors";
import {
  libraryAlternativeContentSchema,
  libraryBenefitContentSchema,
  libraryItemCreateSchema,
  libraryItemUpdateSchema,
  libraryItemListFiltersSchema,
} from "@/lib/library/schemas";
import type { LibraryItem } from "@/types/library";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

interface SaveLibraryItemResult {
  id?: string;
  duplicateOf?: { id: string; title: string };
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/** Guarda un bloque (alternativa/beneficio/diagnóstico/recomendación) en la Biblioteca del asesor. */
async function saveLibraryItemAction(input: unknown): Promise<ActionResult<SaveLibraryItemResult>> {
  const guard = await requireActiveMembershipForAction({ surface: "library.save_item" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const parsed = libraryItemCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  if (!parsed.data.force) {
    // Compara título + tipo + contenido contra lo ya guardado antes de insertar
    // (nunca bloquea: si el asesor confirma, `force: true` salta este chequeo).
    const { data: existingItems } = await supabase
      .from("library_items")
      .select("id, title, content_json")
      .eq("user_id", user.id)
      .eq("category", parsed.data.category);

    const normalizedNewTitle = normalizeTitle(parsed.data.title);
    const newContentKey = JSON.stringify(parsed.data.content_json);
    const duplicate = (existingItems ?? []).find(
      (existing) =>
        normalizeTitle(existing.title) === normalizedNewTitle ||
        JSON.stringify(existing.content_json) === newContentKey,
    );

    if (duplicate) {
      return { data: { duplicateOf: { id: duplicate.id, title: duplicate.title } } };
    }
  }

  const { data, error } = await supabase
    .from("library_items")
    .insert({
      user_id: user.id,
      category: parsed.data.category,
      title: parsed.data.title,
      product: parsed.data.product || null,
      content: parsed.data.title,
      content_json: parsed.data.content_json,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("library.save_item", error);
    return { error: error ? mapSupabaseError(error) : "No pudimos guardar en la Biblioteca." };
  }

  revalidatePath("/library");
  return { data: { id: data.id } };
}

/** Actualiza título/producto/contenido de un ítem existente. Mantiene una copia independiente: no toca propuestas donde ya se insertó. */
async function updateLibraryItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const guard = await requireActiveMembershipForAction({ surface: "library.update_item" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const parsed = libraryItemUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .update({
      title: parsed.data.title,
      product: parsed.data.product || null,
      content: parsed.data.title,
      content_json: parsed.data.content_json,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    logServerError("library.update_item", error);
    return { error: error ? mapSupabaseError(error) : "No pudimos actualizar el ítem." };
  }

  revalidatePath("/library");
  return { data: { id: data.id } };
}

/** Lista los bloques de la Biblioteca del asesor, con filtros opcionales por tipo/producto/búsqueda. */
async function listLibraryItemsAction(input: unknown): Promise<ActionResult<LibraryItem[]>> {
  const guard = await requireActiveMembershipForAction({ surface: "library.list_items" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const parsed = libraryItemListFiltersSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Filtros inválidos." };
  }

  const supabase = await createClient();
  let query = supabase
    .from("library_items")
    .select("id, category, title, product, content_json, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (parsed.data.category) {
    query = query.eq("category", parsed.data.category);
  }
  if (parsed.data.product) {
    query = query.eq("product", parsed.data.product);
  }
  if (parsed.data.search) {
    query = query.ilike("title", `%${parsed.data.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    logServerError("library.list_items", error);
    return { error: mapSupabaseError(error) };
  }

  return { data: (data ?? []) as unknown as LibraryItem[] };
}

/** Elimina un bloque de la Biblioteca. No afecta a las propuestas donde ya se insertó una copia. */
async function deleteLibraryItemAction(id: string): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "library.delete_item" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const supabase = await createClient();
  const { error } = await supabase.from("library_items").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    logServerError("library.delete_item", error);
    return { error: mapSupabaseError(error) };
  }

  revalidatePath("/library");
  return {};
}

/**
 * Inserta una alternativa o beneficio de la Biblioteca en una propuesta como
 * COPIA independiente (mismos RPCs de upsert que usa el wizard, `p_id: null`).
 * No queda ninguna referencia al `library_item` original: editar la copia
 * insertada nunca modifica el bloque guardado en la Biblioteca.
 */
async function insertLibraryItemIntoProposalAction(input: {
  proposal_id: string;
  library_item_id: string;
  display_order: number;
}): Promise<ActionResult<{ id: string }>> {
  const guard = await requireActiveMembershipForAction({ surface: "library.insert_item" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("library_items")
    .select("category, title, content_json")
    .eq("id", input.library_item_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemError || !item) {
    return { error: itemError ? mapSupabaseError(itemError) : "Bloque no encontrado en la Biblioteca." };
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("id")
    .eq("id", input.proposal_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (proposalError || !proposal) {
    return { error: proposalError ? mapSupabaseError(proposalError) : "Propuesta no encontrada o sin acceso." };
  }

  if (item.category === "alternative") {
    const content = libraryAlternativeContentSchema.parse(item.content_json);
    const { data, error } = await supabase
      .rpc("upsert_proposal_alternative", {
        p_id: null as unknown as string,
        p_proposal_id: input.proposal_id,
        p_title: item.title,
        p_description: content.description,
        p_category: content.category,
        p_insurance_company: content.insurance_company,
        p_product_name: content.product_name,
        p_currency: content.currency,
        p_monthly_premium: content.monthly_premium as number,
        p_financial_details: {
          advantages: content.advantages,
          disadvantages: content.disadvantages,
          notes: content.notes,
        },
        p_display_order: input.display_order,
        p_expected_revision: null as unknown as number,
      })
      .single();

    if (error || !data) {
      logServerError("library.insert_item.alternative", error);
      return { error: error ? mapSupabaseError(error) : "No pudimos insertar la alternativa." };
    }
    return { data: { id: data.id } };
  }

  if (item.category === "benefit") {
    const content = libraryBenefitContentSchema.parse(item.content_json);
    const { data, error } = await supabase
      .rpc("upsert_proposal_benefit", {
        p_id: null as unknown as string,
        p_proposal_id: input.proposal_id,
        p_title: item.title,
        p_description: content.description,
        p_icon: content.icon,
        p_category: content.category,
        p_display_order: input.display_order,
        p_expected_revision: null as unknown as number,
      })
      .single();

    if (error || !data) {
      logServerError("library.insert_item.benefit", error);
      return { error: error ? mapSupabaseError(error) : "No pudimos insertar el beneficio." };
    }
    return { data: { id: data.id } };
  }

  return { error: "Este tipo de bloque se inserta directamente en el campo de texto." };
}

export {
  saveLibraryItemAction,
  updateLibraryItemAction,
  listLibraryItemsAction,
  deleteLibraryItemAction,
  insertLibraryItemIntoProposalAction,
};
export type { SaveLibraryItemResult };
