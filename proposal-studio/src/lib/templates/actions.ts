"use server";

import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/database/types";
import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError, logServerError } from "@/lib/utils/errors";
import { saveAsTemplateSchema, applyTemplateSchema } from "@/lib/templates/schemas";
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

/** Lista plantillas de sistema + privadas del asesor. */
async function listTemplatesAction(): Promise<ActionResult<TemplateSummary[]>> {
  const guard = await requireActiveMembershipForAction({ surface: "templates.list" });
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_templates")
    .select("id, title, description, category, proposal_type, is_system, updated_at, template_json")
    .order("updated_at", { ascending: false });

  if (error) {
    logServerError("templates.list", error);
    return { error: mapSupabaseError(error) };
  }

  return { data: (data ?? []) as unknown as TemplateSummary[] };
}

/**
 * Crea un draft nuevo a partir de una plantilla, reusando los mismos RPCs de
 * upsert que ya usa el wizard (mismo patrón que `duplicateProposalAction`).
 * Nunca copia cliente/documentos/datos personales: la plantilla ya llega
 * sanitizada desde `saveProposalAsTemplateAction`.
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

  const supabase = await createClient();
  const { data: template, error: templateError } = await supabase
    .from("proposal_templates")
    .select("title, proposal_type, template_json")
    .eq("id", parsed.data.template_id)
    .maybeSingle();

  if (templateError || !template) {
    return { error: templateError ? mapSupabaseError(templateError) : "Plantilla no encontrada." };
  }

  const content = template.template_json as unknown as TemplateJson;

  if (!parsed.data.client_id) {
    return { error: "Seleccioná un cliente para crear la propuesta." };
  }

  const { data: draft, error: draftError } = await supabase
    .rpc("create_draft_proposal", {
      p_client_id: parsed.data.client_id,
      p_title: template.title,
      p_proposal_type: content.proposal_type,
      p_currency: content.currency,
      p_primary_objective: content.primary_objective,
    })
    .single();

  if (draftError || !draft) {
    return { error: draftError ? mapSupabaseError(draftError) : "No pudimos crear la propuesta." };
  }

  const newProposalId = draft.id;

  if (content.product) {
    await supabase.rpc("update_proposal_details", {
      p_id: newProposalId,
      p_client_id: parsed.data.client_id,
      p_title: template.title,
      p_proposal_type: content.proposal_type,
      p_primary_objective: content.primary_objective,
      p_product: content.product,
      p_currency: content.currency,
      p_internal_notes: "",
      p_expected_revision: 0,
    });
  }

  const tasks: PromiseLike<unknown>[] = [];

  if (content.narrative) {
    tasks.push(
      supabase.rpc("upsert_proposal_narrative", {
        p_proposal_id: newProposalId,
        p_current_situation: content.narrative.current_situation ?? "",
        p_detected_needs: content.narrative.detected_needs ?? "",
        p_objectives: content.narrative.objectives ?? "",
        p_detected_risks: content.narrative.detected_risks ?? "",
        p_opportunities: content.narrative.opportunities ?? "",
        p_recommended_strategy: content.narrative.recommended_strategy ?? "",
        p_expected_revision: null as unknown as number,
      }),
    );
  }

  tasks.push(
    ...content.alternatives.map((alternative) =>
      supabase.rpc("upsert_proposal_alternative", {
        p_id: null as unknown as string,
        p_proposal_id: newProposalId,
        p_title: alternative.title,
        p_description: alternative.description ?? "",
        p_category: alternative.category,
        p_insurance_company: alternative.insurance_company,
        p_product_name: alternative.product_name,
        p_currency: alternative.currency,
        p_monthly_premium: alternative.monthly_premium as number,
        p_financial_details: {
          advantages: alternative.financial_details?.advantages ?? [],
          disadvantages: alternative.financial_details?.disadvantages ?? [],
          notes: alternative.financial_details?.notes ?? "",
        },
        p_display_order: alternative.display_order,
        p_expected_revision: null as unknown as number,
      }),
    ),
    ...content.benefits.map((benefit) =>
      supabase.rpc("upsert_proposal_benefit", {
        p_id: null as unknown as string,
        p_proposal_id: newProposalId,
        p_title: benefit.title,
        p_description: benefit.description,
        p_icon: benefit.icon,
        p_category: benefit.category,
        p_display_order: benefit.display_order,
        p_expected_revision: null as unknown as number,
      }),
    ),
  );

  if (content.comparison && content.comparison.columns.length > 0) {
    tasks.push(
      supabase.rpc("upsert_proposal_comparison", {
        p_proposal_id: newProposalId,
        p_columns: content.comparison.columns as unknown as Json,
        p_rows: content.comparison.rows as unknown as Json,
        p_expected_revision: null as unknown as number,
      }),
    );
  }

  await Promise.all(tasks);

  revalidatePath("/dashboard");
  return { data: { id: newProposalId, fieldsRequiringReview: fieldsRequiringReview(content) } };
}

export { saveProposalAsTemplateAction, listTemplatesAction, applyTemplateToNewProposalAction };
export type { TemplateSummary };
