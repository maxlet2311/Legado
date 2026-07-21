"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createInvitationAction } from "@/app/(app)/admin/invitations/actions";

function CreateInvitationDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<{ kind: "success" | "warning"; message: string } | undefined>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("email", email);
    setError(undefined);
    startTransition(async () => {
      const result = await createInvitationAction({}, formData);
      if (result.error) {
        setError(result.error);
        setNotice(undefined);
        return;
      }
      setEmail("");
      setNotice(
        result.emailSent
          ? { kind: "success", message: "Invitación creada y correo enviado." }
          : { kind: "warning", message: "La invitación fue creada, pero el correo no pudo enviarse." },
      );
      setOpen(false);
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setError(undefined);
        }}
      >
        <DialogTrigger asChild>
          <Button type="button">
            <Plus className="h-4 w-4" />
            Nueva invitación
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir invitación de activación</DialogTitle>
            <DialogDescription>
              Se envía un correo con un enlace de un solo uso para crear la cuenta. Si ya existe una invitación
              pendiente para el mismo email, se revoca automáticamente.
            </DialogDescription>
          </DialogHeader>
          <form action={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation-email">Email</Label>
              <Input
                id="invitation-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="persona@ejemplo.com"
              />
            </div>
            {error && <p className="text-small text-error">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isPending || !email.trim()}>
                {isPending && <Spinner className="h-4 w-4 text-current" />}
                Emitir invitación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {notice && (
        <p
          className={
            notice.kind === "success"
              ? "mt-3 text-small text-success"
              : "mt-3 text-small text-warning"
          }
          role="status"
        >
          {notice.message}
        </p>
      )}
    </>
  );
}

export { CreateInvitationDialog };
