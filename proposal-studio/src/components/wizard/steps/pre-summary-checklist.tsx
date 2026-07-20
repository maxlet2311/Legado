"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { runSemanticChecksAction, type SemanticFinding } from "@/lib/ai/semantic-review-action";
import type { Finding } from "@/lib/wizard/pre-summary-checks";

interface PreSummaryChecklistProps {
  proposalId: string;
  deterministicFindings: Finding[];
  onJumpToStep: (step: number) => void;
}

/** Lista accionable "Antes de emitir": reglas determinísticas + revisión semántica opcional con IA. */
function PreSummaryChecklist({ proposalId, deterministicFindings, onJumpToStep }: PreSummaryChecklistProps) {
  const [semanticFindings, setSemanticFindings] = useState<SemanticFinding[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSemanticReview() {
    setLoading(true);
    setError(null);
    const result = await runSemanticChecksAction(proposalId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSemanticFindings(result.data ?? []);
  }

  const totalFindings = deterministicFindings.length + (semanticFindings?.length ?? 0);
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
        <Button type="button" variant="ghost" size="sm" onClick={handleSemanticReview} disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          Revisar con IA
        </Button>
      </div>
      {error ? <p className="mt-2 text-caption text-error">{error}</p> : null}

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
          {(semanticFindings ?? []).map((finding, index) => (
            <li key={`s-${index}`} className="flex items-start gap-2 rounded-md border border-outline-variant p-3">
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${finding.severity === "error" ? "text-error" : "text-warning"}`}
              />
              <span className="flex-1 text-small text-on-surface">{finding.message}</span>
              <Badge variant={finding.severity === "error" ? "error" : "warning"}>IA</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export { PreSummaryChecklist };
