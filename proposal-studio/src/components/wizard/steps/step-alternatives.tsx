"use client";

import { useEffect } from "react";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/wizard/section-card";
import { SortableList } from "@/components/wizard/sortable-list";
import { AlternativeItem } from "@/components/wizard/steps/alternative-item";
import { deleteAlternativeAction, reorderAlternativesAction } from "@/lib/wizard/actions";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardAlternative } from "@/types/wizard";

function emptyAlternative(order: number): WizardAlternative {
  return {
    id: null,
    title: "",
    description: "",
    category: "protection",
    insurance_company: "",
    product_name: "",
    currency: "ARS",
    monthly_premium: null,
    details: { advantages: [], disadvantages: [], notes: "" },
    display_order: order,
  };
}

function StepAlternatives() {
  const data = useWizardStore((state) => state.data);
  const setAlternatives = useWizardStore((state) => state.setAlternatives);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);

  useEffect(() => {
    setStepMeta({ isValid: true, autosaveStatus: "idle" });
  }, [setStepMeta]);

  if (!data) return null;
  const { alternatives, proposalId } = data;

  function addAlternative() {
    setAlternatives([...alternatives, emptyAlternative(alternatives.length)]);
  }

  function updateItem(index: number, next: WizardAlternative) {
    setAlternatives(alternatives.map((item, i) => (i === index ? next : item)));
  }

  function markSaved(index: number, id: string) {
    setAlternatives(alternatives.map((item, i) => (i === index ? { ...item, id } : item)));
  }

  async function removeItem(index: number) {
    const item = alternatives[index];
    setAlternatives(alternatives.filter((_, i) => i !== index));
    if (item?.id) {
      await deleteAlternativeAction(proposalId, item.id);
    }
  }

  async function reorder(next: WizardAlternative[]) {
    const withOrder = next.map((item, index) => ({ ...item, display_order: index }));
    setAlternatives(withOrder);
    const orderedIds = withOrder.map((item) => item.id).filter((id): id is string => Boolean(id));
    if (orderedIds.length > 0) {
      await reorderAlternativesAction({ proposal_id: proposalId, ordered_ids: orderedIds });
    }
  }

  return (
    <SectionCard
      title="Alternativas"
      description="Agregá las alternativas financieras que forman parte de la propuesta."
      actions={
        <Button type="button" variant="secondary" size="sm" onClick={addAlternative}>
          <PlusCircle className="h-4 w-4" />
          Agregar alternativa
        </Button>
      }
    >
      <SortableList
        items={alternatives}
        getId={(item) => item.id ?? `new-${alternatives.indexOf(item)}`}
        onReorder={reorder}
        emptyState={
          <p className="text-small text-on-surface-variant">
            Todavía no agregaste ninguna alternativa.
          </p>
        }
        renderItem={(item, index) => (
          <AlternativeItem
            proposalId={proposalId}
            item={item}
            onChange={(next) => updateItem(index, next)}
            onSaved={(id) => markSaved(index, id)}
            onRemove={() => removeItem(index)}
          />
        )}
      />
    </SectionCard>
  );
}

export { StepAlternatives };
