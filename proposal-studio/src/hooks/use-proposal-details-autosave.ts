"use client";

import { useEffect } from "react";

import { useAutosave } from "@/hooks/use-autosave";
import { updateProposalDetailsAction } from "@/lib/wizard/actions";
import { useWizardStore } from "@/stores/wizard-store";

/**
 * Autoguarda cliente + información de la propuesta (proposals). Los pasos 1 y 2
 * comparten la misma fila, así que comparten este hook para no duplicar lógica.
 */
function useProposalDetailsAutosave(isValid: boolean) {
  const data = useWizardStore((state) => state.data);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);

  const payload = data
    ? {
        id: data.meta.id,
        client_id: data.client.id,
        title: data.meta.title,
        proposal_type: data.meta.proposal_type,
        primary_objective: data.meta.primary_objective,
        product: data.meta.product,
        currency: data.meta.currency,
        internal_notes: data.meta.internal_notes,
      }
    : null;

  const { status, error, saveNow } = useAutosave(payload, async (value) => {
    if (!value) return;
    const result = await updateProposalDetailsAction(value);
    return { error: result.error };
  });

  useEffect(() => {
    setStepMeta({ isValid, autosaveStatus: status, autosaveError: error, saveNow });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, status, error, saveNow]);
}

export { useProposalDetailsAutosave };
