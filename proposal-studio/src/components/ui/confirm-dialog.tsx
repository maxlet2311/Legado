"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  onConfirm: () => void | Promise<void>;
}

/** Confirmación genérica del Design System para acciones destructivas o irreversibles. */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    setIsConfirming(true);
    await onConfirm();
    setIsConfirming(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isConfirming && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
