"use client";

import { useEffect, useState } from "react";
import { BookOpen, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useBeforeUnloadGuard } from "@/hooks/use-before-unload-guard";
import { LibraryPickerDialog } from "@/components/library/library-picker-dialog";
import { SectionCard } from "@/components/wizard/section-card";
import { SortableList } from "@/components/wizard/sortable-list";
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
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    setStepMeta({ isValid: true, autosaveStatus: "idle" });
  }, [setStepMeta]);

  // Ver mismo comentario en step-alternatives.tsx: duplicar guarda fuera del
  // ciclo de useAutosave, así que necesita su propio guard de recarga.
  useBeforeUnloadGuard(duplicating);

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
    const next = emptyBenefit(benefits.length);
    setBenefits([...benefits, next]);
    setLastAddedKey(next.client_key);
  }

  function insertFromLibrary(id: string, item: LibraryItem) {
    const content = item.content_json as LibraryBenefitContent;
    pushHistorySnapshot();
    const next = buildBenefitFromLibraryContent(id, item.title, content, benefits.length);
    setBenefits([...benefits, next]);
    setLastAddedKey(next.client_key);
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
    const previous = benefits;
    const next = [...benefits];
    next.splice(index + 1, 0, clone);
    const withOrder = next.map((item, i) => ({ ...item, display_order: i }));
    setBenefits(withOrder);
    setLastAddedKey(clone.client_key);
    setDuplicating(true);
    setStepMeta({ autosaveStatus: "saving" });

    try {
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
        setStepMeta({ autosaveStatus: "saved" });
      } else {
        setBenefits(previous);
        setStepMeta({ autosaveStatus: "error", autosaveError: result.error ?? "No pudimos duplicar el beneficio." });
      }
    } catch {
      setBenefits(previous);
      setStepMeta({ autosaveStatus: "error", autosaveError: "No pudimos duplicar el beneficio." });
    } finally {
      setDuplicating(false);
    }
  }

  function updateItem(index: number, next: WizardBenefit) {
    setBenefits(benefits.map((item, i) => (i === index ? next : item)));
  }

  function markSaved(index: number, id: string, revision: number) {
    setBenefits(benefits.map((item, i) => (i === index ? { ...item, id, revision } : item)));
  }

  async function confirmRemove() {
    const index = pendingRemoveIndex;
    if (index === null) return;
    pushHistorySnapshot();
    const item = benefits[index];
    setBenefits(benefits.filter((_, i) => i !== index));
    setPendingRemoveIndex(null);
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
          {benefits.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setCollapsedIds(collapsedIds.size > 0 ? new Set() : new Set(benefits.map(getItemKey)))
              }
            >
              {collapsedIds.size > 0 ? "Expandir todos" : "Colapsar todos"}
            </Button>
          ) : null}
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
      <SortableList
        items={benefits}
        getId={(item) => item.client_key}
        onReorder={reorder}
        emptyState={<EmptyState compact title="Todavía no agregaste ningún beneficio." />}
        renderItem={(item, index) => {
          const key = getItemKey(item);
          return (
            <BenefitItem
              proposalId={proposalId}
              item={item}
              onChange={(next) => updateItem(index, next)}
              onSaved={(id, revision) => markSaved(index, id, revision)}
              onRemove={() => setPendingRemoveIndex(index)}
              onDuplicate={() => duplicateItem(index)}
              collapsed={collapsedIds.has(key)}
              onToggleCollapse={() => toggleCollapsed(key)}
              autoFocus={key === lastAddedKey}
            />
          );
        }}
      />
      <ConfirmDialog
        open={pendingRemoveIndex !== null}
        onOpenChange={(open) => !open && setPendingRemoveIndex(null)}
        title="Eliminar beneficio"
        description={`"${benefits[pendingRemoveIndex ?? -1]?.title || "Este beneficio"}" se va a eliminar de la propuesta. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmRemove}
      />
    </SectionCard>
  );
}

export { StepBenefits };
