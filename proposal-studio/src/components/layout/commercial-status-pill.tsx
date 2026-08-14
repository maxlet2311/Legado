import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";
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

/**
 * Familia oliva ("status-commercial" en el North Star de Stitch): ver
 * comentario en `status-pill.tsx` sobre por qué esta pill ya no comparte
 * paleta con `StatusPill` (documento técnico, familia azul).
 */
const commercialPillVariants = cva("inline-flex items-center rounded-full px-3 py-1 text-caption font-semibold", {
  variants: {
    status: {
      draft: "bg-secondary/10 text-secondary",
      sent: "bg-secondary-fixed text-on-secondary-fixed",
      negotiation: "bg-warning/15 text-warning",
      accepted: "bg-secondary text-on-secondary",
      rejected: "bg-error-container text-on-error-container",
      archived: "bg-surface-variant text-on-surface-variant",
    } satisfies Record<CommercialStatus, string>,
  },
});

export interface CommercialStatusPillProps {
  status: CommercialStatus;
  className?: string;
}

function CommercialStatusPill({ status, className }: CommercialStatusPillProps) {
  return (
    <span className={cn(commercialPillVariants({ status }), className)}>{COMMERCIAL_STATUS_LABEL[status]}</span>
  );
}

export { CommercialStatusPill };
