"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { migrateExistingUsersAction } from "@/lib/memberships/migrate-users-action";
import type { MigrateUsersActionResult } from "@/lib/memberships/migrate-users-action";

function MigrateUsersForm({ plans }: { plans: { id: string; name: string; isActive: boolean }[] }) {
  const [selectionMode, setSelectionMode] = useState<"all" | "emails">("all");
  const [state, setState] = useState<MigrateUsersActionResult>({});
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData, dryRun: boolean) {
    formData.set("selectionMode", selectionMode);
    formData.set("dryRun", String(dryRun));
    startTransition(async () => {
      const result = await migrateExistingUsersAction({}, formData);
      setState(result);
    });
  }

  return (
    <div className="space-y-6">
      <Card asChild className="p-6">
      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Plan a asignar</Label>
            <Select name="planId" defaultValue={plans[0]?.id}>
              <SelectTrigger>
                <SelectValue />
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
            <Label htmlFor="currentPeriodEnd">Vencimiento otorgado</Label>
            <Input id="currentPeriodEnd" name="currentPeriodEndDate" type="date" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Selección de usuarios</Label>
          <Select value={selectionMode} onValueChange={(v) => setSelectionMode(v as "all" | "emails")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los perfiles activos sin membresía (excluye Platform Owners)</SelectItem>
              <SelectItem value="emails">Emails específicos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectionMode === "emails" && (
          <div className="space-y-2">
            <Label htmlFor="emails">Emails (uno por línea o separados por coma)</Label>
            <Textarea id="emails" name="emails" placeholder="usuario1@ejemplo.com&#10;usuario2@ejemplo.com" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo (obligatorio para la ejecución real)</Label>
          <Textarea id="reason" name="reason" required defaultValue="Migración controlada previa a enforcement (Etapa 6)." />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={(e) => {
              const form = e.currentTarget.closest("form");
              if (!form) return;
              const formData = new FormData(form);
              const dateValue = formData.get("currentPeriodEndDate");
              if (dateValue) formData.set("currentPeriodEnd", new Date(`${dateValue}T00:00:00Z`).toISOString());
              submit(formData, true);
            }}
          >
            {isPending && <Spinner className="h-4 w-4 text-current" />}
            Dry-run
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={(e) => {
              if (!window.confirm("¿Ejecutar la migración real? Esto crea membresías `authorized` de verdad.")) return;
              const form = e.currentTarget.closest("form");
              if (!form) return;
              const formData = new FormData(form);
              const dateValue = formData.get("currentPeriodEndDate");
              if (dateValue) formData.set("currentPeriodEnd", new Date(`${dateValue}T00:00:00Z`).toISOString());
              submit(formData, false);
            }}
          >
            {isPending && <Spinner className="h-4 w-4 text-current" />}
            Ejecutar migración
          </Button>
        </div>
      </form>
      </Card>

      {state.error && <p className="rounded-md bg-error-container px-4 py-3 text-small text-error">{state.error}</p>}

      {state.result && (
        <Card className="space-y-4 p-6">
          <h2 className="text-body font-semibold text-on-surface">
            {state.result.dryRun ? "Resultado (dry-run, no se creó nada)" : "Resultado de la ejecución"}
          </h2>
          <dl className="grid grid-cols-3 gap-4 text-small">
            <div>
              <dt className="text-on-surface-variant">Evaluados</dt>
              <dd className="text-h4 font-semibold text-on-surface">{state.result.totalCandidates}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">{state.result.dryRun ? "Elegibles" : "Creados"}</dt>
              <dd className="text-h4 font-semibold text-success">{state.result.created.length}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Omitidos</dt>
              <dd className="text-h4 font-semibold text-warning">{state.result.skipped.length}</dd>
            </div>
          </dl>

          {state.result.skipped.length > 0 && (
            <div>
              <h3 className="mb-2 text-small font-semibold text-on-surface">Omitidos</h3>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-caption text-on-surface-variant">
                {state.result.skipped.map((s) => (
                  <li key={s.userId}>
                    {s.email || s.userId} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.result.created.length > 0 && (
            <div>
              <h3 className="mb-2 text-small font-semibold text-on-surface">{state.result.dryRun ? "Elegibles" : "Creados"}</h3>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-caption text-on-surface-variant">
                {state.result.created.map((c) => (
                  <li key={c.userId}>{c.email}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export { MigrateUsersForm };
