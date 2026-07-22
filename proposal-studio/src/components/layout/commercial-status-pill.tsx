import { Badge } from "@/components/ui/badge";
import type { CommercialStatus } from "@/types/proposal";

export type { CommercialStatus };

export const COMMERCIAL_STATUS_LABEL: Record<CommercialStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  negotiation: "En negociación",
  accepted: "Aceptada",
  rejected: "Rechazada",
  archived: "Archivada",
};

export const COMMERCIAL_STATUSES: CommercialStatus[] = [
  "draft",
  "sent",
  "negotiation",
  "accepted",
  "rejected",
  "archived",
];

export interface CommercialStatusPillProps {
  status: CommercialStatus;
}

function CommercialStatusPill({ status }: CommercialStatusPillProps) {
  return <Badge variant={status}>{COMMERCIAL_STATUS_LABEL[status]}</Badge>;
}

export { CommercialStatusPill };
