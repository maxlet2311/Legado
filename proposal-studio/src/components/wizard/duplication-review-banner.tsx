"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { markDuplicationReviewedAction } from "@/lib/proposal/actions";
import { useWizardStore } from "@/stores/wizard-store";

/**
 * Se muestra mientras `duplication_reviewed === false` (propuesta creada por
 * "Duplicar propuesta"). Bloquea la emisión hasta que el asesor confirme que
 * revisó montos, fechas, edades y nombres heredados de la propuesta origen --
 * el gate real está en el RPC `finalize_proposal` (servidor), esto es la guía.
 */
function DuplicationReviewBanner() {
  const data = useWizardStore((state) => state.data);
  const setMeta = useWizardStore((state) => state.setMeta);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data || data.meta.duplication_reviewed) return null;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await markDuplicationReviewedAction(data!.proposalId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMeta({ duplication_reviewed: true });
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 p-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="flex-1 space-y-1">
        <p className="text-small font-semibold text-on-surface">
          Esta propuesta viene de una duplicación
        </p>
        <p className="text-caption text-on-surface-variant">
          Revisá montos, fechas, edades y nombres antes de emitir: la estructura y el contenido comercial se
          copiaron, pero los datos específicos del cliente anterior pueden seguir presentes.
        </p>
        {error ? <p className="text-caption text-error">{error}</p> : null}
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={handleConfirm} disabled={loading}>
        {loading ? <Spinner className="h-4 w-4" /> : null}
        Marcar como revisado
      </Button>
    </div>
  );
}

export { DuplicationReviewBanner };
