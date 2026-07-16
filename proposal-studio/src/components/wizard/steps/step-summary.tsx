"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, FileStack, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SummaryCard } from "@/components/wizard/summary-card";
import { finalizeProposalAction } from "@/lib/wizard/actions";
import { emitProposalVersionAction } from "@/lib/versions/actions";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardStepProps } from "@/types/wizard";

function StepSummary({ onJumpToStep }: WizardStepProps) {
  const router = useRouter();
  const data = useWizardStore((state) => state.data);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [versionError, setVersionError] = useState<string | undefined>();
  const [emittedVersionId, setEmittedVersionId] = useState<string | undefined>();
  const [isEmitting, startEmitting] = useTransition();

  if (!data) return null;

  const proposalId = data.proposalId;
  const isCompleted = data.meta.status === "completed";

  function handleFinalize() {
    setError(undefined);
    startTransition(async () => {
      const result = await finalizeProposalAction(proposalId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/proposal/${proposalId}`);
    });
  }

  function handleEmitVersion() {
    setVersionError(undefined);
    startEmitting(async () => {
      const result = await emitProposalVersionAction(proposalId);
      if (result.error || !result.data) {
        setVersionError(result.error ?? "No pudimos emitir la versión.");
        return;
      }
      setEmittedVersionId(result.data.id);
    });
  }

  return (
    <div className="space-y-6">
      <SummaryCard title="Cliente" onEdit={() => onJumpToStep(0)}>
        <p className="font-semibold text-on-surface">{data.client.full_name}</p>
        <p className="text-small text-on-surface-variant">{data.client.email}</p>
      </SummaryCard>

      <SummaryCard title="Información de la propuesta" onEdit={() => onJumpToStep(1)}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-small">
          <div>
            <dt className="text-on-surface-variant">Título</dt>
            <dd className="font-semibold text-on-surface">{data.meta.title}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Producto</dt>
            <dd className="font-semibold text-on-surface">{data.meta.product}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Tipo</dt>
            <dd className="font-semibold text-on-surface">{data.meta.proposal_type}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Moneda</dt>
            <dd className="font-semibold text-on-surface">{data.meta.currency}</dd>
          </div>
        </dl>
      </SummaryCard>

      <SummaryCard
        title="Diagnóstico"
        onEdit={() => onJumpToStep(2)}
        empty={!data.narrative.current_situation.trim()}
        emptyLabel="Todavía no completaste el diagnóstico."
      >
        <p className="whitespace-pre-wrap text-small text-on-surface-variant">
          {data.narrative.current_situation}
        </p>
      </SummaryCard>

      <SummaryCard
        title="Alternativas"
        onEdit={() => onJumpToStep(3)}
        empty={data.alternatives.length === 0}
        emptyLabel="Todavía no agregaste alternativas."
      >
        <ul className="space-y-2 text-small">
          {data.alternatives.map((alternative, index) => (
            <li key={alternative.id ?? index} className="text-on-surface">
              <span className="font-semibold">{alternative.title}</span>{" "}
              <span className="text-on-surface-variant">
                — {alternative.insurance_company} / {alternative.product_name}
              </span>
            </li>
          ))}
        </ul>
      </SummaryCard>

      <SummaryCard
        title="Recomendación"
        onEdit={() => onJumpToStep(4)}
        empty={!data.narrative.recommended_strategy.trim()}
        emptyLabel="Todavía no completaste la recomendación."
      >
        <p className="whitespace-pre-wrap text-small text-on-surface-variant">
          {data.narrative.recommended_strategy}
        </p>
      </SummaryCard>

      <SummaryCard
        title="Beneficios"
        onEdit={() => onJumpToStep(5)}
        empty={data.benefits.length === 0}
        emptyLabel="Todavía no agregaste beneficios."
      >
        <ul className="space-y-1 text-small text-on-surface">
          {data.benefits.map((benefit, index) => (
            <li key={benefit.id ?? index}>{benefit.title}</li>
          ))}
        </ul>
      </SummaryCard>

      <SummaryCard
        title="Comparativa"
        onEdit={() => onJumpToStep(6)}
        empty={data.comparison.columns.length === 0 || data.comparison.rows.length === 0}
        emptyLabel="Todavía no armaste la comparativa."
      >
        <p className="text-small text-on-surface-variant">
          {data.comparison.columns.length} columnas · {data.comparison.rows.length} filas
        </p>
      </SummaryCard>

      <div className="flex flex-col items-end gap-2 border-t border-outline-variant pt-6">
        {error && <p className="text-small text-error">{error}</p>}
        {isCompleted ? (
          <p className="flex items-center gap-2 text-small font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            Propuesta finalizada.
          </p>
        ) : (
          <Button type="button" onClick={handleFinalize} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Finalizar propuesta
          </Button>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 border-t border-outline-variant pt-6">
        <p className="text-small text-on-surface-variant">
          Emitir una versión congela un snapshot inmutable del documento (independiente de si la propuesta ya está
          finalizada). Podés seguir editando el wizard después: no altera versiones ya emitidas.
        </p>
        {versionError && <p className="text-small text-error">{versionError}</p>}
        <div className="flex items-center gap-3">
          {emittedVersionId ? (
            <Button variant="secondary" asChild>
              <Link href={`/proposal/${proposalId}/versions/${emittedVersionId}/preview`}>
                <Eye className="h-4 w-4" />
                Ver preview
              </Link>
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={handleEmitVersion} disabled={isEmitting}>
            {isEmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
            Emitir versión
          </Button>
        </div>
      </div>
    </div>
  );
}

export { StepSummary };
