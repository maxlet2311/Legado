"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import { useAutosave } from "@/hooks/use-autosave";
import { updateProposalDetailsAction } from "@/lib/wizard/actions";
import { createClient } from "@/lib/database/client";
import { useWizardStore } from "@/stores/wizard-store";

/**
 * Autoguarda cliente + información de la propuesta (proposals). Los pasos 1 y 2
 * comparten la misma fila, así que comparten este hook para no duplicar lógica.
 *
 * Concurrencia optimista: envía `meta.revision` como token esperado. Si otra
 * sesión ya guardó una revision distinta, el RPC devuelve conflicto; acá se
 * detiene el autoguardado de este bloque y se ofrecen las dos resoluciones
 * explícitas exigidas (conservar mi edición / recargar cambios recientes).
 */
function useProposalDetailsAutosave(isValid: boolean) {
  const data = useWizardStore((state) => state.data);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);
  const setMeta = useWizardStore((state) => state.setMeta);

  // `revision` se excluye del payload memoizado a propósito: cada guardado
  // exitoso actualiza `data.meta.revision` en el store, así que incluirla acá
  // haría que el propio guardado disparase el próximo (loop infinito de
  // autoguardado, con conflictos espurios cuando dos vueltas se solapan). Se
  // lee al momento de guardar vía `revisionRef`, no como parte de la identidad
  // que dispara el autoguardado.
  const revisionRef = useRef(data?.meta.revision);
  revisionRef.current = data?.meta.revision;

  // Memoizado por valor: `useAutosave` expone `saveNow`/`forceSaveNow` con identidad
  // atada a este objeto (para comparar el valor vigente al guardar). Si `payload` fuera
  // un literal nuevo en cada render, esas funciones cambiarían de referencia en cada
  // render, el `useEffect` de abajo (que las lista como dependencia) se re-ejecutaría
  // sin parar, y `setStepMeta` entraría en loop infinito ("Maximum update depth exceeded").
  const payload = useMemo(
    () =>
      data
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
        : null,
    // Deps intencionalmente granulares (no `data`): así el objeto solo cambia de
    // referencia cuando cambia alguno de estos campos primitivos, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data?.meta.id,
      data?.client.id,
      data?.meta.title,
      data?.meta.proposal_type,
      data?.meta.primary_objective,
      data?.meta.product,
      data?.meta.currency,
      data?.meta.internal_notes,
    ],
  );

  const { status, error, conflictRevision, saveNow, forceSaveNow, clearConflict } = useAutosave(
    payload,
    async (value) => {
      if (!value) return;
      const result = await updateProposalDetailsAction({ ...value, expected_revision: revisionRef.current });
      if (result.conflict) {
        return { conflict: true, currentRevision: result.currentRevision };
      }
      if (result.data) {
        setMeta({ revision: result.data.revision });
      }
      return { error: result.error };
    },
    // Debounced (no manual): guarda solo tras ~2s de pausa, nunca por tecla.
    // `saveNow` (flush-on-navigate, ver stepMeta más abajo) sigue cubriendo
    // el caso de navegar antes de que venza el debounce.
  );

  // useLayoutEffect (no useEffect): ver la misma nota en use-narrative-autosave.ts.
  // stepMeta.saveNow es lo que el wizard invoca antes de cambiar de paso; con
  // useEffect queda una ventana en la que un click de navegación dispara un
  // saveNow con el closure de ANTES de la última edición (título/producto),
  // y ese último cambio nunca se envía.
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
        setMeta({ revision });
        forceSaveNow(payload);
      },
      resolveReload: async () => {
        if (!data) return;
        const supabase = createClient();
        const { data: fresh } = await supabase
          .from("proposals")
          .select(
            "client_id, title, proposal_type, primary_objective, product, currency, internal_notes, revision",
          )
          .eq("id", data.meta.id)
          .single();
        if (fresh) {
          setMeta({
            client_id: fresh.client_id,
            title: fresh.title,
            proposal_type: fresh.proposal_type as typeof data.meta.proposal_type,
            primary_objective: fresh.primary_objective as typeof data.meta.primary_objective,
            product: fresh.product ?? "",
            currency: fresh.currency as typeof data.meta.currency,
            internal_notes: fresh.internal_notes ?? "",
            revision: fresh.revision,
          });
        }
        clearConflict();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, status, error, saveNow, conflictRevision, forceSaveNow, clearConflict]);
}

export { useProposalDetailsAutosave };
