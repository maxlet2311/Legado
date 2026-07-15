"use client";

import { useEffect } from "react";

import { SectionCard } from "@/components/wizard/section-card";
import { EditableTable } from "@/components/wizard/editable-table";
import { useAutosave } from "@/hooks/use-autosave";
import { upsertComparisonAction } from "@/lib/wizard/actions";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardComparisonColumn, WizardComparisonRow } from "@/types/wizard";

function StepComparison() {
  const data = useWizardStore((state) => state.data);
  const setComparison = useWizardStore((state) => state.setComparison);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);

  const payload = data
    ? { proposal_id: data.proposalId, columns: data.comparison.columns, rows: data.comparison.rows }
    : null;

  const { status, error, saveNow } = useAutosave(payload, async (value) => {
    if (!value) return;
    const result = await upsertComparisonAction(value);
    return { error: result.error };
  });

  useEffect(() => {
    setStepMeta({ isValid: true, autosaveStatus: status, autosaveError: error, saveNow });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, error, saveNow]);

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
