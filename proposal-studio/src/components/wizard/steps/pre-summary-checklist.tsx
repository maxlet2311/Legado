"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Finding } from "@/lib/wizard/pre-summary-checks";

interface PreSummaryChecklistProps {
  deterministicFindings: Finding[];
  onJumpToStep: (step: number) => void;
}

/** Lista accionable "Antes de emitir": reglas determinísticas del checklist. */
function PreSummaryChecklist({ deterministicFindings, onJumpToStep }: PreSummaryChecklistProps) {
  const totalFindings = deterministicFindings.length;
  const blockingCount = deterministicFindings.filter((f) => f.severity === "error").length;
  const hasAnyFindings = totalFindings > 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-h4 font-semibold text-on-surface">Antes de emitir</h3>
          {hasAnyFindings ? (
            <Badge variant={blockingCount > 0 ? "error" : "warning"}>
              {totalFindings} {totalFindings === 1 ? "pendiente" : "pendientes"}
            </Badge>
          ) : null}
        </div>
      </div>

      {!hasAnyFindings ? (
        <p className="mt-4 flex items-center gap-2 text-small text-success">
          <CheckCircle2 className="h-4 w-4" />
          No encontramos problemas pendientes.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {deterministicFindings.map((finding, index) => (
            <li key={`d-${index}`}>
              <button
                type="button"
                onClick={() => onJumpToStep(finding.step)}
                className="flex w-full items-start gap-2 rounded-md border border-outline-variant p-3 text-left hover:bg-surface-container-low"
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${finding.severity === "error" ? "text-error" : "text-warning"}`}
                />
                <span className="flex-1 text-small text-on-surface">{finding.message}</span>
                <Badge variant={finding.severity === "error" ? "error" : "warning"}>
                  {finding.severity === "error" ? "Bloquea" : "Advertencia"}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export { PreSummaryChecklist };
