"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { canTransitionMembershipStatus } from "@/lib/memberships/access";
import { ACTIVATION_ELIGIBLE_STATUSES } from "@/lib/memberships/types";
import type { Membership } from "@/lib/memberships/types";
import {
  suspendMembershipAction,
  reactivateMembershipAction,
  cancelMembershipAction,
  linkMembershipAction,
  resendActivationAction,
  resyncMembershipAction,
} from "@/lib/memberships/admin-actions";

type ActionFn = (prevState: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;

function ReasonDialog({
  triggerLabel,
  title,
  description,
  action,
  membershipId,
  extraFields,
  disabled,
  variant = "secondary",
}: {
  triggerLabel: string;
  title: string;
  description: string;
  action: ActionFn;
  membershipId: string;
  extraFields?: React.ReactNode;
  disabled?: boolean;
  variant?: "secondary" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("membershipId", membershipId);
    formData.set("reason", reason);
    setError(undefined);
    startTransition(async () => {
      const result = await action({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setReason("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size="sm" className="w-full" disabled={disabled}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          {extraFields}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (obligatorio)</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>
          {error && <p className="text-small text-error">{error}</p>}
          <DialogFooter>
            <Button type="submit" variant={variant} disabled={isPending || !reason.trim()}>
              {isPending && <Spinner className="h-4 w-4 text-current" />}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SimpleActionButton({
  label,
  action,
  membershipId,
  disabled,
  confirmLabel,
}: {
  label: string;
  action: ActionFn;
  membershipId: string;
  disabled?: boolean;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function submit() {
    const formData = new FormData();
    formData.set("membershipId", membershipId);
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
    <div className="space-y-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="secondary" size="sm" className="w-full" disabled={disabled}>
            {label}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{confirmLabel}</DialogDescription>
          </DialogHeader>
          {error && <p className="text-small text-error">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isPending} onClick={submit}>
              {isPending && <Spinner className="h-4 w-4 text-current" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MembershipActions({ membership }: { membership: Membership }) {
  const canSuspend = canTransitionMembershipStatus(membership.status, "suspended");
  const canReactivate = canTransitionMembershipStatus(membership.status, "active");
  const canCancel = canTransitionMembershipStatus(membership.status, "canceled");
  const canLink = !membership.userId;
  const canResend = !membership.userId && ACTIVATION_ELIGIBLE_STATUSES.includes(membership.status);
  const canResync = Boolean(membership.provider && membership.providerSubscriptionId);

  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-body font-semibold text-on-surface">Acciones</h2>

      <SimpleActionButton
        label="Vincular a usuario existente"
        action={linkMembershipAction}
        membershipId={membership.id}
        disabled={!canLink}
        confirmLabel="¿Vincular esta membresía al usuario cuyo email coincide?"
      />

      <SimpleActionButton
        label="Reenviar invitación de activación"
        action={resendActivationAction}
        membershipId={membership.id}
        disabled={!canResend}
        confirmLabel="¿Revocar la invitación pendiente y enviar una nueva por email?"
      />

      <SimpleActionButton
        label="Reconciliar con Mercado Pago"
        action={resyncMembershipAction}
        membershipId={membership.id}
        disabled={!canResync}
        confirmLabel="¿Consultar el estado real en Mercado Pago y aplicar la transición correspondiente?"
      />

      <ReasonDialog
        triggerLabel="Suspender"
        title="Suspender membresía"
        description="Bloquea el acceso comercial. No afecta el estado de la cuenta del usuario."
        action={suspendMembershipAction}
        membershipId={membership.id}
        disabled={!canSuspend}
      />

      <ReasonDialog
        triggerLabel="Reactivar"
        title="Reactivar membresía"
        description="Si tiene proveedor externo, se valida contra Mercado Pago antes de reactivar (salvo override)."
        action={reactivateMembershipAction}
        membershipId={membership.id}
        disabled={!canReactivate}
        extraFields={
          <label className="flex items-center gap-2 text-small text-on-surface-variant">
            <input type="checkbox" name="override" value="true" className="h-4 w-4" />
            Override manual (ignora el estado del proveedor)
          </label>
        }
      />

      <ReasonDialog
        triggerLabel="Cancelar"
        title="Cancelar membresía"
        description="Elegí si cancelar primero en Mercado Pago o hacerlo manualmente (sin proveedor)."
        action={cancelMembershipAction}
        membershipId={membership.id}
        disabled={!canCancel}
        variant="danger"
        extraFields={
          <div className="space-y-2">
            <Label>Modo</Label>
            <select name="mode" className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-small">
              <option value="manual">Manual (sin proveedor)</option>
              <option value="provider" disabled={!membership.provider || !membership.providerSubscriptionId}>
                Cancelar en Mercado Pago
              </option>
            </select>
          </div>
        }
      />
    </Card>
  );
}

export { MembershipActions };
