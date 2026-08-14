"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

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

  // `revision` se excluye del payload memoizado a propósito: cada guardado
  // exitoso actualiza `data.narrative.revision` en el store, así que incluirla
  // acá haría que el propio guardado disparase el próximo (loop infinito de
  // autoguardado, con conflictos espurios cuando dos vueltas se solapan). Se
  // lee al momento de guardar vía `revisionRef`, no como parte de la identidad
  // que dispara el autoguardado.
  const revisionRef = useRef(data?.narrative.revision ?? null);
  revisionRef.current = data?.narrative.revision ?? null;

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
            executive_summary: data.narrative.executive_summary,
            final_message: data.narrative.final_message,
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
      data?.narrative.executive_summary,
      data?.narrative.final_message,
    ],
  );

  const { status, error, conflictRevision, saveNow, forceSaveNow, clearConflict } = useAutosave(
    payload,
    async (value) => {
      if (!value) return;
      const result = await upsertNarrativeAction({ ...value, expected_revision: revisionRef.current });
      if (result.conflict) {
        return { conflict: true, currentRevision: result.currentRevision };
      }
      if (result.data) {
        setNarrative({ revision: result.data.revision });
      }
      return { error: result.error };
    },
    // Debounced (no manual): guarda solo tras ~2s de pausa, nunca por tecla.
    // `saveNow` (flush-on-navigate, ver stepMeta más abajo) sigue cubriendo
    // el caso de navegar antes de que venza el debounce.
  );

  // useLayoutEffect (no useEffect): stepMeta.saveNow es lo que el wizard invoca
  // para volcar el cambio pendiente antes de cambiar de paso (handleNext/
  // handleJump). Con useEffect (efecto "pasivo", corre después de pintar) hay
  // una ventana entre "el usuario tipeó" y "stepMeta.saveNow ya conoce ese
  // texto": un click de navegación disparado dentro de esa ventana ejecuta un
  // saveNow con el closure viejo y la última tecla se pierde en silencio.
  // useLayoutEffect corre sincrónicamente tras el commit, antes de que el
  // navegador procese el próximo evento (incl. el click de "Siguiente"), así
  // que cierra esa ventana.
  useLayoutEffect(() => {
    setStepMeta({
      isValid,
      autosaveStatus: status,
      autosaveError: error,
      saveNow,
      conflictRevision,
      resolveKeepMine: () => {
        if (!payload) return;
        const revision = conflictRevision ?? revisionRef.current;
        revisionRef.current = revision;
        setNarrative({ revision });
        forceSaveNow(payload);
      },
      resolveReload: async () => {
        if (!data) return;
        const supabase = createClient();
        const { data: fresh } = await supabase
          .from("proposal_narratives")
          .select(
            "current_situation, detected_needs, objectives, detected_risks, opportunities, recommended_strategy, executive_summary, final_message, revision",
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
          executive_summary: fresh?.executive_summary ?? "",
          final_message: fresh?.final_message ?? "",
          revision: fresh?.revision ?? null,
        });
        clearConflict();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, status, error, saveNow, conflictRevision, forceSaveNow, clearConflict]);
}

export { useNarrativeAutosave };
