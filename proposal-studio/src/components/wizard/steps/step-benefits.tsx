"use client";

import { useEffect, useState } from "react";
import { BookOpen, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LibraryPickerDialog } from "@/components/library/library-picker-dialog";
import { SectionCard } from "@/components/wizard/section-card";
import { SortableList } from "@/components/wizard/sortable-list";
import { SuggestedBenefitsChips } from "@/components/wizard/steps/suggested-benefits-chips";
import { BenefitItem } from "@/components/wizard/steps/benefit-item";
import { deleteBenefitAction, reorderBenefitsAction, saveBenefitAction } from "@/lib/wizard/actions";
import { buildBenefitFromLibraryContent } from "@/lib/library/build-from-content";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardBenefit } from "@/types/wizard";
import type { LibraryBenefitContent, LibraryItem } from "@/types/library";

function getItemKey(item: WizardBenefit): string {
  return item.client_key;
}

function emptyBenefit(order: number): WizardBenefit {
  return {
    client_key: crypto.randomUUID(),
    id: null,
    title: "",
    description: "",
    icon: "",
    category: "financial",
    display_order: order,
    revision: null,
  };
}

function StepBenefits() {
  const data = useWizardStore((state) => state.data);
  const setBenefits = useWizardStore((state) => state.setBenefits);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);
  const pushHistorySnapshot = useWizardStore((state) => state.pushHistorySnapshot);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set((data?.benefits ?? []).map((item) => getItemKey(item))),
  );
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    setStepMeta({ isValid: true, autosaveStatus: "idle" });
  }, [setStepMeta]);

  if (!data) return null;
  const { benefits, proposalId } = data;

  function toggleCollapsed(key: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addBenefit() {
    pushHistorySnapshot();
    setBenefits([...benefits, emptyBenefit(benefits.length)]);
  }

  function addBenefitFromSuggestion(suggestion: { title: string; description: string; icon: string }) {
    pushHistorySnapshot();
    setBenefits([
      ...benefits,
      {
        client_key: crypto.randomUUID(),
        id: null,
        title: suggestion.title,
        description: suggestion.description,
        icon: suggestion.icon,
        category: "financial",
        display_order: benefits.length,
        revision: null,
      },
    ]);
  }

  function insertFromLibrary(id: string, item: LibraryItem) {
    const content = item.content_json as LibraryBenefitContent;
    pushHistorySnapshot();
    setBenefits([...benefits, buildBenefitFromLibraryContent(id, item.title, content, benefits.length)]);
  }

  // Guarda la copia de inmediato (ver mismo comentario en step-alternatives.tsx):
  // si quedara sin `id` hasta el próximo click en "Guardar", un reorder
  // inmediato posterior no podría persistirla y el preview quedaría desincronizado.
  async function duplicateItem(index: number) {
    pushHistorySnapshot();
    const source = benefits[index];
    if (!source) return;
    const clone: WizardBenefit = {
      ...source,
      client_key: crypto.randomUUID(),
      id: null,
      revision: null,
      title: source.title ? `${source.title} (copia)` : source.title,
      display_order: index + 1,
    };
    const next = [...benefits];
    next.splice(index + 1, 0, clone);
    const withOrder = next.map((item, i) => ({ ...item, display_order: i }));
    setBenefits(withOrder);

    const result = await saveBenefitAction({
      id: null,
      proposal_id: proposalId,
      title: clone.title,
      description: clone.description,
      icon: clone.icon,
      category: clone.category,
      display_order: clone.display_order,
      expected_revision: null,
    });
    if (result.data) {
      const cloneIndex = index + 1;
      setBenefits(
        withOrder.map((item, i) =>
          i === cloneIndex ? { ...item, id: result.data!.id, revision: result.data!.revision } : item,
        ),
      );
    }
  }

  function updateItem(index: number, next: WizardBenefit) {
    setBenefits(benefits.map((item, i) => (i === index ? next : item)));
  }

  function markSaved(index: number, id: string, revision: number) {
    setBenefits(benefits.map((item, i) => (i === index ? { ...item, id, revision } : item)));
  }

  async function removeItem(index: number) {
    pushHistorySnapshot();
    const item = benefits[index];
    setBenefits(benefits.filter((_, i) => i !== index));
    if (item?.id) {
      await deleteBenefitAction(proposalId, item.id);
    }
  }

  async function reorder(next: WizardBenefit[]) {
    pushHistorySnapshot();
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
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setLibraryOpen(true)}>
            <BookOpen className="h-4 w-4" />
            Insertar desde Biblioteca
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={addBenefit}>
            <PlusCircle className="h-4 w-4" />
            Agregar beneficio
          </Button>
        </div>
      }
    >
      <LibraryPickerDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        category="benefit"
        title="Insertar beneficio desde Biblioteca"
        proposalId={proposalId}
        nextDisplayOrder={benefits.length}
        onInserted={insertFromLibrary}
      />
      <SuggestedBenefitsChips
        proposalId={proposalId}
        existingTitles={benefits.map((b) => b.title)}
        onAdd={addBenefitFromSuggestion}
      />
      <SortableList
        items={benefits}
        getId={(item) => item.client_key}
        onReorder={reorder}
        emptyState={
          <p className="text-small text-on-surface-variant">Todavía no agregaste ningún beneficio.</p>
        }
        renderItem={(item, index) => {
          const key = getItemKey(item);
          return (
            <BenefitItem
              proposalId={proposalId}
              item={item}
              onChange={(next) => updateItem(index, next)}
              onSaved={(id, revision) => markSaved(index, id, revision)}
              onRemove={() => removeItem(index)}
              onDuplicate={() => duplicateItem(index)}
              collapsed={collapsedIds.has(key)}
              onToggleCollapse={() => toggleCollapsed(key)}
            />
          );
        }}
      />
    </SectionCard>
  );
}

export { StepBenefits };
