"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { cleanupExpiredCheckoutAttemptsAction } from "@/app/(app)/admin/payments/actions";

/**
 * Limpieza de intentos de checkout vencidos: solo marca `status = 'expired'`
 * sobre intentos abiertos (`creating`/`ready`/`redirected`) cuyo `expires_at`
 * ya pasó — nunca borra filas ni llama a Mercado Pago (no existe mecanismo
 * oficial para desactivar un `preapproval_plan`, ver
 * `checkout-attempts-cleanup.ts`). Es no destructivo e idempotente (correr
 * dos veces seguidas no cambia nada la segunda vez), así que la
 * confirmación es un `Dialog` simple, mismo nivel de fricción que las
 * acciones de invitaciones.
 */
function CleanupPanel({ expiredPendingCount }: { expiredPendingCount: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof cleanupExpiredCheckoutAttemptsAction>> | null>(null);

  function submit() {
    startTransition(async () => {
      const outcome = await cleanupExpiredCheckoutAttemptsAction();
      setResult(outcome);
      if (!outcome.error) setOpen(false);
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-on-surface-variant" />
          <div>
            <h2 className="text-h4 font-semibold text-on-surface">Limpieza de checkouts vencidos</h2>
            <p className="mt-1 text-small text-on-surface-variant">
              {expiredPendingCount > 0
                ? `Hay ${expiredPendingCount} intento${expiredPendingCount === 1 ? "" : "s"} abierto${expiredPendingCount === 1 ? "" : "s"} cuyo plazo ya venció.`
                : "No hay intentos abiertos vencidos en este momento."}
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="secondary" disabled={expiredPendingCount === 0}>
              Limpiar vencidos…
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Limpiar intentos de checkout vencidos</DialogTitle>
              <DialogDescription>
                Marca como <code>expired</code> todo intento abierto (creando/listo/redirigido) cuyo plazo ya pasó.
                No borra evidencia ni llama al proveedor externo — el plan exclusivo de Mercado Pago queda
                simplemente sin uso del lado del proveedor.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={isPending} onClick={submit}>
                {isPending && <Spinner className="h-4 w-4 text-current" />}
                Confirmar limpieza
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-md border p-3 text-small ${
            result.error ? "border-error/30 bg-error-container text-on-error-container" : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {result.error ? result.error : `Se marcaron ${result.expiredCount ?? 0} intento(s) como vencidos.`}
        </div>
      )}
    </Card>
  );
}

export { CleanupPanel };
