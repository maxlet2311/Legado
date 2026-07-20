"use server";

import { z } from "zod";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { generateAiObject } from "@/lib/ai/client";
import { checkAndRecordAiUsage } from "@/lib/ai/rate-limit";
import { filterOutExistingBenefits } from "@/lib/ai/suggest-benefits-filter";
import { BENEFIT_ICONS } from "@/lib/wizard/benefit-icons";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

const suggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().min(1).max(280),
        icon: z.enum(Object.keys(BENEFIT_ICONS) as [string, ...string[]]),
      }),
    )
    .max(5),
});

/**
 * Sugiere beneficios como chips (nunca se insertan solos) después de cargar
 * una alternativa. Filtra duplicados contra los beneficios ya cargados,
 * tanto los del `alternativeId` recién guardado como el resto de la propuesta.
 */
async function suggestBenefitsAction(input: {
  proposal_id: string;
  existing_titles: string[];
}): Promise<ActionResult<{ title: string; description: string; icon: string }[]>> {
  const guard = await requireActiveMembershipForAction({ surface: "ai.suggest_benefits" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;
  const supabase = await createClient();

  const rateLimit = await checkAndRecordAiUsage(supabase, { proposalId: input.proposal_id, feature: "suggest_benefits" });
  if (!rateLimit.ok) return { error: rateLimit.error };

  const [proposalResult, alternativesResult, benefitsResult] = await Promise.all([
    supabase.from("proposals").select("primary_objective, product").eq("id", input.proposal_id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("proposal_alternatives")
      .select("title, category")
      .eq("proposal_id", input.proposal_id)
      .order("display_order", { ascending: true }),
    supabase.from("proposal_benefits").select("title").eq("proposal_id", input.proposal_id),
  ]);

  const proposal = proposalResult.data;
  if (!proposal) return { error: "Propuesta no encontrada o sin acceso." };

  const existingTitles = [
    ...input.existing_titles,
    ...(benefitsResult.data ?? []).map((b) => b.title),
  ];

  const iconList = Object.keys(BENEFIT_ICONS).join(", ");
  const result = await generateAiObject({
    system:
      "Sugerís beneficios comerciales para propuestas de seguros/finanzas en Argentina, en español. " +
      `El ícono debe ser exactamente una de estas claves: ${iconList}. No repitas beneficios ya cargados.`,
    prompt:
      `Objetivo: ${proposal.primary_objective ?? "no especificado"}\n` +
      `Producto: ${proposal.product ?? "no especificado"}\n` +
      `Alternativas: ${(alternativesResult.data ?? []).map((a) => `${a.title} (${a.category})`).join("; ") || "ninguna"}\n` +
      `Beneficios ya cargados (no repetir): ${existingTitles.join("; ") || "ninguno"}\n` +
      "Sugerí hasta 4 beneficios nuevos, breves y concretos.",
    schema: suggestionSchema,
    maxOutputTokens: 500,
  });

  if (result.error) return { error: result.error };

  const filtered = filterOutExistingBenefits(result.data!.suggestions, existingTitles);
  return { data: filtered };
}

export { suggestBenefitsAction };
