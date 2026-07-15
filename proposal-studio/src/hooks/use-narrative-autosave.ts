"use client";

import { useEffect } from "react";

import { useAutosave } from "@/hooks/use-autosave";
import { upsertNarrativeAction } from "@/lib/wizard/actions";
import { useWizardStore } from "@/stores/wizard-store";

/** Autoguarda proposal_narratives. Compartido por los pasos 3 (diagnóstico) y 5 (recomendación). */
function useNarrativeAutosave(isValid: boolean) {
  const data = useWizardStore((state) => state.data);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);

  const payload = data
    ? {
        proposal_id: data.proposalId,
        current_situation: data.narrative.current_situation,
        detected_needs: data.narrative.detected_needs,
        objectives: data.narrative.objectives,
        detected_risks: data.narrative.detected_risks,
        opportunities: data.narrative.opportunities,
        recommended_strategy: data.narrative.recommended_strategy,
      }
    : null;

  const { status, error, saveNow } = useAutosave(payload, async (value) => {
    if (!value) return;
    const result = await upsertNarrativeAction(value);
    return { error: result.error };
  });

  useEffect(() => {
    setStepMeta({ isValid, autosaveStatus: status, autosaveError: error, saveNow });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, status, error, saveNow]);
}

export { useNarrativeAutosave };
