import { Badge } from "@/components/ui/badge";
import type { MembershipStatus } from "@/lib/memberships/types";

const STATUS_LABELS: Record<MembershipStatus, string> = {
  pending: "Pendiente",
  authorized: "Autorizada",
  active: "Activa",
  past_due: "Pago pendiente",
  grace_period: "En gracia",
  paused: "Pausada",
  canceled: "Cancelada",
  expired: "Vencida",
  suspended: "Suspendida",
};

const STATUS_VARIANTS: Record<MembershipStatus, "success" | "warning" | "error" | "draft" | "completed"> = {
  pending: "draft",
  authorized: "completed",
  active: "success",
  past_due: "warning",
  grace_period: "warning",
  paused: "draft",
  canceled: "error",
  expired: "error",
  suspended: "error",
};

function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Nunca mostrar un ID externo completo (provider_subscription_id/provider_customer_id) — solo los últimos 4 caracteres. */
function maskExternalId(value: string | null): string {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

export { MembershipStatusBadge, STATUS_LABELS, formatDate, formatDateTime, maskExternalId };
