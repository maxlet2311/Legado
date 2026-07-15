"use client";

import { SectionCard } from "@/components/wizard/section-card";
import { RichTextarea } from "@/components/wizard/rich-textarea";
import { useNarrativeAutosave } from "@/hooks/use-narrative-autosave";
import { useWizardStore } from "@/stores/wizard-store";

function StepRecommendation() {
  const data = useWizardStore((state) => state.data);
  const setNarrative = useWizardStore((state) => state.setNarrative);

  const isValid = Boolean(data?.narrative.recommended_strategy.trim());
  useNarrativeAutosave(isValid);

  if (!data) return null;

  return (
    <SectionCard
      title="Recomendación"
      description="La recomendación profesional que sustenta la propuesta."
    >
      <RichTextarea
        label="Recomendación"
        required
        rows={10}
        value={data.narrative.recommended_strategy}
        onChange={(value) => setNarrative({ recommended_strategy: value })}
        hint="Este texto es el corazón de la propuesta: explicá por qué esta es la mejor estrategia para el cliente."
      />
    </SectionCard>
  );
}

export { StepRecommendation };
