"use client";

import { useState } from "react";

import { SectionCard } from "@/components/wizard/section-card";
import { RichTextarea } from "@/components/wizard/rich-textarea";
import { NarrativeLibraryActions } from "@/components/wizard/steps/narrative-library-actions";
import { useNarrativeAutosave } from "@/hooks/use-narrative-autosave";
import { useWizardStore, useIsWizardReadOnly } from "@/stores/wizard-store";

function StepDiagnosis() {
  const data = useWizardStore((state) => state.data);
  const setNarrative = useWizardStore((state) => state.setNarrative);
  const isReadOnly = useIsWizardReadOnly();
  const [libraryOpen, setLibraryOpen] = useState(false);

  const isValid = Boolean(data?.narrative.current_situation.trim());
  useNarrativeAutosave(isValid);

  if (!data) return null;

  return (
    <SectionCard
      actions={
        <NarrativeLibraryActions
          category="diagnosis"
          currentText={data.narrative.current_situation}
          currentTitle="Diagnóstico"
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          isReadOnly={isReadOnly}
          onInsertText={(text) =>
            setNarrative({
              current_situation: data.narrative.current_situation
                ? `${data.narrative.current_situation}\n\n${text}`
                : text,
            })
          }
        />
      }
    >
      <RichTextarea
        label="Situación actual"
        required
        value={data.narrative.current_situation}
        onChange={(value) => setNarrative({ current_situation: value })}
        disabled={isReadOnly}
      />
      <RichTextarea
        label="Necesidades detectadas"
        value={data.narrative.detected_needs}
        onChange={(value) => setNarrative({ detected_needs: value })}
        disabled={isReadOnly}
      />
      <RichTextarea
        label="Objetivos"
        value={data.narrative.objectives}
        onChange={(value) => setNarrative({ objectives: value })}
        disabled={isReadOnly}
      />
      <RichTextarea
        label="Problemas"
        value={data.narrative.detected_risks}
        onChange={(value) => setNarrative({ detected_risks: value })}
        disabled={isReadOnly}
      />
      <RichTextarea
        label="Oportunidades"
        value={data.narrative.opportunities}
        onChange={(value) => setNarrative({ opportunities: value })}
        disabled={isReadOnly}
      />
    </SectionCard>
  );
}

export { StepDiagnosis };
