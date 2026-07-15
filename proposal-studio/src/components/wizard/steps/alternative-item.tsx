"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutosaveIndicator } from "@/components/wizard/autosave-indicator";
import { useAutosave } from "@/hooks/use-autosave";
import { saveAlternativeAction } from "@/lib/wizard/actions";
import type { AlternativeCategory, WizardAlternative } from "@/types/wizard";

const CATEGORY_LABELS: Record<AlternativeCategory, string> = {
  protection: "Protección",
  savings: "Ahorro",
  life_with_savings: "Vida con ahorro",
  retirement: "Retiro",
  business: "Empresarial",
};

interface AlternativeItemProps {
  proposalId: string;
  item: WizardAlternative;
  onChange: (item: WizardAlternative) => void;
  onSaved: (id: string) => void;
  onRemove: () => void;
}

function AlternativeItem({ proposalId, item, onChange, onSaved, onRemove }: AlternativeItemProps) {
  const canSave = Boolean(
    item.title.trim() && item.insurance_company.trim() && item.product_name.trim(),
  );

  const { status, error } = useAutosave(
    item,
    async (value) => {
      const result = await saveAlternativeAction({
        id: value.id,
        proposal_id: proposalId,
        title: value.title,
        description: value.description,
        category: value.category,
        insurance_company: value.insurance_company,
        product_name: value.product_name,
        currency: value.currency,
        monthly_premium: value.monthly_premium,
        advantages: value.details.advantages,
        disadvantages: value.details.disadvantages,
        notes: value.details.notes,
        display_order: value.display_order,
      });
      if (result.data?.id && result.data.id !== value.id) {
        onSaved(result.data.id);
      }
      return { error: result.error };
    },
    { enabled: canSave },
  );

  function updateField<K extends keyof WizardAlternative>(key: K, value: WizardAlternative[K]) {
    onChange({ ...item, [key]: value });
  }

  function updateDetails<K extends keyof WizardAlternative["details"]>(
    key: K,
    value: WizardAlternative["details"][K],
  ) {
    onChange({ ...item, details: { ...item.details, [key]: value } });
  }

  return (
    <div className="rounded-md border border-outline-variant p-5">
      <div className="mb-4 flex items-center justify-between">
        <AutosaveIndicator status={status} error={error} />
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Eliminar alternativa">
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
              onValueChange={(value) => updateField("category", value as AlternativeCategory)}
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
          <Label>Descripción</Label>
          <Textarea
            rows={3}
            value={item.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              Compañía <span className="text-error">*</span>
            </Label>
            <Input
              value={item.insurance_company}
              onChange={(event) => updateField("insurance_company", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Producto <span className="text-error">*</span>
            </Label>
            <Input
              value={item.product_name}
              onChange={(event) => updateField("product_name", event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Costo mensual</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.monthly_premium ?? ""}
              onChange={(event) =>
                updateField(
                  "monthly_premium",
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select
              value={item.currency}
              onValueChange={(value) => updateField("currency", value as WizardAlternative["currency"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Ventajas (una por línea)</Label>
            <Textarea
              rows={3}
              value={item.details.advantages.join("\n")}
              onChange={(event) =>
                updateDetails("advantages", event.target.value.split("\n"))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Desventajas (una por línea)</Label>
            <Textarea
              rows={3}
              value={item.details.disadvantages.join("\n")}
              onChange={(event) =>
                updateDetails("disadvantages", event.target.value.split("\n"))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea
            rows={2}
            value={item.details.notes}
            onChange={(event) => updateDetails("notes", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export { AlternativeItem };
