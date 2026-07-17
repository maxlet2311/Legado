"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Archive, Loader2, Pencil } from "lucide-react";

import { archiveProposalAction, updateProposalMetaAction } from "@/lib/proposal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const titleSchema = z.object({ title: z.string().trim().min(1, "El título es obligatorio.") });
type TitleValues = z.infer<typeof titleSchema>;

function EditTitleDialog({ proposalId, currentTitle }: { proposalId: string; currentTitle: string }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TitleValues>({ resolver: zodResolver(titleSchema), defaultValues: { title: currentTitle } });

  function onSubmit(values: TitleValues) {
    setServerError(undefined);
    const formData = new FormData();
    formData.set("id", proposalId);
    formData.set("title", values.title);

    startTransition(async () => {
      const result = await updateProposalMetaAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Pencil className="h-4 w-4" />
          Editar título
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar título</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-small text-error">{errors.title.message}</p>}
          </div>
          {serverError && <p className="text-small text-error">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveButton({ proposalId, disabled }: { proposalId: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleArchive() {
    setError(undefined);
    startTransition(async () => {
      const result = await archiveProposalAction(proposalId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" disabled={disabled || isPending} onClick={handleArchive}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
        Archivar
      </Button>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  );
}

export { EditTitleDialog, ArchiveButton };
