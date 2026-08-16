"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteProposalAction } from "@/lib/proposal/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";

/** Borrado rápido desde el listado, pensado para limpiar propuestas obsoletas/de prueba en lote. */
function ProposalRowDelete({ proposalId, proposalTitle }: { proposalId: string; proposalTitle: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDelete() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteProposalAction(proposalId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="text-outline transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        aria-label={`Eliminar ${proposalTitle}`}
        aria-busy={isPending}
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {isPending ? <Spinner className="h-4 w-4 text-current" /> : <Trash2 className="h-4 w-4" />}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar propuesta"
        description={`"${proposalTitle}" se borra de forma permanente junto con sus versiones y PDFs generados. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        error={error}
      />
    </div>
  );
}

export { ProposalRowDelete };
