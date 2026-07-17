"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError, detectConflict } from "@/lib/utils/errors";
import {
  proposalDetailsSchema,
  clientCreateSchema,
  narrativeSchema,
  alternativeSchema,
  benefitSchema,
  comparisonSchema,
  reorderSchema,
} from "@/lib/wizard/schemas";
import type { WizardClient } from "@/types/wizard";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
  conflict?: boolean;
  currentRevision?: number | null;
}

/** Paso 1: crea un cliente sin salir del wizard y lo devuelve para seleccionarlo. */
async function createWizardClientAction(
  input: unknown,
): Promise<ActionResult<WizardClient>> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.create_client" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;
  const parsed = clientCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id, full_name, company_name, client_type, email, phone")
    .single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "No pudimos crear el cliente." };
  }

  revalidatePath("/clients");
  return { data: data as WizardClient };
}

/** Paso 1: crea el borrador de propuesta a partir del cliente elegido y abre el wizard. */
async function createDraftFromClientAction(clientId: string): Promise<ActionResult<{ id: string }>> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.create_draft_from_client" });
  if (!guard.ok) return { error: guard.error };
  if (!clientId) {
    return { error: "Seleccioná un cliente." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_draft_proposal", {
      p_client_id: clientId,
      p_title: "Nueva propuesta",
      p_proposal_type: "individual",
      p_currency: "ARS",
      p_primary_objective: "custom",
    })
    .single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "No pudimos crear la propuesta." };
  }

  return { data: { id: data.id } };
}

/** Pasos 1 y 2: metadatos de la propuesta (cliente, título, tipo, producto, moneda, notas). */
async function updateProposalDetailsAction(
  input: unknown,
): Promise<ActionResult<{ updated_at: string; revision: number }>> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.update_proposal_details" });
  if (!guard.ok) return { error: guard.error };
  const parsed = proposalDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("update_proposal_details", {
      p_id: parsed.data.id,
      p_client_id: parsed.data.client_id,
      p_title: parsed.data.title,
      p_proposal_type: parsed.data.proposal_type,
      p_primary_objective: parsed.data.primary_objective,
      p_product: parsed.data.product,
      p_currency: parsed.data.currency,
      p_internal_notes: parsed.data.internal_notes ?? "",
      p_expected_revision: parsed.data.expected_revision,
    })
    .single();

  if (error || !data) {
    const { isConflict, currentRevision } = detectConflict(error);
    if (isConflict) {
      return { conflict: true, currentRevision, error: "Se modificó en otra sesión." };
    }
    return { error: error ? mapSupabaseError(error) : "Propuesta no encontrada o sin acceso." };
  }

  revalidatePath(`/proposal/${parsed.data.id}`);
  return { data: { updated_at: data.updated_at, revision: data.revision } };
}

/** Pasos 3 y 5: diagnóstico y recomendación (proposal_narratives). */
async function upsertNarrativeAction(
  input: unknown,
): Promise<ActionResult<{ updated_at: string; revision: number }>> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.upsert_narrative" });
  if (!guard.ok) return { error: guard.error };
  const parsed = narrativeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("upsert_proposal_narrative", {
      p_proposal_id: parsed.data.proposal_id,
      p_current_situation: parsed.data.current_situation ?? "",
      p_detected_needs: parsed.data.detected_needs ?? "",
      p_objectives: parsed.data.objectives ?? "",
      p_detected_risks: parsed.data.detected_risks ?? "",
      p_opportunities: parsed.data.opportunities ?? "",
      p_recommended_strategy: parsed.data.recommended_strategy ?? "",
      // p_expected_revision es NULL-able en Postgres (todavía no existe fila);
      // ver nota en saveAlternativeAction.
      p_expected_revision: parsed.data.expected_revision as number,
    })
    .single();

  if (error || !data) {
    const { isConflict, currentRevision } = detectConflict(error);
    if (isConflict) {
      return { conflict: true, currentRevision, error: "Se modificó en otra sesión." };
    }
    return { error: error ? mapSupabaseError(error) : "Propuesta no encontrada o sin acceso." };
  }

  return { data: { updated_at: data.updated_at, revision: data.revision } };
}

/** Paso 4: alta/edición de una alternativa. */
async function saveAlternativeAction(
  input: unknown,
): Promise<ActionResult<{ id: string; revision: number }>> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.save_alternative" });
  if (!guard.ok) return { error: guard.error };
  const parsed = alternativeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("upsert_proposal_alternative", {
      // p_id, p_monthly_premium y p_expected_revision son NULL-ables en Postgres
      // (alta vs. edición, campo opcional); los tipos generados no reflejan esa
      // nulabilidad de argumentos de RPC.
      p_id: parsed.data.id as string,
      p_proposal_id: parsed.data.proposal_id,
      p_title: parsed.data.title,
      p_description: parsed.data.description ?? "",
      p_category: parsed.data.category,
      p_insurance_company: parsed.data.insurance_company,
      p_product_name: parsed.data.product_name,
      p_currency: parsed.data.currency,
      p_monthly_premium: parsed.data.monthly_premium as number,
      p_financial_details: {
        advantages: parsed.data.advantages,
        disadvantages: parsed.data.disadvantages,
        notes: parsed.data.notes ?? "",
      },
      p_display_order: parsed.data.display_order,
      p_expected_revision: parsed.data.expected_revision as number,
    })
    .single();

  if (error || !data) {
    const { isConflict, currentRevision } = detectConflict(error);
    if (isConflict) {
      return { conflict: true, currentRevision, error: "Se modificó en otra sesión." };
    }
    return { error: error ? mapSupabaseError(error) : "No pudimos guardar la alternativa." };
  }

  return { data: { id: data.id, revision: data.revision } };
}

async function deleteAlternativeAction(proposalId: string, id: string): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.delete_alternative" });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_proposal_alternative", {
    p_id: id,
    p_proposal_id: proposalId,
  });

  if (error) {
    return { error: mapSupabaseError(error) };
  }
  return {};
}

async function reorderAlternativesAction(input: unknown): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.reorder_alternatives" });
  if (!guard.ok) return { error: guard.error };
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_proposal_alternatives", {
    p_proposal_id: parsed.data.proposal_id,
    p_ordered_ids: parsed.data.ordered_ids,
  });

  if (error) {
    return { error: mapSupabaseError(error) };
  }
  return {};
}

/** Paso 6: alta/edición de un beneficio. */
async function saveBenefitAction(
  input: unknown,
): Promise<ActionResult<{ id: string; revision: number }>> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.save_benefit" });
  if (!guard.ok) return { error: guard.error };
  const parsed = benefitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("upsert_proposal_benefit", {
      // p_id y p_expected_revision son NULL-ables en Postgres (alta vs. edición);
      // ver nota en saveAlternativeAction.
      p_id: parsed.data.id as string,
      p_proposal_id: parsed.data.proposal_id,
      p_title: parsed.data.title,
      p_description: parsed.data.description,
      p_icon: parsed.data.icon,
      p_category: parsed.data.category,
      p_display_order: parsed.data.display_order,
      p_expected_revision: parsed.data.expected_revision as number,
    })
    .single();

  if (error || !data) {
    const { isConflict, currentRevision } = detectConflict(error);
    if (isConflict) {
      return { conflict: true, currentRevision, error: "Se modificó en otra sesión." };
    }
    return { error: error ? mapSupabaseError(error) : "No pudimos guardar el beneficio." };
  }

  return { data: { id: data.id, revision: data.revision } };
}

async function deleteBenefitAction(proposalId: string, id: string): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.delete_benefit" });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_proposal_benefit", {
    p_id: id,
    p_proposal_id: proposalId,
  });

  if (error) {
    return { error: mapSupabaseError(error) };
  }
  return {};
}

async function reorderBenefitsAction(input: unknown): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.reorder_benefits" });
  if (!guard.ok) return { error: guard.error };
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_proposal_benefits", {
    p_proposal_id: parsed.data.proposal_id,
    p_ordered_ids: parsed.data.ordered_ids,
  });

  if (error) {
    return { error: mapSupabaseError(error) };
  }
  return {};
}

/** Paso 7: comparativa (tabla dinámica). */
async function upsertComparisonAction(
  input: unknown,
): Promise<ActionResult<{ updated_at: string; revision: number }>> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.upsert_comparison" });
  if (!guard.ok) return { error: guard.error };
  const parsed = comparisonSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("upsert_proposal_comparison", {
      p_proposal_id: parsed.data.proposal_id,
      p_columns: parsed.data.columns,
      p_rows: parsed.data.rows,
      // p_expected_revision es NULL-able en Postgres (todavía no existe fila);
      // ver nota en saveAlternativeAction.
      p_expected_revision: parsed.data.expected_revision as number,
    })
    .single();

  if (error || !data) {
    const { isConflict, currentRevision } = detectConflict(error);
    if (isConflict) {
      return { conflict: true, currentRevision, error: "Se modificó en otra sesión." };
    }
    return { error: error ? mapSupabaseError(error) : "Propuesta no encontrada o sin acceso." };
  }

  return { data: { updated_at: data.updated_at, revision: data.revision } };
}

/** Paso 8: cierre de la propuesta. El RPC valida en servidor los datos mínimos. */
async function finalizeProposalAction(proposalId: string): Promise<ActionResult<{ status: string }>> {
  const guard = await requireActiveMembershipForAction({ surface: "wizard.finalize_proposal" });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalize_proposal", { p_id: proposalId }).single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "No pudimos finalizar la propuesta." };
  }

  revalidatePath(`/proposal/${proposalId}`);
  revalidatePath("/dashboard");
  return { data: { status: data.status } };
}

export {
  createWizardClientAction,
  createDraftFromClientAction,
  updateProposalDetailsAction,
  upsertNarrativeAction,
  saveAlternativeAction,
  deleteAlternativeAction,
  reorderAlternativesAction,
  saveBenefitAction,
  deleteBenefitAction,
  reorderBenefitsAction,
  upsertComparisonAction,
  finalizeProposalAction,
};
