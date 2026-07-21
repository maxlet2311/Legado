"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Pencil } from "lucide-react";

import { createClientAction, updateClientAction } from "@/lib/client/actions";
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
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Tables } from "@/lib/database/types";

const clientFormSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre es obligatorio."),
  client_type: z.enum(["individual", "company"]),
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  phone: z.string().trim().optional(),
  company_name: z.string().trim().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

function ClientForm({
  defaultValues,
  onSubmitAction,
  submitLabel,
}: {
  defaultValues?: Partial<ClientFormValues>;
  onSubmitAction: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
}) {
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { client_type: "individual", ...defaultValues },
  });

  function onSubmit(values: ClientFormValues) {
    setServerError(undefined);
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value ?? "");
    }
    startTransition(async () => {
      const result = await onSubmitAction(formData);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" {...register("full_name")} />
        {errors.full_name && <p className="text-small text-error">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Tipo de cliente</Label>
        <Controller
          control={control}
          name="client_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="company">Empresa</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company_name">Razón social (opcional)</Label>
        <Input id="company_name" {...register("company_name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-small text-error">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono (opcional)</Label>
        <Input id="phone" {...register("phone")} />
      </div>

      {serverError && <p className="text-small text-error">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Spinner className="h-4 w-4 text-current" />}
        {submitLabel}
      </Button>
    </form>
  );
}

function NewClientDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>Cargá los datos básicos del destinatario.</DialogDescription>
        </DialogHeader>
        <ClientForm
          submitLabel="Crear cliente"
          onSubmitAction={async (formData) => {
            const result = await createClientAction({}, formData);
            if (!result?.error) setOpen(false);
            return result;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

type ClientSummary = Pick<
  Tables<"clients">,
  "id" | "full_name" | "email" | "phone" | "client_type" | "company_name" | "status"
>;

function EditClientDialog({ client }: { client: ClientSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-outline transition-colors hover:text-primary"
          aria-label={`Editar ${client.full_name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        <ClientForm
          submitLabel="Guardar cambios"
          defaultValues={{
            full_name: client.full_name,
            client_type: client.client_type as "individual" | "company",
            email: client.email,
            phone: client.phone ?? "",
            company_name: client.company_name ?? "",
          }}
          onSubmitAction={async (formData) => {
            formData.set("id", client.id);
            formData.set("status", client.status);
            const result = await updateClientAction({}, formData);
            if (!result?.error) setOpen(false);
            return result;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export { NewClientDialog, EditClientDialog };
