import { Badge } from "@/components/ui/badge";
import type { ProcessingStatus } from "@/lib/payments/webhook-event-status";
import type { CheckoutAttemptStatus } from "@/lib/payments/checkout-attempts-repository";

/** Enum real confirmado en `20260717020000_membership_checkout_attempts.sql` (constraint `check`). */
const PROCESSING_STATUS_LABELS: Record<string, string> = {
  received: "Recibido",
  processing: "Procesando",
  processed: "Procesado",
  ignored: "Ignorado",
  failed: "Fallido",
  unmatched: "No asociado",
};

const PROCESSING_STATUS_VARIANTS: Record<string, "success" | "warning" | "error" | "draft" | "completed"> = {
  received: "draft",
  processing: "draft",
  processed: "success",
  ignored: "completed",
  failed: "error",
  unmatched: "warning",
};

function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  return <Badge variant={PROCESSING_STATUS_VARIANTS[status] ?? "draft"}>{PROCESSING_STATUS_LABELS[status] ?? status}</Badge>;
}

/** Enum real confirmado en la misma migración (constraint `check` de `membership_checkout_attempts.status`). */
const CHECKOUT_ATTEMPT_STATUS_LABELS: Record<string, string> = {
  creating: "Creando",
  ready: "Listo",
  redirected: "Redirigido",
  matched: "Vinculado",
  completed: "Completado",
  failed: "Fallido",
  expired: "Vencido",
  canceled: "Cancelado",
};

const CHECKOUT_ATTEMPT_STATUS_VARIANTS: Record<string, "success" | "warning" | "error" | "draft" | "completed"> = {
  creating: "draft",
  ready: "draft",
  redirected: "draft",
  matched: "completed",
  completed: "success",
  failed: "error",
  expired: "warning",
  canceled: "error",
};

function CheckoutAttemptStatusBadge({ status }: { status: CheckoutAttemptStatus }) {
  return (
    <Badge variant={CHECKOUT_ATTEMPT_STATUS_VARIANTS[status] ?? "draft"}>
      {CHECKOUT_ATTEMPT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export {
  ProcessingStatusBadge,
  CheckoutAttemptStatusBadge,
  PROCESSING_STATUS_LABELS,
  CHECKOUT_ATTEMPT_STATUS_LABELS,
};
