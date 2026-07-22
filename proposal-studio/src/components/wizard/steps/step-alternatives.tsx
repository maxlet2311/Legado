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
import { AlternativeItem } from "@/components/wizard/steps/alternative-item";
import { deleteAlternativeAction, reorderAlternativesAction, saveAlternativeAction } from "@/lib/wizard/actions";
import { buildAlternativeFromLibraryContent } from "@/lib/library/build-from-content";
import { useWizardStore } from "@/stores/wizard-store";
import type { WizardAlternative } from "@/types/wizard";
import type { LibraryAlternativeContent, LibraryItem } from "@/types/library";

function getItemKey(item: WizardAlternative): string {
  return item.client_key;
}

function emptyAlternative(order: number): WizardAlternative {
  return {
    client_key: crypto.randomUUID(),
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
    revision: null,
  };
}

function StepAlternatives() {
  const data = useWizardStore((state) => state.data);
  const setAlternatives = useWizardStore((state) => state.setAlternatives);
  const setStepMeta = useWizardStore((state) => state.setStepMeta);
  const pushHistorySnapshot = useWizardStore((state) => state.pushHistorySnapshot);

  // Ítems ya cargados al entrar al paso arrancan colapsados (reduce el
  // scroll que señaló la auditoría del editor); un ítem nuevo (agregado o
  // duplicado) nunca entra a este set, así que arranca expandido.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set((data?.alternatives ?? []).map((item) => getItemKey(item))),
  );
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    setStepMeta({ isValid: true, autosaveStatus: "idle" });
  }, [setStepMeta]);

  // `duplicateItem` guarda de inmediato fuera del ciclo de useAutosave: si el
  // usuario recarga/cierra la pestaña mientras esa escritura sigue en vuelo,
  // el duplicado optimista en pantalla nunca llega a persistirse.
  useBeforeUnloadGuard(duplicating);

  if (!data) return null;
  const { alternatives, proposalId } = data;

  function toggleCollapsed(key: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addAlternative() {
    pushHistorySnapshot();
    const next = emptyAlternative(alternatives.length);
    setAlternatives([...alternatives, next]);
    setLastAddedKey(next.client_key);
  }

  function insertFromLibrary(id: string, item: LibraryItem) {
    const content = item.content_json as LibraryAlternativeContent;
    pushHistorySnapshot();
    const next = buildAlternativeFromLibraryContent(id, item.title, content, alternatives.length);
    setAlternatives([...alternatives, next]);
    setLastAddedKey(next.client_key);
  }

  // Duplicar guarda la copia de inmediato (a diferencia de editar campos de
  // texto, que es manual): si quedara sin `id` hasta que el asesor apriete
  // "Guardar", un reorder inmediato posterior no tendría cómo persistirla
  // (reorderAlternativesAction ignora ítems sin id) y el preview -- que lee
  // siempre del servidor -- se vería desincronizado.
  async function duplicateItem(index: number) {
    pushHistorySnapshot();
    const source = alternatives[index];
    if (!source) return;
    const clone: WizardAlternative = {
      ...source,
      client_key: crypto.randomUUID(),
      id: null,
      revision: null,
      title: source.title ? `${source.title} (copia)` : source.title,
      display_order: index + 1,
      details: { ...source.details, advantages: [...source.details.advantages], disadvantages: [...source.details.disadvantages] },
    };
    const previous = alternatives;
    const next = [...alternatives];
    next.splice(index + 1, 0, clone);
    const withOrder = next.map((item, i) => ({ ...item, display_order: i }));
    setAlternatives(withOrder);
    setLastAddedKey(clone.client_key);
    setDuplicating(true);
    setStepMeta({ autosaveStatus: "saving" });

    try {
      const result = await saveAlternativeAction({
        id: null,
        proposal_id: proposalId,
        title: clone.title,
        description: clone.description,
        category: clone.category,
        insurance_company: clone.insurance_company,
        product_name: clone.product_name,
        currency: clone.currency,
        monthly_premium: clone.monthly_premium,
        advantages: clone.details.advantages,
        disadvantages: clone.details.disadvantages,
        notes: clone.details.notes,
        display_order: clone.display_order,
        expected_revision: null,
      });
      if (result.data) {
        const cloneIndex = index + 1;
        setAlternatives(
          withOrder.map((item, i) =>
            i === cloneIndex ? { ...item, id: result.data!.id, revision: result.data!.revision } : item,
          ),
        );
        setStepMeta({ autosaveStatus: "saved" });
      } else {
        // Rollback: el duplicado optimista nunca se persistió, no debe quedar
        // en pantalla como si lo hubiera hecho.
        setAlternatives(previous);
        setStepMeta({ autosaveStatus: "error", autosaveError: result.error ?? "No pudimos duplicar la alternativa." });
      }
    } catch {
      setAlternatives(previous);
      setStepMeta({ autosaveStatus: "error", autosaveError: "No pudimos duplicar la alternativa." });
    } finally {
      setDuplicating(false);
    }
  }

  function updateItem(index: number, next: WizardAlternative) {
    setAlternatives(alternatives.map((item, i) => (i === index ? next : item)));
  }

  function markSaved(index: number, id: string, revision: number) {
    setAlternatives(
      alternatives.map((item, i) => (i === index ? { ...item, id, revision } : item)),
    );
  }

  async function confirmRemove() {
    const index = pendingRemoveIndex;
    if (index === null) return;
    pushHistorySnapshot();
    const item = alternatives[index];
    setAlternatives(alternatives.filter((_, i) => i !== index));
    setPendingRemoveIndex(null);
    if (item?.id) {
      await deleteAlternativeAction(proposalId, item.id);
    }
  }

  async function reorder(next: WizardAlternative[]) {
    pushHistorySnapshot();
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
        <div className="flex items-center gap-2">
          {alternatives.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setCollapsedIds(
                  collapsedIds.size > 0 ? new Set() : new Set(alternatives.map(getItemKey)),
                )
              }
            >
              {collapsedIds.size > 0 ? "Expandir todas" : "Colapsar todas"}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => setLibraryOpen(true)}>
            <BookOpen className="h-4 w-4" />
            Insertar desde Biblioteca
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={addAlternative}>
            <PlusCircle className="h-4 w-4" />
            Agregar alternativa
          </Button>
        </div>
      }
    >
      <LibraryPickerDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        category="alternative"
        title="Insertar alternativa desde Biblioteca"
        proposalId={proposalId}
        nextDisplayOrder={alternatives.length}
        onInserted={insertFromLibrary}
      />
      <SortableList
        items={alternatives}
        getId={(item) => item.client_key}
        onReorder={reorder}
        emptyState={<EmptyState compact title="Todavía no agregaste ninguna alternativa." />}
        renderItem={(item, index) => {
          const key = getItemKey(item);
          return (
            <AlternativeItem
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
        title="Eliminar alternativa"
        description={`"${alternatives[pendingRemoveIndex ?? -1]?.title || "Esta alternativa"}" se va a eliminar de la propuesta. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmRemove}
      />
    </SectionCard>
  );
}

export { StepAlternatives };
