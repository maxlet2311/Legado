"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createMembershipAction } from "@/lib/memberships/admin-actions";

function NewMembershipForm({ plans }: { plans: { id: string; name: string; isActive: boolean }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const dateValue = formData.get("currentPeriodEndDate");
    if (dateValue) formData.set("currentPeriodEnd", new Date(`${dateValue}T00:00:00Z`).toISOString());
    setError(undefined);
    startTransition(async () => {
      const result = await createMembershipAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else if (result.membershipId) {
        router.push(`/admin/memberships/${result.membershipId}`);
      }
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-xl border border-outline-variant bg-surface p-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="usuario@ejemplo.com" />
      </div>

      <div className="space-y-2">
        <Label>Plan</Label>
        <Select name="planId" defaultValue={plans.find((p) => p.isActive)?.id}>
          <SelectTrigger aria-label="Plan">
            <SelectValue placeholder="Seleccioná un plan" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id} disabled={!p.isActive}>
                {p.name}
                {!p.isActive ? " (inactivo)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currentPeriodEndDate">Vencimiento (opcional)</Label>
        <Input id="currentPeriodEndDate" name="currentPeriodEndDate" type="date" />
        <p className="text-caption text-on-surface-variant">Si se deja vacío, la membresía queda sin vencimiento explícito.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo (obligatorio)</Label>
        <Textarea id="reason" name="reason" required placeholder="Ej.: alta manual acordada por soporte, cortesía, prueba interna." />
      </div>

      {error && <p className="rounded-md bg-error-container px-4 py-3 text-small text-error">{error}</p>}

      <div className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear membresía
        </Button>
      </div>
    </form>
  );
}

export { NewMembershipForm };
