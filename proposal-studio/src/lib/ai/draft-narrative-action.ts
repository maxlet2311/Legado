"use server";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { generateAiText } from "@/lib/ai/client";
import { checkAndRecordAiUsage } from "@/lib/ai/rate-limit";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

const FIELD_LABELS = {
  current_situation: "el diagnóstico (situación actual del cliente)",
  recommended_strategy: "la recomendación (estrategia sugerida)",
} as const;

type NarrativeField = keyof typeof FIELD_LABELS;

/**
 * Genera un borrador editable de diagnóstico o recomendación usando solo
 * datos ya cargados en la propuesta (nunca email/teléfono/notas del cliente,
 * ni internal_notes, ni IDs). El asesor decide reemplazar/insertar/descartar;
 * esta acción nunca persiste nada.
 */
async function generateNarrativeDraftAction(
  proposalId: string,
  field: NarrativeField,
): Promise<ActionResult<{ text: string }>> {
  const guard = await requireActiveMembershipForAction({ surface: "ai.draft_narrative" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;
  const supabase = await createClient();

  const rateLimit = await checkAndRecordAiUsage(supabase, { proposalId, feature: `draft_${field}` });
  if (!rateLimit.ok) return { error: rateLimit.error };

  const [proposalResult, alternativesResult, benefitsResult] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, primary_objective, product, client_id")
      .eq("id", proposalId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("proposal_alternatives")
      .select("title, category, insurance_company, product_name")
      .eq("proposal_id", proposalId)
      .order("display_order", { ascending: true }),
    supabase.from("proposal_benefits").select("title, category").eq("proposal_id", proposalId).order("display_order", { ascending: true }),
  ]);

  const proposal = proposalResult.data;
  if (!proposal) return { error: "Propuesta no encontrada o sin acceso." };

  let clientType: string | null = null;
  if (proposal.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("client_type")
      .eq("id", proposal.client_id)
      .eq("user_id", user.id)
      .maybeSingle();
    clientType = client?.client_type ?? null;
  }

  const contextLines = [
    `Tipo de cliente: ${clientType ?? "no especificado"}`,
    `Objetivo principal: ${proposal.primary_objective ?? "no especificado"}`,
    `Producto: ${proposal.product ?? "no especificado"}`,
    `Alternativas cargadas: ${
      (alternativesResult.data ?? [])
        .map((a) => `${a.title} (${a.category}, ${a.insurance_company} / ${a.product_name})`)
        .join("; ") || "ninguna"
    }`,
    `Beneficios cargados: ${(benefitsResult.data ?? []).map((b) => `${b.title} (${b.category})`).join("; ") || "ninguno"}`,
  ].join("\n");

  const result = await generateAiText({
    system:
      "Sos un asistente para asesores de seguros/finanzas en Argentina. Redactá en español rioplatense, " +
      "tono profesional y cercano, sin inventar montos ni datos que no te dieron. Devolvé solo el texto " +
      "del párrafo, sin encabezados ni markdown.",
    prompt: `Redactá un borrador breve (3-5 oraciones) para ${FIELD_LABELS[field]} de una propuesta, ` +
      `usando exclusivamente este contexto:\n${contextLines}`,
    maxOutputTokens: 400,
  });

  if (result.error) return { error: result.error };

  return { data: { text: result.data! } };
}

export { generateNarrativeDraftAction };
export type { NarrativeField };
