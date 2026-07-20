"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { BENEFIT_ICONS, BENEFIT_ICONS_BY_CATEGORY, getBenefitIcon } from "@/lib/wizard/benefit-icons";
import type { BenefitCategory } from "@/types/wizard";

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

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  category: BenefitCategory;
}

/**
 * Reemplaza el campo de texto libre de ícono (auditoría del editor: "único
 * campo donde un error de tipeo no se detecta hasta ver el PDF"). Agrupa
 * por la categoría del beneficio ya elegida, con búsqueda para el resto del
 * set curado -- nunca la librería lucide-react completa, ver benefit-icons.ts.
 */
function IconPicker({ value, onChange, category }: IconPickerProps) {
  const [query, setQuery] = useState("");

  const allNames = useMemo(() => Object.keys(BENEFIT_ICONS), []);
  const suggested = BENEFIT_ICONS_BY_CATEGORY[category] ?? [];

  const filtered = query.trim()
    ? allNames.filter((name) => name.includes(query.trim().toLowerCase()))
    : null;

  const SelectedIcon = value ? getBenefitIcon(value) : undefined;

  function renderGrid(names: string[]) {
    return (
      <div className="flex flex-wrap gap-2">
        {names.map((name) => {
          const Icon = BENEFIT_ICONS[name];
          if (!Icon) return null;
          const isSelected = name === value;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              aria-pressed={isSelected}
              aria-label={name}
              title={name}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md border transition-colors duration-fast ease-premium",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container-highest",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {SelectedIcon ? <SelectedIcon className="h-4.5 w-4.5" /> : <span className="text-caption">?</span>}
        </div>
        <p className="text-small text-on-surface-variant">
          {value ? <span className="font-semibold text-on-surface">{value}</span> : "Sin ícono elegido"}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar ícono…"
          className="pl-9"
          aria-label="Buscar ícono"
        />
      </div>

      {filtered ? (
        renderGrid(filtered)
      ) : (
        <div className="space-y-2">
          <p className="text-caption font-semibold text-on-surface-variant">
            Sugeridos para {CATEGORY_LABELS[category]}
          </p>
          {renderGrid(suggested)}
        </div>
      )}
    </div>
  );
}

export { IconPicker };
