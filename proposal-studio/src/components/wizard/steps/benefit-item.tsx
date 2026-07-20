"use client";

import { useId } from "react";
import { BookmarkPlus, Check, ChevronDown, ChevronRight, Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AutosaveIndicator } from "@/components/wizard/autosave-indicator";
import { IconPicker } from "@/components/wizard/icon-picker";
import { SaveToLibraryDuplicateDialog } from "@/components/library/save-to-library-duplicate-dialog";
import { useAutosave } from "@/hooks/use-autosave";
import { useSaveToLibrary } from "@/hooks/use-save-to-library";
import { saveBenefitAction } from "@/lib/wizard/actions";
import { createClient } from "@/lib/database/client";
import { cn } from "@/lib/utils/cn";
import { getBenefitIcon } from "@/lib/wizard/benefit-icons";
import type { BenefitCategory, WizardBenefit } from "@/types/wizard";

const CATEGORY_LABELS: Record<BenefitCategory, string> = {
  family: "Familia",
  retirement: "Retiro",
  tax: "Impositivo",
  business: "Empresa",
  legal: "Legal",
  financial: "Financiero",
  health: "Salud",
  succession: "Sucesión",
};

interface BenefitItemProps {
  proposalId: string;
  item: WizardBenefit;
  onChange: (item: WizardBenefit) => void;
  onSaved: (id: string, revision: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function BenefitItem({
  proposalId,
  item,
  onChange,
  onSaved,
  onRemove,
  onDuplicate,
  collapsed,
  onToggleCollapse,
}: BenefitItemProps) {
  const canSave = Boolean(item.title.trim() && item.description.trim() && item.icon.trim());
  const titleId = useId();
  const descriptionId = useId();

  const { status, error, conflictRevision, saveNow, forceSaveNow, clearConflict } = useAutosave(
    item,
    async (value) => {
      const result = await saveBenefitAction({
        id: value.id,
        proposal_id: proposalId,
        title: value.title,
        description: value.description,
        icon: value.icon,
        category: value.category,
        display_order: value.display_order,
        expected_revision: value.revision,
      });
      if (result.conflict) {
        return { conflict: true, currentRevision: result.currentRevision };
      }
      if (result.data) {
        onSaved(result.data.id, result.data.revision);
      }
      return { error: result.error };
    },
    { enabled: canSave, manual: true },
  );

  async function resolveReload() {
    if (!item.id) {
      clearConflict();
      return;
    }
    const supabase = createClient();
    const { data: fresh } = await supabase
      .from("proposal_benefits")
      .select("id, title, description, icon, category, display_order, revision")
      .eq("id", item.id)
      .single();
    if (fresh) {
      onChange({
        client_key: item.client_key,
        id: fresh.id,
        title: fresh.title,
        description: fresh.description,
        icon: fresh.icon,
        category: fresh.category as WizardBenefit["category"],
        display_order: fresh.display_order,
        revision: fresh.revision,
      });
    }
    clearConflict();
  }

  function resolveKeepMine() {
    const revision = conflictRevision ?? item.revision;
    onChange({ ...item, revision });
    forceSaveNow({ ...item, revision });
  }

  function updateField<K extends keyof WizardBenefit>(key: K, value: WizardBenefit[K]) {
    onChange({ ...item, [key]: value });
  }

  const { status: libraryStatus, duplicate, save, saveAnyway, cancelDuplicate } = useSaveToLibrary();

  function saveToLibrary() {
    if (!item.title.trim() || !item.description.trim() || libraryStatus === "saving") return;
    save({
      category: "benefit",
      title: item.title,
      content_json: { description: item.description, icon: item.icon, category: item.category },
    });
  }

  const ItemIcon = getBenefitIcon(item.icon);

  return (
    <div className="rounded-md border border-outline-variant p-5" data-testid="benefit-item">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-on-surface-variant" />
          )}
          {collapsed ? (
            <span className="flex min-w-0 items-center gap-2 text-small">
              {ItemIcon && (
                <ItemIcon className="h-4 w-4 shrink-0 text-primary" />
              )}
              <span className="truncate font-semibold text-on-surface">
                {item.title.trim() || "Beneficio sin título"}
              </span>
            </span>
          ) : (
            <AutosaveIndicator
              status={status}
              error={error}
              onResolveKeepMine={resolveKeepMine}
              onResolveReload={resolveReload}
            />
          )}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={saveToLibrary}
            disabled={!item.title.trim() || !item.description.trim() || libraryStatus === "saving"}
            aria-label="Guardar en Biblioteca"
            title="Guardar en Biblioteca"
          >
            {libraryStatus === "saving" ? (
              <Spinner className="h-4 w-4" />
            ) : libraryStatus === "saved" ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <BookmarkPlus className="h-4 w-4" />
            )}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplicar beneficio">
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Eliminar beneficio">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-all duration-base ease-premium",
          collapsed ? "grid-rows-[0fr] opacity-0" : "mt-4 grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="overflow-hidden">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={saveNow} disabled={!canSave}>
            Guardar
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={titleId}>
              Título <span className="text-error">*</span>
            </Label>
            <Input
              id={titleId}
              value={item.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={item.category}
              onValueChange={(value) => updateField("category", value as BenefitCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={descriptionId}>
            Descripción <span className="text-error">*</span>
          </Label>
          <Textarea
            id={descriptionId}
            rows={2}
            value={item.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Ícono <span className="text-error">*</span>
          </Label>
          <IconPicker
            value={item.icon}
            category={item.category}
            onChange={(icon) => updateField("icon", icon)}
          />
        </div>
      </div>
        </div>
      </div>
      <SaveToLibraryDuplicateDialog duplicate={duplicate} onConfirm={saveAnyway} onCancel={cancelDuplicate} />
    </div>
  );
}

export { BenefitItem };
