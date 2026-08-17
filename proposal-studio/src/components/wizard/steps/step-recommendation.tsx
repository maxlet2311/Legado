"use client";

import { useState } from "react";

import { SectionCard } from "@/components/wizard/section-card";
import { RichTextarea } from "@/components/wizard/rich-textarea";
import { NarrativeLibraryActions } from "@/components/wizard/steps/narrative-library-actions";
import { useNarrativeAutosave } from "@/hooks/use-narrative-autosave";
import { useWizardStore, useIsWizardReadOnly } from "@/stores/wizard-store";

function StepRecommendation() {
  const data = useWizardStore((state) => state.data);
  const setNarrative = useWizardStore((state) => state.setNarrative);
  const isReadOnly = useIsWizardReadOnly();
  const [libraryOpen, setLibraryOpen] = useState(false);

  const isValid = Boolean(data?.narrative.recommended_strategy.trim());
  useNarrativeAutosave(isValid);

  if (!data) return null;

  return (
    <SectionCard
      actions={
        <NarrativeLibraryActions
          category="recommendation"
          currentText={data.narrative.recommended_strategy}
          currentTitle="Recomendación"
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          isReadOnly={isReadOnly}
          onInsertText={(text) =>
            setNarrative({
              recommended_strategy: data.narrative.recommended_strategy
                ? `${data.narrative.recommended_strategy}\n\n${text}`
                : text,
            })
          }
        />
      }
    >
      <RichTextarea
        label="Estrategia recomendada"
        required
        rows={8}
        value={data.narrative.recommended_strategy}
        onChange={(value) => setNarrative({ recommended_strategy: value })}
        hint="Este texto es el corazón de la propuesta: explicá con claridad y autoridad por qué esta es la mejor solución estratégica para el cliente."
        disabled={isReadOnly}
        className="border-l-4 border-secondary bg-recommended-bg/30 p-4 rounded-r-xl"
      />
      <RichTextarea
        label="Resumen ejecutivo"
        rows={5}
        value={data.narrative.executive_summary}
        onChange={(value) => setNarrative({ executive_summary: value })}
        hint="Síntesis breve de la propuesta para lectores que solo leen la primera página."
        disabled={isReadOnly}
      />
      <RichTextarea
        label="Mensaje final"
        rows={5}
        value={data.narrative.final_message}
        onChange={(value) => setNarrative({ final_message: value })}
        hint="Cierre personalizado del documento. Si lo dejás vacío, se usa un mensaje de cierre genérico."
        disabled={isReadOnly}
      />
    </SectionCard>
  );
}

export { StepRecommendation };
