"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PlusCircle } from "lucide-react";

import { createDraftProposalAction } from "@/lib/proposal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Tables } from "@/lib/database/types";

const draftSchema = z.object({
  client_id: z.string().uuid("Seleccioná un cliente."),
  title: z.string().trim().min(1, "El título es obligatorio."),
  proposal_type: z.enum(["individual", "corporate"]),
  currency: z.enum(["ARS", "USD", "EUR"]),
  primary_objective: z.enum([
    "protect_family",
    "build_savings",
    "retirement",
    "business_protection",
    "partners_protection",
    "employee_retention",
    "custom",
  ]),
});

type DraftValues = z.infer<typeof draftSchema>;

const OBJECTIVE_LABELS: Record<DraftValues["primary_objective"], string> = {
  protect_family: "Proteger a su familia",
  build_savings: "Construir ahorro",
  retirement: "Planificar el retiro",
  business_protection: "Proteger su empresa",
  partners_protection: "Proteger a los socios",
  employee_retention: "Fidelizar colaboradores",
  custom: "Estrategia personalizada",
};

interface NewProposalDialogProps {
  clients: Pick<Tables<"clients">, "id" | "full_name">[];
}

function NewProposalDialog({ clients }: NewProposalDialogProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DraftValues>({
    resolver: zodResolver(draftSchema),
    defaultValues: { proposal_type: "individual", currency: "ARS", primary_objective: "custom" },
  });

  function onSubmit(values: DraftValues) {
    setServerError(undefined);
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value);
    }

    startTransition(async () => {
      const result = await createDraftProposalAction({}, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-small font-bold text-primary transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          Nueva Propuesta
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva propuesta</DialogTitle>
          <DialogDescription>
            Creá un borrador. El resto del contenido se completa desde el wizard en el próximo
            sprint.
          </DialogDescription>
        </DialogHeader>

        {clients.length === 0 ? (
          <p className="mt-6 text-small text-on-surface-variant">
            Todavía no tenés clientes cargados. Creá uno primero desde tu ficha de clientes.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="Plan Vida Integral" {...register("title")} />
              {errors.title && <p className="text-small text-error">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Controller
                control={control}
                name="client_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.client_id && (
                <p className="text-small text-error">{errors.client_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Objetivo principal</Label>
              <Controller
                control={control}
                name="primary_objective"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OBJECTIVE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  control={control}
                  name="proposal_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="corporate">Corporativa</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {serverError && <p className="text-small text-error">{serverError}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear borrador
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { NewProposalDialog };
