"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SaveToLibraryDuplicateDialogProps {
  duplicate: { title: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Ya existe un elemento muy similar" — se muestra antes de guardar en Biblioteca si hay un match por título/tipo/contenido. */
function SaveToLibraryDuplicateDialog({ duplicate, onConfirm, onCancel }: SaveToLibraryDuplicateDialogProps) {
  return (
    <ConfirmDialog
      open={duplicate !== null}
      onOpenChange={(open) => !open && onCancel()}
      title="Ya existe un elemento muy similar"
      description={`Encontramos "${duplicate?.title ?? ""}" en tu Biblioteca, muy parecido a esto. Podés guardarlo igual como un ítem nuevo.`}
      confirmLabel="Guardar de todas formas"
      confirmVariant="secondary"
      onConfirm={onConfirm}
    />
  );
}

export { SaveToLibraryDuplicateDialog };
