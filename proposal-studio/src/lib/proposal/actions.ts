"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError } from "@/lib/utils/errors";

interface ActionResult<T = undefined> {
  error?: string;
  success?: boolean;
  data?: T;
}

const draftProposalSchema = z.object({
  client_id: z.string().uuid("Seleccioná un cliente."),
  title: z.string().trim().min(1, "El título es obligatorio."),
  proposal_type: z.enum(["individual", "corporate"]),
  currency: z.enum(["ARS", "USD", "EUR"]),
  primary_objective: z.enum([
    "protect_family",
    "build_savings",
    "retirement",
    "business_protection",
    "partners_protection",
    "employee_retention",
    "custom",
  ]),
});

async function createDraftProposalAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "proposal.create_draft" });
  if (!guard.ok) return { error: guard.error };

  const parsed = draftProposalSchema.safeParse({
    client_id: formData.get("client_id"),
    title: formData.get("title"),
    proposal_type: formData.get("proposal_type"),
    currency: formData.get("currency"),
    primary_objective: formData.get("primary_objective"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();

  // create_draft_proposal es una función RPC transaccional: inserta la
  // propuesta y su proposal_event de auditoría en la misma transacción, así
  // nunca queda una propuesta creada sin su evento (o viceversa).
  const { data, error } = await supabase
    .rpc("create_draft_proposal", {
      p_client_id: parsed.data.client_id,
      p_title: parsed.data.title,
      p_proposal_type: parsed.data.proposal_type,
      p_currency: parsed.data.currency,
      p_primary_objective: parsed.data.primary_objective,
    })
    .single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "No pudimos crear la propuesta." };
  }

  redirect(`/proposal/${data.id}`);
}

const updateProposalMetaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "El título es obligatorio."),
});

async function updateProposalMetaAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "proposal.update_meta" });
  if (!guard.ok) return { error: guard.error };

  const parsed = updateProposalMetaSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("update_proposal_meta", { p_id: parsed.data.id, p_title: parsed.data.title })
    .single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "Propuesta no encontrada o sin acceso." };
  }

  revalidatePath(`/proposal/${parsed.data.id}`);
  return { success: true };
}

async function archiveProposalAction(proposalId: string): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "proposal.archive" });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("archive_proposal", { p_id: proposalId }).single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "Propuesta no encontrada o sin acceso." };
  }

  revalidatePath(`/proposal/${proposalId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

const COMMERCIAL_STATUSES = ["draft", "sent", "negotiation", "accepted", "rejected", "archived"] as const;

/** Cambia la etapa comercial (venta) de la propuesta. Editable libremente, sin las validaciones de `finalize_proposal`. */
async function updateProposalCommercialStatusAction(
  proposalId: string,
  status: (typeof COMMERCIAL_STATUSES)[number],
): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "proposal.update_commercial_status" });
  if (!guard.ok) return { error: guard.error };
  if (!COMMERCIAL_STATUSES.includes(status)) {
    return { error: "Estado comercial inválido." };
  }
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("update_proposal_commercial_status", { p_id: proposalId, p_status: status })
    .single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "Propuesta no encontrada o sin acceso." };
  }

  revalidatePath(`/proposal/${proposalId}`);
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Cambia la orientación del PDF (vertical/horizontal). Usa el mismo renderer: solo cambia el CSS `@page` según `document-shell.tsx`. */
async function updateProposalOrientationAction(
  proposalId: string,
  orientation: "portrait" | "landscape",
): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "proposal.update_orientation" });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("update_proposal_orientation", { p_id: proposalId, p_orientation: orientation })
    .single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "Propuesta no encontrada o sin acceso." };
  }

  revalidatePath(`/proposal/${proposalId}`);
  revalidatePath(`/proposal/${proposalId}/edit`);
  return { success: true };
}

/**
 * Duplica una propuesta completa (auditoría del editor, 3.6 -- "el hueco más
 * costoso del editor actual"). No usa ningún RPC ni tabla nueva: crea el
 * borrador con `create_draft_proposal` y reutiliza uno por uno los mismos
 * RPCs de upsert que ya usa el wizard para narrativa/alternativas/
 * beneficios/comparativa. Ningún cambio de modelo de datos ni de versionado.
 */
async function duplicateProposalAction(proposalId: string): Promise<ActionResult<{ id: string }>> {
  const guard = await requireActiveMembershipForAction({ surface: "proposal.duplicate" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;
  const supabase = await createClient();

  const [proposalResult, narrativeResult, alternativesResult, benefitsResult, comparisonResult] =
    await Promise.all([
      supabase
        .from("proposals")
        .select("id, client_id, title, proposal_type, primary_objective, product, currency")
        .eq("id", proposalId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("proposal_narratives")
        .select(
          "current_situation, detected_needs, objectives, detected_risks, opportunities, recommended_strategy",
        )
        .eq("proposal_id", proposalId)
        .maybeSingle(),
      supabase
        .from("proposal_alternatives")
        .select(
          "title, description, category, insurance_company, product_name, currency, monthly_premium, financial_details, display_order",
        )
        .eq("proposal_id", proposalId)
        .order("display_order", { ascending: true }),
      supabase
        .from("proposal_benefits")
        .select("title, description, icon, category, display_order")
        .eq("proposal_id", proposalId)
        .order("display_order", { ascending: true }),
      supabase
        .from("proposal_comparisons")
        .select("columns, rows")
        .eq("proposal_id", proposalId)
        .maybeSingle(),
    ]);

  const source = proposalResult.data;
  if (!source) {
    return { error: "Propuesta no encontrada o sin acceso." };
  }

  const { data: draft, error: draftError } = await supabase
    .rpc("create_draft_proposal", {
      p_client_id: source.client_id,
      p_title: `${source.title} (copia)`,
      p_proposal_type: source.proposal_type,
      p_currency: source.currency,
      p_primary_objective: source.primary_objective,
      p_duplicated_from_id: proposalId,
    })
    .single();

  if (draftError || !draft) {
    return { error: draftError ? mapSupabaseError(draftError) : "No pudimos duplicar la propuesta." };
  }

  const newProposalId = draft.id;

  if (source.product) {
    await supabase.rpc("update_proposal_details", {
      p_id: newProposalId,
      p_client_id: source.client_id,
      p_title: `${source.title} (copia)`,
      p_proposal_type: source.proposal_type,
      p_primary_objective: source.primary_objective,
      p_product: source.product,
      p_currency: source.currency,
      p_internal_notes: "",
      p_expected_revision: 0,
    });
  }

  const narrative = narrativeResult.data;
  if (narrative) {
    await supabase.rpc("upsert_proposal_narrative", {
      p_proposal_id: newProposalId,
      p_current_situation: narrative.current_situation ?? "",
      p_detected_needs: narrative.detected_needs ?? "",
      p_objectives: narrative.objectives ?? "",
      p_detected_risks: narrative.detected_risks ?? "",
      p_opportunities: narrative.opportunities ?? "",
      p_recommended_strategy: narrative.recommended_strategy ?? "",
      p_expected_revision: null as unknown as number,
    });
  }

  const comparison = comparisonResult.data;

  // Alternativas y beneficios no dependen entre sí ni de la comparativa: se
  // disparan en paralelo en vez de un `for` secuencial (antes N round-trips
  // uno detrás del otro).
  await Promise.all([
    ...(alternativesResult.data ?? []).map((alternative) => {
      const details = (alternative.financial_details ?? {}) as {
        advantages?: string[];
        disadvantages?: string[];
        notes?: string;
      };
      return supabase.rpc("upsert_proposal_alternative", {
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
          advantages: details.advantages ?? [],
          disadvantages: details.disadvantages ?? [],
          notes: details.notes ?? "",
        },
        p_display_order: alternative.display_order,
        p_expected_revision: null as unknown as number,
      });
    }),
    ...(benefitsResult.data ?? []).map((benefit) =>
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
    comparison && (comparison.columns as unknown[])?.length
      ? supabase.rpc("upsert_proposal_comparison", {
          p_proposal_id: newProposalId,
          p_columns: comparison.columns,
          p_rows: comparison.rows,
          p_expected_revision: null as unknown as number,
        })
      : Promise.resolve(),
  ]);

  // Duplicación inteligente: create_draft_proposal ya crea el borrador marcado
  // como "no revisado" (duplicated_from_id + duplication_reviewed = false);
  // finalize_proposal la rechaza hasta que el asesor confirme los montos,
  // fechas y nombres heredados (mark_duplication_reviewed).
  revalidatePath("/dashboard");
  return { data: { id: newProposalId } };
}

/** Confirma que el asesor revisó los datos heredados de una duplicación (habilita `finalize_proposal`). */
async function markDuplicationReviewedAction(proposalId: string): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "proposal.mark_duplication_reviewed" });
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_duplication_reviewed", { p_id: proposalId }).single();

  if (error) {
    return { error: mapSupabaseError(error) };
  }

  revalidatePath(`/proposal/${proposalId}`);
  revalidatePath(`/proposal/${proposalId}/edit`);
  return { success: true };
}

export {
  createDraftProposalAction,
  updateProposalMetaAction,
  archiveProposalAction,
  updateProposalOrientationAction,
  updateProposalCommercialStatusAction,
  duplicateProposalAction,
  markDuplicationReviewedAction,
};
