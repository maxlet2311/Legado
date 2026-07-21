"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { reconcileSubscriptionAction } from "@/app/(app)/admin/payments/actions";
import { buildReconcileResultSummary } from "@/lib/payments/reconcile-result-summary";

/**
 * Reconciliación manual de UNA suscripción real de Mercado Pago (el backend
 * real — `reconcileMercadoPagoPreapproval` — nunca es masivo, ver
 * `docs/UI_COVERAGE_AUDIT.md`). No hay dry-run: se advierte explícitamente y
 * se exige tildar un checkbox de "entiendo" antes de habilitar la
 * confirmación — fricción reforzada frente al `ConfirmDialog` simple que
 * usan las invitaciones, porque acá el resultado puede modificar el estado
 * real de una membresía sin posibilidad de previsualizar el cambio antes.
 */
function ReconcilePanel() {
  const [open, setOpen] = useState(false);
  const [preapprovalId, setPreapprovalId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof reconcileSubscriptionAction>> | null>(null);

  function submit() {
    const formData = new FormData();
    formData.set("preapprovalId", preapprovalId.trim());
    startTransition(async () => {
      const outcome = await reconcileSubscriptionAction({}, formData);
      setResult(outcome);
      if (!outcome.error) {
        setOpen(false);
        setAcknowledged(false);
      }
    });
  }

  const summary = result ? buildReconcileResultSummary(result) : null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-on-surface-variant" />
        <h2 className="text-h4 font-semibold text-on-surface">Reconciliar suscripción</h2>
      </div>
      <p className="mt-2 text-small text-on-surface-variant">
        Reconsulta una suscripción puntual de Mercado Pago (identificada por su <code>preapproval id</code>) y, si
        corresponde a un intento de checkout local, sincroniza el estado de la membresía asociada. Esta acción{" "}
        <strong>no es masiva</strong>: opera sobre una sola suscripción a la vez, la misma que resuelve el webhook
        automáticamente. Usala cuando un evento quedó huérfano y ya identificaste el id real de la suscripción del
        lado de Mercado Pago.
      </p>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setAcknowledged(false);
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="secondary" className="mt-4" disabled={preapprovalId.trim().length === 0}>
            Reconciliar…
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconciliar suscripción de Mercado Pago</DialogTitle>
            <DialogDescription>
              Esta operación consulta el proveedor real (ambiente configurado actualmente) y puede aplicar cambios
              reales e inmediatos sobre una membresía. No existe un modo de prueba/previsualización para esta
              acción.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-small text-on-surface-variant">
              Id de suscripción: <span className="font-mono text-on-surface">{preapprovalId || "—"}</span>
            </p>
            <label className="flex items-start gap-2 text-small text-on-surface">
              <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} />
              Entiendo que esto puede aplicar cambios reales de inmediato y que no hay forma de previsualizar el
              resultado antes de ejecutarlo.
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="danger" disabled={!acknowledged || isPending} onClick={submit}>
              {isPending && <Spinner className="h-4 w-4 text-current" />}
              Ejecutar reconciliación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-4 max-w-md">
        <label className="text-caption font-medium text-on-surface-variant">Id de suscripción (preapproval)</label>
        <Input
          className="mt-1"
          placeholder="ej. 2c9380..."
          value={preapprovalId}
          onChange={(e) => {
            setPreapprovalId(e.target.value);
            setResult(null);
          }}
        />
      </div>

      {summary && (
        <div
          className={`mt-4 rounded-md border p-4 text-small ${
            summary.tone === "success"
              ? "border-success/30 bg-success/10 text-success"
              : summary.tone === "error"
                ? "border-error/30 bg-error-container text-on-error-container"
                : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          <p className="font-semibold">{summary.title}</p>
          <p className="mt-1">{summary.description}</p>
        </div>
      )}
    </Card>
  );
}

export { ReconcilePanel };
