"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError } from "@/lib/utils/errors";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

/**
 * Emite (o reutiliza, si nada cambió desde la última) una versión inmutable
 * de la propuesta. El RPC hace todo el trabajo transaccional — ver migración
 * `emit_proposal_version`.
 */
async function emitProposalVersionAction(
  proposalId: string,
): Promise<ActionResult<{ id: string; versionNumber: number; isNew: boolean }>> {
  const guard = await requireActiveMembershipForAction({ surface: "version.emit" });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("emit_proposal_version", { p_proposal_id: proposalId }).single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "No pudimos emitir la versión." };
  }

  revalidatePath(`/proposal/${proposalId}`);
  return { data: { id: data.id, versionNumber: data.version_number, isNew: data.is_new } };
}

export { emitProposalVersionAction };
