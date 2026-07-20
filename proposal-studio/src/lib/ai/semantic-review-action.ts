"use server";

import { z } from "zod";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { generateAiObject } from "@/lib/ai/client";
import { checkAndRecordAiUsage } from "@/lib/ai/rate-limit";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

const findingsSchema = z.object({
  findings: z
    .array(
      z.object({
        severity: z.enum(["error", "warning"]),
        message: z.string().min(1).max(300),
      }),
    )
    .max(8),
});

interface SemanticFinding {
  severity: "error" | "warning";
  message: string;
}

/**
 * Checklist semántico previo a Resumen: solo lo que reglas determinísticas no
 * pueden resolver -- nombre del cliente anterior mencionado en el texto tras
 * una duplicación, e inconsistencias narrativas evidentes. Se dispara aparte
 * (botón explícito), nunca bloquea el resto del checklist si falla.
 */
async function runSemanticChecksAction(proposalId: string): Promise<ActionResult<SemanticFinding[]>> {
  const guard = await requireActiveMembershipForAction({ surface: "ai.semantic_review" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;
  const supabase = await createClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("client_id, duplicated_from_id")
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!proposal) return { error: "Propuesta no encontrada o sin acceso." };

  const [narrativeResult, alternativesResult, currentClientResult, previousClientResult] = await Promise.all([
    supabase
      .from("proposal_narratives")
      .select("current_situation, objectives, recommended_strategy")
      .eq("proposal_id", proposalId)
      .maybeSingle(),
    supabase.from("proposal_alternatives").select("description").eq("proposal_id", proposalId),
    proposal.client_id
      ? supabase.from("clients").select("full_name").eq("id", proposal.client_id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    proposal.duplicated_from_id
      ? supabase
          .from("proposals")
          .select("client_id")
          .eq("id", proposal.duplicated_from_id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let previousClientName: string | null = null;
  if (previousClientResult.data?.client_id) {
    const { data: previousClient } = await supabase
      .from("clients")
      .select("full_name")
      .eq("id", previousClientResult.data.client_id)
      .eq("user_id", user.id)
      .maybeSingle();
    previousClientName = previousClient?.full_name ?? null;
  }

  const text = [
    narrativeResult.data?.current_situation,
    narrativeResult.data?.objectives,
    narrativeResult.data?.recommended_strategy,
    ...(alternativesResult.data ?? []).map((a) => a.description),
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!text.trim()) {
    return { data: [] };
  }

  const rateLimit = await checkAndRecordAiUsage(supabase, { proposalId, feature: "semantic_review" });
  if (!rateLimit.ok) return { error: rateLimit.error };

  const result = await generateAiObject({
    system:
      "Revisás texto de propuestas comerciales en español. Detectá solo dos cosas: (1) si el texto menciona " +
      "un nombre de cliente distinto al cliente actual (te dan ambos nombres), y (2) inconsistencias narrativas " +
      "evidentes (contradicciones claras entre diagnóstico y recomendación). No inventes problemas menores de estilo.",
    prompt:
      `Cliente actual: ${currentClientResult.data?.full_name ?? "no especificado"}\n` +
      `Cliente anterior (si esta propuesta viene de una duplicación): ${previousClientName ?? "no aplica"}\n\n` +
      `Texto a revisar:\n${text}`,
    schema: findingsSchema,
    maxOutputTokens: 400,
  });

  if (result.error) return { error: result.error };

  return { data: result.data!.findings };
}

export { runSemanticChecksAction };
export type { SemanticFinding };
