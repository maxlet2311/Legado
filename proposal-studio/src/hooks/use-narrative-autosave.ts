"use client";

import { useEffect, useMemo } from "react";

import { useAutosave } from "@/hooks/use-autosave";
import { upsertNarrativeAction } from "@/lib/wizard/actions";
import { createClient } from "@/lib/database/client";
import { useWizardStore } from "@/stores/wizard-store";

/**
 * Autoguarda proposal_narratives. Compartido por los pasos 3 (diagnóstico) y 5
 * (recomendación). Ver use-proposal-details-autosave.ts para el mismo patrón
 * de concurrencia optimista (revision como token, conflicto explícito).
 */
function useNarrativeAutosave(isValid: boolean) {
  const data = useWizardStore((state) => state.data);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);
  const setNarrative = useWizardStore((state) => state.setNarrative);

  // Memoizado por valor: ver use-proposal-details-autosave.ts para por qué un literal
  // nuevo en cada render acá dispara un loop infinito de re-renders.
  const payload = useMemo(
    () =>
      data
        ? {
            proposal_id: data.proposalId,
            current_situation: data.narrative.current_situation,
            detected_needs: data.narrative.detected_needs,
            objectives: data.narrative.objectives,
            detected_risks: data.narrative.detected_risks,
            opportunities: data.narrative.opportunities,
            recommended_strategy: data.narrative.recommended_strategy,
            expected_revision: data.narrative.revision,
          }
        : null,
    // Deps intencionalmente granulares (no `data`): ver use-proposal-details-autosave.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data?.proposalId,
      data?.narrative.current_situation,
      data?.narrative.detected_needs,
      data?.narrative.objectives,
      data?.narrative.detected_risks,
      data?.narrative.opportunities,
      data?.narrative.recommended_strategy,
      data?.narrative.revision,
    ],
  );

  const { status, error, conflictRevision, saveNow, forceSaveNow, clearConflict } = useAutosave(
    payload,
    async (value) => {
      if (!value) return;
      const result = await upsertNarrativeAction(value);
      if (result.conflict) {
        return { conflict: true, currentRevision: result.currentRevision };
      }
      if (result.data) {
        setNarrative({ revision: result.data.revision });
      }
      return { error: result.error };
    },
  );

  useEffect(() => {
    setStepMeta({
      isValid,
      autosaveStatus: status,
      autosaveError: error,
      saveNow,
      conflictRevision,
      resolveKeepMine: () => {
        if (!payload) return;
        const revision = conflictRevision ?? payload.expected_revision;
        setNarrative({ revision });
        forceSaveNow({ ...payload, expected_revision: revision });
      },
      resolveReload: async () => {
        if (!data) return;
        const supabase = createClient();
        const { data: fresh } = await supabase
          .from("proposal_narratives")
          .select(
            "current_situation, detected_needs, objectives, detected_risks, opportunities, recommended_strategy, revision",
          )
          .eq("proposal_id", data.proposalId)
          .maybeSingle();
        setNarrative({
          current_situation: fresh?.current_situation ?? "",
          detected_needs: fresh?.detected_needs ?? "",
          objectives: fresh?.objectives ?? "",
          detected_risks: fresh?.detected_risks ?? "",
          opportunities: fresh?.opportunities ?? "",
          recommended_strategy: fresh?.recommended_strategy ?? "",
          revision: fresh?.revision ?? null,
        });
        clearConflict();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, status, error, saveNow, conflictRevision, forceSaveNow, clearConflict]);
}

export { useNarrativeAutosave };
