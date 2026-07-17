"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDraftFromClientAction, createWizardClientAction } from "@/lib/wizard/actions";
import { clientCreateSchema } from "@/lib/wizard/schemas";
import type { WizardClient } from "@/types/wizard";

type CreateValues = z.infer<typeof clientCreateSchema>;

interface NewProposalClientStepProps {
  initialClients: WizardClient[];
}

function NewProposalClientStep({ initialClients }: NewProposalClientStepProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [isCreatingClient, startCreatingClient] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: { client_type: "individual" },
  });

  function onCreateClient(values: CreateValues) {
    setError(undefined);
    startCreatingClient(async () => {
      const result = await createWizardClientAction(values);
      if (result.error || !result.data) {
        setError(result.error ?? "No pudimos crear el cliente.");
        return;
      }
      setClients((prev) => [...prev, result.data as WizardClient]);
      setSelectedId(result.data.id);
      setOpen(false);
      reset();
    });
  }

  function handleContinue() {
    if (!selectedId) {
      setError("Seleccioná o creá un cliente para continuar.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await createDraftFromClientAction(selectedId);
      if (result.error || !result.data) {
        setError(result.error ?? "No pudimos crear la propuesta.");
        return;
      }
      router.push(`/proposal/${result.data.id}/edit`);
    });
  }

  return (
    <Card className="p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                  {client.company_name ? ` — ${client.company_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="secondary">
              <PlusCircle className="h-4 w-4" />
              Crear cliente nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo cliente</DialogTitle>
              <DialogDescription>
                Se agrega a tu ficha de clientes y queda seleccionado para esta propuesta.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateClient)} noValidate className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre</Label>
                <Input id="full_name" {...register("full_name")} />
                {errors.full_name && <p className="text-small text-error">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-small text-error">{errors.email.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" {...register("phone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Empresa</Label>
                  <Input id="company_name" {...register("company_name")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea id="notes" rows={3} {...register("notes")} />
              </div>
              <Button type="submit" className="w-full" disabled={isCreatingClient}>
                {isCreatingClient && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear y seleccionar
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {error && <p className="text-small text-error">{error}</p>}

        <Button type="button" onClick={handleContinue} disabled={isPending} className="w-full">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Continuar
        </Button>
      </div>
    </Card>
  );
}

export { NewProposalClientStep };
