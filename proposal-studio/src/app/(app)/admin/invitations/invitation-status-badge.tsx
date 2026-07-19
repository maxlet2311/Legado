import { Badge } from "@/components/ui/badge";
import type { AdminInvitationStatus } from "@/lib/account-activation/types";

const STATUS_LABELS: Record<AdminInvitationStatus, string> = {
  pending: "Pendiente",
  used: "Usada",
  revoked: "Cancelada",
  expired: "Vencida",
};

const STATUS_VARIANTS: Record<AdminInvitationStatus, "success" | "warning" | "error" | "draft" | "completed"> = {
  pending: "warning",
  used: "success",
  revoked: "error",
  expired: "draft",
};

function InvitationStatusBadge({ status }: { status: AdminInvitationStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}

export { InvitationStatusBadge, STATUS_LABELS };
