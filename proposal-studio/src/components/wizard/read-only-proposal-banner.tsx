"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { duplicateProposalAction } from "@/lib/proposal/actions";
import { useWizardStore } from "@/stores/wizard-store";

/**
 * Se muestra cuando `meta.status === "completed"` (C2: propuesta inmutable).
 * El bloqueo real vive en la base de datos (triggers `guard_completed_*`);
 * esto solo comunica el estado y ofrece la salida existente ("Duplicar
 * propuesta") para crear una nueva revisión editable sin tocar la original.
 * Mismo patrón que duplication-review-banner.tsx.
 */
function ReadOnlyProposalBanner() {
  const router = useRouter();
  const data = useWizardStore((state) => state.data);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data || data.meta.status !== "completed") return null;

  async function handleDuplicate() {
    setLoading(true);
    setError(null);
    const result = await duplicateProposalAction(data!.proposalId);
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error ?? "No pudimos duplicar la propuesta.");
      return;
    }
    router.push(`/proposal/${result.data.id}/edit`);
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-outline-variant bg-surface-container p-4">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
      <div className="flex-1 space-y-1">
        <p className="text-small font-semibold text-on-surface">Esta propuesta está finalizada</p>
        <p className="text-caption text-on-surface-variant">
          El contenido comercial ya no se puede editar. Para modificarla, creá una nueva revisión: se genera una
          copia editable en borrador, la propuesta original no se toca.
        </p>
        {error ? <p className="text-caption text-error">{error}</p> : null}
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={handleDuplicate} disabled={loading}>
        {loading ? <Spinner className="h-4 w-4" /> : null}
        Duplicar propuesta
      </Button>
    </div>
  );
}

export { ReadOnlyProposalBanner };
