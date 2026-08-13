"use client";

import { useState } from "react";

import { SectionCard } from "@/components/wizard/section-card";
import { RichTextarea } from "@/components/wizard/rich-textarea";
import { NarrativeLibraryActions } from "@/components/wizard/steps/narrative-library-actions";
import { useNarrativeAutosave } from "@/hooks/use-narrative-autosave";
import { useWizardStore } from "@/stores/wizard-store";

function StepRecommendation() {
  const data = useWizardStore((state) => state.data);
  const setNarrative = useWizardStore((state) => state.setNarrative);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const isValid = Boolean(data?.narrative.recommended_strategy.trim());
  useNarrativeAutosave(isValid);

  if (!data) return null;

  return (
    <SectionCard
      title="Recomendación"
      description="La recomendación profesional que sustenta la propuesta."
      actions={
        <NarrativeLibraryActions
          category="recommendation"
          currentText={data.narrative.recommended_strategy}
          currentTitle="Recomendación"
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
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
        label="Recomendación"
        required
        rows={10}
        value={data.narrative.recommended_strategy}
        onChange={(value) => setNarrative({ recommended_strategy: value })}
        hint="Este texto es el corazón de la propuesta: explicá por qué esta es la mejor estrategia para el cliente."
      />
      <RichTextarea
        label="Resumen ejecutivo"
        rows={5}
        value={data.narrative.executive_summary}
        onChange={(value) => setNarrative({ executive_summary: value })}
        hint="Síntesis breve de la propuesta para lectores que solo leen la primera página."
      />
      <RichTextarea
        label="Mensaje final"
        rows={5}
        value={data.narrative.final_message}
        onChange={(value) => setNarrative({ final_message: value })}
        hint="Cierre personalizado del documento. Si lo dejás vacío, se usa un mensaje de cierre genérico."
      />
    </SectionCard>
  );
}

export { StepRecommendation };
