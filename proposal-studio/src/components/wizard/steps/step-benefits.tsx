"use client";

import { useEffect } from "react";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/wizard/section-card";
import { SortableList } from "@/components/wizard/sortable-list";
import { BenefitItem } from "@/components/wizard/steps/benefit-item";
import { deleteBenefitAction, reorderBenefitsAction } from "@/lib/wizard/actions";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardBenefit } from "@/types/wizard";

function emptyBenefit(order: number): WizardBenefit {
  return {
    id: null,
    title: "",
    description: "",
    icon: "",
    category: "financial",
    display_order: order,
  };
}

function StepBenefits() {
  const data = useWizardStore((state) => state.data);
  const setBenefits = useWizardStore((state) => state.setBenefits);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);

  useEffect(() => {
    setStepMeta({ isValid: true, autosaveStatus: "idle" });
  }, [setStepMeta]);

  if (!data) return null;
  const { benefits, proposalId } = data;

  function addBenefit() {
    setBenefits([...benefits, emptyBenefit(benefits.length)]);
  }

  function updateItem(index: number, next: WizardBenefit) {
    setBenefits(benefits.map((item, i) => (i === index ? next : item)));
  }

  function markSaved(index: number, id: string) {
    setBenefits(benefits.map((item, i) => (i === index ? { ...item, id } : item)));
  }

  async function removeItem(index: number) {
    const item = benefits[index];
    setBenefits(benefits.filter((_, i) => i !== index));
    if (item?.id) {
      await deleteBenefitAction(proposalId, item.id);
    }
  }

  async function reorder(next: WizardBenefit[]) {
    const withOrder = next.map((item, index) => ({ ...item, display_order: index }));
    setBenefits(withOrder);
    const orderedIds = withOrder.map((item) => item.id).filter((id): id is string => Boolean(id));
    if (orderedIds.length > 0) {
      await reorderBenefitsAction({ proposal_id: proposalId, ordered_ids: orderedIds });
    }
  }

  return (
    <SectionCard
      title="Beneficios"
      description="Beneficios concretos que el cliente obtiene con esta propuesta."
      actions={
        <Button type="button" variant="secondary" size="sm" onClick={addBenefit}>
          <PlusCircle className="h-4 w-4" />
          Agregar beneficio
        </Button>
      }
    >
      <SortableList
        items={benefits}
        getId={(item) => item.id ?? `new-${benefits.indexOf(item)}`}
        onReorder={reorder}
        emptyState={
          <p className="text-small text-on-surface-variant">Todavía no agregaste ningún beneficio.</p>
        }
        renderItem={(item, index) => (
          <BenefitItem
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

export { StepBenefits };
