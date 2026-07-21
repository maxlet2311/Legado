"use client";

import { useState, useTransition } from "react";
import { PlusCircle, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createPlanAction, updatePlanAction, togglePlanActiveAction, syncPlanWithProviderAction } from "@/lib/membership-plans/actions";
import type { MembershipPlan } from "@/lib/memberships/types";

function PlanForm({
  defaultValues,
  onSubmitAction,
  submitLabel,
}: {
  defaultValues?: Partial<MembershipPlan>;
  onSubmitAction: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
}) {
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [billingInterval, setBillingInterval] = useState(defaultValues?.billingInterval ?? "month");
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);

  function handleSubmit(formData: FormData) {
    formData.set("billing_interval", billingInterval);
    formData.set("is_active", String(isActive));
    setError(undefined);
    startTransition(async () => {
      const result = await onSubmitAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input id="code" name="code" defaultValue={defaultValues?.code} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" name="description" defaultValue={defaultValues?.description ?? ""} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Precio</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={defaultValues?.price ?? 0} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <Input id="currency" name="currency" defaultValue={defaultValues?.currency ?? "ARS"} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_interval_count">Cada</Label>
          <Input
            id="billing_interval_count"
            name="billing_interval_count"
            type="number"
            min="1"
            defaultValue={defaultValues?.billingIntervalCount ?? 1}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Frecuencia</Label>
        <Select value={billingInterval} onValueChange={(v) => setBillingInterval(v as "month" | "year")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mensual</SelectItem>
            <SelectItem value="year">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sort_order">Orden</Label>
          <Input id="sort_order" name="sort_order" type="number" min="0" defaultValue={defaultValues?.sortOrder ?? 0} required />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            id="is_active"
            type="checkbox"
            className="h-4 w-4"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <Label htmlFor="is_active">Plan activo</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Proveedor</Label>
          <Input id="provider" name="provider" placeholder="mercado_pago" defaultValue={defaultValues?.provider ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="provider_plan_id">ID de plan del proveedor</Label>
          <Input id="provider_plan_id" name="provider_plan_id" defaultValue={defaultValues?.providerPlanId ?? ""} />
        </div>
      </div>

      {error && <p className="text-small text-error">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner className="h-4 w-4 text-current" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PlanDialog({ mode, plan }: { mode: "create" | "edit"; plan?: MembershipPlan }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button type="button">
            <PlusCircle className="h-4 w-4" />
            Nuevo plan
          </Button>
        ) : (
          <button type="button" className="text-outline transition-colors hover:text-primary" aria-label={`Editar ${plan?.name}`}>
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo plan" : "Editar plan"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Los planes se desactivan, nunca se borran."
              : "El precio no afecta membresías ya contratadas — solo aplica hacia adelante."}
          </DialogDescription>
        </DialogHeader>
        <PlanForm
          defaultValues={plan}
          submitLabel={mode === "create" ? "Crear plan" : "Guardar cambios"}
          onSubmitAction={async (formData) => {
            if (mode === "edit" && plan) formData.set("id", plan.id);
            const result = mode === "create" ? await createPlanAction({}, formData) : await updatePlanAction({}, formData);
            if (!result?.error) setOpen(false);
            return result;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ToggleActiveButton({ planId, isActive }: { planId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={isPending}
      onClick={() => {
        const formData = new FormData();
        formData.set("id", planId);
        formData.set("isActive", String(isActive));
        startTransition(async () => {
          await togglePlanActiveAction({}, formData);
        });
      }}
    >
      {isPending && <Spinner className="h-4 w-4 text-current" />}
      {isActive ? "Desactivar" : "Activar"}
    </Button>
  );
}

/** Crea o verifica el plan equivalente en Mercado Pago. Requiere confirmación explícita porque crea un recurso externo. */
function SyncProviderButton({ planId, provider, hasProviderPlanId }: { planId: string; provider: string | null; hasProviderPlanId: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const label = provider && hasProviderPlanId ? "Verificar en Mercado Pago" : "Crear en Mercado Pago";

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() => {
          const confirmed = window.confirm(
            provider && hasProviderPlanId
              ? "Esto va a consultar el plan ya asociado en Mercado Pago y comparar los valores. No crea ningún recurso nuevo. ¿Continuar?"
              : "Esto va a crear un plan de suscripción real (de prueba) en Mercado Pago con las credenciales configuradas en el servidor. ¿Continuar?",
          );
          if (!confirmed) return;
          const formData = new FormData();
          formData.set("planId", planId);
          setError(undefined);
          startTransition(async () => {
            const result = await syncPlanWithProviderAction({}, formData);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {isPending && <Spinner className="h-4 w-4 text-current" />}
        {label}
      </Button>
      {error && <p className="text-small text-error">{error}</p>}
    </div>
  );
}

export { PlanDialog, ToggleActiveButton, SyncProviderButton };
