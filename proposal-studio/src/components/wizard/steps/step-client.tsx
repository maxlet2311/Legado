"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
import { SectionCard } from "@/components/wizard/section-card";
import { useProposalDetailsAutosave } from "@/hooks/use-proposal-details-autosave";
import { createWizardClientAction } from "@/lib/wizard/actions";
import { clientCreateSchema } from "@/lib/wizard/schemas";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardClient, WizardStepProps } from "@/types/wizard";

type CreateValues = z.infer<typeof clientCreateSchema>;

function StepClient({ availableClients }: WizardStepProps) {
  const data = useWizardStore((state) => state.data);
  const setClient = useWizardStore((state) => state.setClient);
  const [clients, setClients] = useState(availableClients);
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  useProposalDetailsAutosave(Boolean(data?.client.id));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(clientCreateSchema),
    defaultValues: { client_type: "individual" },
  });

  if (!data) return null;

  function onCreateClient(values: CreateValues) {
    setServerError(undefined);
    startTransition(async () => {
      const result = await createWizardClientAction(values);
      if (result.error || !result.data) {
        setServerError(result.error ?? "No pudimos crear el cliente.");
        return;
      }
      setClients((prev) => [...prev, result.data as WizardClient]);
      setClient(result.data as WizardClient);
      setOpen(false);
      reset();
    });
  }

  return (
    <SectionCard
      title="Cliente"
      description="Seleccioná un cliente existente o creá uno nuevo sin salir del wizard."
    >
      <div className="space-y-2">
        <Label>Cliente</Label>
        <Select
          value={data.client.id || undefined}
          onValueChange={(value) => {
            const client = clients.find((item) => item.id === value);
            if (client) setClient(client);
          }}
        >
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

      {data.client.id && (
        <div className="rounded-md border border-outline-variant bg-surface-container-low p-4 text-small text-on-surface-variant">
          <p className="font-semibold text-on-surface">{data.client.full_name}</p>
          <p>{data.client.email}</p>
          {data.client.phone && <p>{data.client.phone}</p>}
        </div>
      )}

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
            <DialogDescription>Se agrega a tu ficha de clientes y queda seleccionado.</DialogDescription>
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
            {serverError && <p className="text-small text-error">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Spinner className="h-4 w-4 text-current" />}
              Crear y seleccionar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

export { StepClient };
