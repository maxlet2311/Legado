"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  cancelInvitationAction,
  forceExpireInvitationAction,
  resendInvitationAction,
} from "@/app/(app)/admin/invitations/actions";
import type { AdminInvitationStatus } from "@/lib/account-activation/types";

type ActionFn = (
  prevState: { error?: string; success?: boolean; emailSent?: boolean },
  formData: FormData,
) => Promise<{ error?: string; success?: boolean; emailSent?: boolean }>;

function ConfirmDialog({
  triggerLabel,
  title,
  description,
  action,
  invitationId,
  variant = "danger",
}: {
  triggerLabel: string;
  title: string;
  description: string;
  action: ActionFn;
  invitationId: string;
  variant?: "secondary" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function submit() {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    setError(undefined);
    startTransition(async () => {
      const result = await action({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-small text-error">{error}</p>}
        <DialogFooter>
          <Button type="button" variant={variant} disabled={isPending} onClick={submit}>
            {isPending && <Spinner className="h-4 w-4 text-current" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvitationRowActions({ id, status }: { id: string; status: AdminInvitationStatus }) {
  const canAct = status === "pending";

  if (!canAct) {
    return <span className="text-caption text-outline">—</span>;
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ConfirmDialog
        triggerLabel="Reenviar"
        title="Reenviar invitación"
        description="El token anterior se revoca y se envía un nuevo enlace por email."
        action={resendInvitationAction}
        invitationId={id}
        variant="secondary"
      />
      <ConfirmDialog
        triggerLabel="Forzar vencimiento"
        title="Forzar vencimiento de la invitación"
        description="El enlace deja de ser válido de inmediato. Se notifica al destinatario por email (best-effort)."
        action={forceExpireInvitationAction}
        invitationId={id}
        variant="secondary"
      />
      <ConfirmDialog
        triggerLabel="Cancelar"
        title="Cancelar invitación"
        description="El enlace deja de ser válido de inmediato. Esta acción no se puede deshacer."
        action={cancelInvitationAction}
        invitationId={id}
        variant="danger"
      />
    </div>
  );
}

export { InvitationRowActions };
