"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutosaveIndicator } from "@/components/wizard/autosave-indicator";
import { useAutosave } from "@/hooks/use-autosave";
import { saveBenefitAction } from "@/lib/wizard/actions";
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
  onSaved: (id: string) => void;
  onRemove: () => void;
}

function BenefitItem({ proposalId, item, onChange, onSaved, onRemove }: BenefitItemProps) {
  const canSave = Boolean(item.title.trim() && item.description.trim() && item.icon.trim());

  const { status, error } = useAutosave(
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
      });
      if (result.data?.id && result.data.id !== value.id) {
        onSaved(result.data.id);
      }
      return { error: result.error };
    },
    { enabled: canSave },
  );

  function updateField<K extends keyof WizardBenefit>(key: K, value: WizardBenefit[K]) {
    onChange({ ...item, [key]: value });
  }

  return (
    <div className="rounded-md border border-outline-variant p-5">
      <div className="mb-4 flex items-center justify-between">
        <AutosaveIndicator status={status} error={error} />
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Eliminar beneficio">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              Título <span className="text-error">*</span>
            </Label>
            <Input value={item.title} onChange={(event) => updateField("title", event.target.value)} />
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
          <Label>
            Descripción <span className="text-error">*</span>
          </Label>
          <Textarea
            rows={2}
            value={item.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Ícono (nombre de lucide-react) <span className="text-error">*</span>
          </Label>
          <Input
            placeholder="shield-check"
            value={item.icon}
            onChange={(event) => updateField("icon", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export { BenefitItem };
