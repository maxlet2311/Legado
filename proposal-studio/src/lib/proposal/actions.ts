"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/database/server";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { mapSupabaseError } from "@/lib/utils/errors";

interface ActionResult {
  error?: string;
  success?: boolean;
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
  await requireActiveUser();

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
  await requireActiveUser();

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
  await requireActiveUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("archive_proposal", { p_id: proposalId }).single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "Propuesta no encontrada o sin acceso." };
  }

  revalidatePath(`/proposal/${proposalId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export { createDraftProposalAction, updateProposalMetaAction, archiveProposalAction };
