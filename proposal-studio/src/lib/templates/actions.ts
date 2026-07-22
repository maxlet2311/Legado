"use server";

import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/database/types";
import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError, logServerError } from "@/lib/utils/errors";
import { saveAsTemplateSchema, applyTemplateSchema, updateTemplateSchema } from "@/lib/templates/schemas";
import {
  sanitizeProposalForTemplate,
  fieldsRequiringReview,
  type TemplateJson,
  type RawAlternative,
  type RawBenefit,
  type RawComparison,
} from "@/lib/templates/sanitize";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

interface TemplateSummary {
  id: string;
  title: string;
  description: string | null;
  category: string;
  proposal_type: string;
  is_system: boolean;
  is_active: boolean;
  updated_at: string;
  template_json: TemplateJson;
}

/** Guarda la propuesta actual como plantilla reutilizable, sanitizada (sin cliente ni montos reales). */
async function saveProposalAsTemplateAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const guard = await requireActiveMembershipForAction({ surface: "templates.save" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const parsed = saveAsTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const [proposalResult, narrativeResult, alternativesResult, benefitsResult, comparisonResult] =
    await Promise.all([
      supabase
        .from("proposals")
        .select("proposal_type, primary_objective, product, currency")
        .eq("id", parsed.data.proposal_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("proposal_narratives")
        .select("current_situation, detected_needs, objectives, detected_risks, opportunities, recommended_strategy")
        .eq("proposal_id", parsed.data.proposal_id)
        .maybeSingle(),
      supabase
        .from("proposal_alternatives")
        .select(
          "title, description, category, insurance_company, product_name, currency, monthly_premium, financial_details, display_order",
        )
        .eq("proposal_id", parsed.data.proposal_id)
        .order("display_order", { ascending: true }),
      supabase
        .from("proposal_benefits")
        .select("title, description, icon, category, display_order")
        .eq("proposal_id", parsed.data.proposal_id)
        .order("display_order", { ascending: true }),
      supabase.from("proposal_comparisons").select("columns, rows").eq("proposal_id", parsed.data.proposal_id).maybeSingle(),
    ]);

  const source = proposalResult.data;
  if (!source) return { error: "Propuesta no encontrada o sin acceso." };

  const templateJson = sanitizeProposalForTemplate(
    {
      proposal_type: source.proposal_type,
      primary_objective: source.primary_objective,
      product: source.product,
      currency: source.currency,
      narrative: narrativeResult.data,
      alternatives: (alternativesResult.data ?? []) as unknown as RawAlternative[],
      benefits: (benefitsResult.data ?? []) as unknown as RawBenefit[],
      comparison: comparisonResult.data as unknown as RawComparison | null,
    },
    parsed.data.keep_example_amounts,
  );

  const { data, error } = await supabase
    .from("proposal_templates")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      proposal_type: source.proposal_type,
      category: parsed.data.category,
      template_json: templateJson as unknown as Json,
      is_system: false,
      user_id: user.id,
      is_default: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("templates.save", error);
    return { error: error ? mapSupabaseError(error) : "No pudimos guardar la plantilla." };
  }

  revalidatePath("/library");
  return { data: { id: data.id } };
}

type TemplateActiveFilter = "active" | "inactive" | "all";

/**
 * Lista plantillas de sistema + privadas del asesor, filtrando por estado
 * server-side (nunca trae "todas" para filtrar después en el cliente):
 * - "active" (default): solo activas -- vista normal de uso diario.
 * - "inactive": solo las que el asesor desactivó -- para reactivarlas.
 * - "all": ambas, para el selector "Todas".
 */
async function listTemplatesAction(filter: TemplateActiveFilter = "active"): Promise<ActionResult<TemplateSummary[]>> {
  const guard = await requireActiveMembershipForAction({ surface: "templates.list" });
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();
  let query = supabase
    .from("proposal_templates")
    .select("id, title, description, category, proposal_type, is_system, is_active, updated_at, template_json")
    .order("updated_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("is_active", filter === "active");
  }

  const { data, error } = await query;

  if (error) {
    logServerError("templates.list", error);
    return { error: mapSupabaseError(error) };
  }

  return { data: (data ?? []) as unknown as TemplateSummary[] };
}

const updateTemplateSelect = "id, title, description, category, proposal_type, is_system, is_active, updated_at, template_json";

/** Edita título/descripción/categoría de una plantilla propia (RLS bloquea tocar plantillas de sistema o ajenas). */
async function updateTemplateAction(input: unknown): Promise<ActionResult<TemplateSummary>> {
  const guard = await requireActiveMembershipForAction({ surface: "templates.update" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const parsed = updateTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_templates")
    .update({ title: parsed.data.title, description: parsed.data.description || null, category: parsed.data.category })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .eq("is_system", false)
    .select(updateTemplateSelect)
    .maybeSingle();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "Plantilla no encontrada o sin acceso." };
  }

  revalidatePath("/library");
  return { data: data as unknown as TemplateSummary };
}

/** Activa/desactiva una plantilla propia. Una plantilla de sistema nunca puede desactivarse (RLS lo bloquea). */
async function setTemplateActiveAction(id: string, isActive: boolean): Promise<ActionResult<TemplateSummary>> {
  const guard = await requireActiveMembershipForAction({ surface: "templates.set_active" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_templates")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_system", false)
    .select(updateTemplateSelect)
    .maybeSingle();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "Plantilla no encontrada o sin acceso." };
  }

  revalidatePath("/library");
  return { data: data as unknown as TemplateSummary };
}

/**
 * Duplica una plantilla (propia o de sistema) como una plantilla propia nueva
 * y activa. Nunca modifica el original -- mismo criterio que duplicar una
 * propuesta o un bloque del wizard.
 */
async function duplicateTemplateAction(id: string): Promise<ActionResult<TemplateSummary>> {
  const guard = await requireActiveMembershipForAction({ surface: "templates.duplicate" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const supabase = await createClient();
  const { data: source, error: sourceError } = await supabase
    .from("proposal_templates")
    .select("title, description, category, proposal_type, template_json")
    .eq("id", id)
    .maybeSingle();

  if (sourceError || !source) {
    return { error: sourceError ? mapSupabaseError(sourceError) : "Plantilla no encontrada o sin acceso." };
  }

  const { data, error } = await supabase
    .from("proposal_templates")
    .insert({
      title: `${source.title} (copia)`,
      description: source.description,
      category: source.category,
      proposal_type: source.proposal_type,
      template_json: source.template_json,
      is_system: false,
      is_default: false,
      is_active: true,
      user_id: user.id,
    })
    .select(updateTemplateSelect)
    .single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "No pudimos duplicar la plantilla." };
  }

  revalidatePath("/library");
  return { data: data as unknown as TemplateSummary };
}

/**
 * Crea un draft nuevo a partir de una plantilla vía `apply_template_to_new_proposal`,
 * un único RPC transaccional (Postgres): si algo falla a mitad de camino no
 * queda ninguna propuesta a medio completar. Nunca copia cliente/documentos/
 * datos personales: la plantilla ya llega sanitizada desde `saveProposalAsTemplateAction`.
 */
async function applyTemplateToNewProposalAction(
  input: unknown,
): Promise<ActionResult<{ id: string; fieldsRequiringReview: string[] }>> {
  const guard = await requireActiveMembershipForAction({ surface: "templates.apply" });
  if (!guard.ok) return { error: guard.error };

  const parsed = applyTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  if (!parsed.data.client_id) {
    return { error: "Seleccioná un cliente para crear la propuesta." };
  }

  const supabase = await createClient();

  // Solo lectura, para calcular `fieldsRequiringReview` en JS reusando
  // `sanitize.ts` -- la creación real ocurre entera dentro del RPC de abajo.
  const { data: template, error: templateError } = await supabase
    .from("proposal_templates")
    .select("template_json")
    .eq("id", parsed.data.template_id)
    .maybeSingle();

  if (templateError || !template) {
    return { error: templateError ? mapSupabaseError(templateError) : "Plantilla no encontrada." };
  }

  const content = template.template_json as unknown as TemplateJson;

  const { data: created, error: createError } = await supabase
    .rpc("apply_template_to_new_proposal", {
      p_template_id: parsed.data.template_id,
      p_client_id: parsed.data.client_id,
    })
    .single();

  if (createError || !created) {
    return { error: createError ? mapSupabaseError(createError) : "No pudimos crear la propuesta." };
  }

  revalidatePath("/dashboard");
  return { data: { id: created.id, fieldsRequiringReview: fieldsRequiringReview(content) } };
}

export {
  saveProposalAsTemplateAction,
  listTemplatesAction,
  applyTemplateToNewProposalAction,
  updateTemplateAction,
  setTemplateActiveAction,
  duplicateTemplateAction,
};
export type { TemplateSummary, TemplateActiveFilter };
