"use client";

import { useEffect, useMemo } from "react";

import { SectionCard } from "@/components/wizard/section-card";
import { EditableTable } from "@/components/wizard/editable-table";
import { useAutosave } from "@/hooks/use-autosave";
import { upsertComparisonAction } from "@/lib/wizard/actions";
import { createClient } from "@/lib/database/client";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardComparisonColumn, WizardComparisonRow } from "@/types/wizard";

function StepComparison() {
  const data = useWizardStore((state) => state.data);
  const setComparison = useWizardStore((state) => state.setComparison);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);

  // Memoizado por valor: ver use-proposal-details-autosave.ts para por qué un literal
  // nuevo en cada render acá dispara un loop infinito de re-renders.
  const payload = useMemo(
    () =>
      data
        ? {
            proposal_id: data.proposalId,
            columns: data.comparison.columns,
            rows: data.comparison.rows,
            expected_revision: data.comparison.revision,
          }
        : null,
    // Deps intencionalmente granulares (no `data`): ver use-proposal-details-autosave.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.proposalId, data?.comparison.columns, data?.comparison.rows, data?.comparison.revision],
  );

  const { status, error, conflictRevision, saveNow, forceSaveNow, clearConflict } = useAutosave(
    payload,
    async (value) => {
      if (!value) return;
      const result = await upsertComparisonAction(value);
      if (result.conflict) {
        return { conflict: true, currentRevision: result.currentRevision };
      }
      if (result.data) {
        setComparison({ revision: result.data.revision });
      }
      return { error: result.error };
    },
  );

  useEffect(() => {
    setStepMeta({
      isValid: true,
      autosaveStatus: status,
      autosaveError: error,
      saveNow,
      conflictRevision,
      resolveKeepMine: () => {
        if (!payload) return;
        const revision = conflictRevision ?? payload.expected_revision;
        setComparison({ revision });
        forceSaveNow({ ...payload, expected_revision: revision });
      },
      resolveReload: async () => {
        if (!data) return;
        const supabase = createClient();
        const { data: fresh } = await supabase
          .from("proposal_comparisons")
          .select("columns, rows, revision")
          .eq("proposal_id", data.proposalId)
          .maybeSingle();
        setComparison({
          columns: (fresh?.columns as WizardComparisonColumn[] | undefined) ?? [],
          rows: (fresh?.rows as WizardComparisonRow[] | undefined) ?? [],
          revision: fresh?.revision ?? null,
        });
        clearConflict();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, error, saveNow, conflictRevision, forceSaveNow, clearConflict]);

  if (!data) return null;

  function handleChange(columns: WizardComparisonColumn[], rows: WizardComparisonRow[]) {
    setComparison({ columns, rows });
  }

  return (
    <SectionCard
      title="Comparativa"
      description="Tabla comparativa entre las alternativas. Columnas y filas dinámicas, lista para el PDF."
    >
      <EditableTable columns={data.comparison.columns} rows={data.comparison.rows} onChange={handleChange} />
    </SectionCard>
  );
}

export { StepComparison };
