import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";
import type { ProposalStatus } from "@/types/proposal";

export type { ProposalStatus };

const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "Borrador",
  completed: "Completada",
  exported: "Exportada",
  archived: "Archivada",
};

/**
 * Familia azul ("status-document" en el North Star de Stitch): este pill
 * describe el estado TÉCNICO del documento, no el comercial. Antes reusaba
 * las variantes genéricas de `Badge` (`variant={status}`), que también usa
 * `CommercialStatusPill` -- como ambos tienen un estado "draft", las dos
 * pills se veían pixel-idénticas ("Borrador" gris dos veces seguidas en la
 * misma fila, auditoría UX/UI hallazgo P2). Con paleta propia por tipo de
 * pill, dos pills que coinciden en texto siguen siendo distinguibles a
 * simple vista.
 */
const documentPillVariants = cva("inline-flex items-center rounded-full px-3 py-1 text-caption font-semibold", {
  variants: {
    status: {
      draft: "bg-primary/10 text-primary",
      completed: "bg-primary text-on-primary",
      exported: "bg-primary-fixed text-on-primary-fixed",
      archived: "bg-surface-variant text-on-surface-variant",
    } satisfies Record<ProposalStatus, string>,
  },
});

export interface StatusPillProps {
  status: ProposalStatus;
  className?: string;
}

function StatusPill({ status, className }: StatusPillProps) {
  return <span className={cn(documentPillVariants({ status }), className)}>{STATUS_LABEL[status]}</span>;
}

export { StatusPill };
