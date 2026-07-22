"use client";

import { useEffect, useId, useRef } from "react";
import { BookmarkPlus, Check, ChevronDown, ChevronRight, Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AutosaveIndicator } from "@/components/wizard/autosave-indicator";
import { SaveToLibraryDuplicateDialog } from "@/components/library/save-to-library-duplicate-dialog";
import { useAutosave } from "@/hooks/use-autosave";
import { useSaveToLibrary } from "@/hooks/use-save-to-library";
import { saveAlternativeAction } from "@/lib/wizard/actions";
import { createClient } from "@/lib/database/client";
import { cn } from "@/lib/utils/cn";
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
  onSaved: (id: string, revision: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Recién agregado/duplicado: hace scroll hasta el bloque y enfoca el título. Solo se lee en el mount. */
  autoFocus?: boolean;
}

function AlternativeItem({
  proposalId,
  item,
  onChange,
  onSaved,
  onRemove,
  onDuplicate,
  collapsed,
  onToggleCollapse,
  autoFocus = false,
}: AlternativeItemProps) {
  const canSave = Boolean(
    item.title.trim() && item.insurance_company.trim() && item.product_name.trim(),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const companyId = useId();
  const productId = useId();
  const premiumId = useId();
  const advantagesId = useId();
  const disadvantagesId = useId();
  const notesId = useId();

  const { status, error, conflictRevision, saveNow, forceSaveNow, clearConflict } = useAutosave(
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
      .from("proposal_alternatives")
      .select(
        "id, title, description, category, insurance_company, product_name, currency, monthly_premium, financial_details, display_order, revision",
      )
      .eq("id", item.id)
      .single();
    if (fresh) {
      const details = (fresh.financial_details ?? {}) as {
        advantages?: string[];
        disadvantages?: string[];
        notes?: string;
      };
      onChange({
        client_key: item.client_key,
        id: fresh.id,
        title: fresh.title,
        description: fresh.description ?? "",
        category: fresh.category as WizardAlternative["category"],
        insurance_company: fresh.insurance_company,
        product_name: fresh.product_name,
        currency: fresh.currency as WizardAlternative["currency"],
        monthly_premium: fresh.monthly_premium,
        details: {
          advantages: details.advantages ?? [],
          disadvantages: details.disadvantages ?? [],
          notes: details.notes ?? "",
        },
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

  function updateField<K extends keyof WizardAlternative>(key: K, value: WizardAlternative[K]) {
    onChange({ ...item, [key]: value });
  }

  function updateDetails<K extends keyof WizardAlternative["details"]>(
    key: K,
    value: WizardAlternative["details"][K],
  ) {
    onChange({ ...item, details: { ...item.details, [key]: value } });
  }

  const { status: libraryStatus, duplicate, save, saveAnyway, cancelDuplicate } = useSaveToLibrary();

  useEffect(() => {
    if (!autoFocus) return;
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    titleInputRef.current?.focus();
    // Solo al montar: es la única vez que "recién agregado" es cierto para este ítem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveToLibrary() {
    if (!item.title.trim() || libraryStatus === "saving") return;
    save({
      category: "alternative",
      title: item.title,
      content_json: {
        category: item.category,
        description: item.description,
        insurance_company: item.insurance_company,
        product_name: item.product_name,
        currency: item.currency,
        monthly_premium: item.monthly_premium,
        advantages: item.details.advantages,
        disadvantages: item.details.disadvantages,
        notes: item.details.notes,
      },
    });
  }

  return (
    <div ref={containerRef} className="rounded-md border border-outline-variant p-5" data-testid="alternative-item">
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
            <span className="min-w-0 truncate text-small">
              <span className="font-semibold text-on-surface">
                {item.title.trim() || "Alternativa sin título"}
              </span>
              {(item.insurance_company || item.product_name) && (
                <span className="text-on-surface-variant">
                  {" "}
                  — {item.insurance_company}
                  {item.insurance_company && item.product_name ? " / " : ""}
                  {item.product_name}
                </span>
              )}
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
            disabled={!item.title.trim() || libraryStatus === "saving"}
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
          <Button type="button" variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplicar alternativa">
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Eliminar alternativa">
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
              ref={titleInputRef}
              value={item.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
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
            <Label htmlFor={companyId}>
              Compañía <span className="text-error">*</span>
            </Label>
            <Input
              id={companyId}
              value={item.insurance_company}
              onChange={(event) => updateField("insurance_company", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={productId}>
              Producto <span className="text-error">*</span>
            </Label>
            <Input
              id={productId}
              value={item.product_name}
              onChange={(event) => updateField("product_name", event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={premiumId}>Costo mensual</Label>
            <Input
              id={premiumId}
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

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor={advantagesId}>Ventajas (una por línea)</Label>
            <Textarea
              id={advantagesId}
              rows={3}
              value={item.details.advantages.join("\n")}
              onChange={(event) =>
                updateDetails("advantages", event.target.value.split("\n"))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={disadvantagesId}>Desventajas (una por línea)</Label>
            <Textarea
              id={disadvantagesId}
              rows={3}
              value={item.details.disadvantages.join("\n")}
              onChange={(event) =>
                updateDetails("disadvantages", event.target.value.split("\n"))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={notesId}>Notas</Label>
          <Textarea
            id={notesId}
            rows={2}
            value={item.details.notes}
            onChange={(event) => updateDetails("notes", event.target.value)}
          />
        </div>
      </div>
        </div>
      </div>
      <SaveToLibraryDuplicateDialog duplicate={duplicate} onConfirm={saveAnyway} onCancel={cancelDuplicate} />
    </div>
  );
}

export { AlternativeItem };
