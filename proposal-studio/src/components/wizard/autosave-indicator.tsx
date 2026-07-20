import { AlertTriangle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils/cn";
import type { AutosaveStatus } from "@/types/wizard";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  error?: string;
  className?: string;
  /** Solo se usan cuando status === "conflict" (ver hooks/use-autosave.ts). */
  onResolveKeepMine?: () => void;
  onResolveReload?: () => void;
}

const LABELS: Record<AutosaveStatus, string> = {
  idle: "",
  saving: "Guardando…",
  saved: "Guardado",
  error: "Error al guardar",
  conflict: "Se modificó en otra sesión",
};

function AutosaveIndicator({
  status,
  error,
  className,
  onResolveKeepMine,
  onResolveReload,
}: AutosaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className={cn(
          "flex items-center gap-2 text-caption font-semibold",
          status === "saved" && "text-success",
          status === "saving" && "text-on-surface-variant",
          (status === "error" || status === "conflict") && "text-error",
        )}
        role="status"
        aria-live="polite"
        title={status === "error" ? error : undefined}
      >
        {status === "saving" && <Spinner className="h-3.5 w-3.5" />}
        {status === "saved" && <Check className="h-3.5 w-3.5" />}
        {(status === "error" || status === "conflict") && <AlertTriangle className="h-3.5 w-3.5" />}
        {LABELS[status]}
      </div>
      {status === "conflict" && (
        <div className="flex items-center gap-2">
          <p className="text-caption text-on-surface-variant">
            Alguien más editó esto mientras trabajabas. Tu texto sigue acá, sin guardar.
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={onResolveReload}>
            Recargar cambios recientes
          </Button>
          <Button type="button" size="sm" onClick={onResolveKeepMine}>
            Conservar mi edición
          </Button>
        </div>
      )}
    </div>
  );
}

export { AutosaveIndicator };
