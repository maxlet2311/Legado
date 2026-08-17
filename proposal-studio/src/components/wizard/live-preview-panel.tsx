"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { getLiveDocumentPreviewAction } from "@/lib/render/live-snapshot";
import { useWizardStore } from "@/stores/wizard-store";

const TEXT_DEBOUNCE_MS = 600;

/**
 * Preview en vivo dentro del editor. Reusa el renderer compartido (server
 * action -> mismo RenderDocument que el preview post-emisión, ver
 * `live-snapshot.ts`) -- nunca genera PDF ni bloquea el guardado. Lee
 * siempre de la base (mismo RPC que el preview post-emisión), nunca del
 * estado en memoria del wizard -- por eso, además del debounce sobre
 * cualquier cambio de `data`, se fuerza un refresh inmediato apenas
 * `stepMeta.autosaveStatus` pasa a "saved": ese es el único momento en que
 * lo que hay en la base cambió de verdad. Sin este segundo disparador, el
 * fetch debounced podía ganarle a la escritura real (el guardado del wizard
 * es manual/flush-on-navigate, no hay autoguardado por tecla en ningún
 * paso) y el panel quedaba mostrando el estado anterior a la última edición
 * hasta el próximo cambio de `data`.
 */
function LivePreviewPanel() {
  const data = useWizardStore((state) => state.data);
  const autosaveStatus = useWizardStore((state) => state.stepMeta.autosaveStatus);
  const [html, setHtml] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const proposalId = data?.proposalId;
  // LivePreviewPanel queda montado todo el tiempo que el asesor edita
  // cualquier paso del wizard: sin memoizar, este JSON.stringify del estado
  // completo de la propuesta se recalcularía en cada tecla de cada campo,
  // no solo cuando corresponde reiniciar el debounce.
  const dataKey = useMemo(() => (data ? JSON.stringify(data) : null), [data]);

  async function refresh() {
    if (!proposalId) return;
    const requestId = ++requestIdRef.current;
    setUpdating(true);
    const result = await getLiveDocumentPreviewAction(proposalId);
    if (requestId !== requestIdRef.current) return; // respuesta obsoleta, se descarta
    setUpdating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setHtml(result.data!.html);
  }

  useEffect(() => {
    if (!proposalId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refresh, TEXT_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, proposalId]);

  useEffect(() => {
    if (autosaveStatus !== "saved") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveStatus]);

  if (!proposalId) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-fine bg-surface shadow-xs">
      <div className="flex items-center justify-between border-b border-fine bg-surface-container-low/50 px-4 py-2.5">
        <span className="font-serif text-xs font-semibold text-on-surface tracking-tight">Vista previa en vivo</span>
        {updating ? (
          <span className="flex items-center gap-1.5 text-caption font-medium text-primary">
            <Spinner className="h-3.5 w-3.5 text-primary" />
            Actualizando…
          </span>
        ) : null}
      </div>
      <div className="flex-1 overflow-auto bg-surface-container-lowest p-4">
        {error ? (
          <EmptyState
            icon={RefreshCw}
            title="No pudimos generar la vista previa"
            description={error}
            action={
              <Button type="button" variant="secondary" size="sm" onClick={refresh}>
                Reintentar
              </Button>
            }
          />
        ) : html ? (
          <div
            className="ps-preview-scale origin-top-left shadow-sm"
            style={{ transform: "scale(0.55)", width: "182%" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
}

export { LivePreviewPanel };
