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
 * `live-snapshot.ts`) -- nunca genera PDF ni bloquea el guardado. Debounce
 * único sobre cualquier cambio de `data`: alcanza para no disparar un fetch
 * por tecla sin necesitar dos rutas de actualización distintas.
 */
function LivePreviewPanel() {
  const data = useWizardStore((state) => state.data);
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

  if (!proposalId) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-2">
        <span className="text-caption font-semibold text-on-surface-variant">Vista previa</span>
        {updating ? (
          <span className="flex items-center gap-1.5 text-caption text-on-surface-variant">
            <Spinner className="h-3.5 w-3.5" />
            Actualizando…
          </span>
        ) : null}
      </div>
      <div className="flex-1 overflow-auto p-4">
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
            className="ps-preview-scale origin-top-left"
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
