import { Badge } from "@/components/ui/badge";
import type { ProposalStatus } from "@/types/proposal";

export type { ProposalStatus };

const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "Borrador",
  completed: "Completada",
  exported: "Exportada",
  archived: "Archivada",
};

export interface StatusPillProps {
  status: ProposalStatus;
}

function StatusPill({ status }: StatusPillProps) {
  return <Badge variant={status}>{STATUS_LABEL[status]}</Badge>;
}

export { StatusPill };
