import { AlertTriangle, Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { AutosaveStatus } from "@/types/wizard";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  error?: string;
  className?: string;
}

const LABELS: Record<AutosaveStatus, string> = {
  idle: "",
  saving: "Guardando…",
  saved: "Guardado",
  error: "Error al guardar",
  conflict: "Se modificó en otra sesión",
};

function AutosaveIndicator({ status, error, className }: AutosaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-caption font-semibold",
        status === "saved" && "text-success",
        status === "saving" && "text-on-surface-variant",
        (status === "error" || status === "conflict") && "text-error",
        className,
      )}
      role="status"
      aria-live="polite"
      title={status === "error" ? error : undefined}
    >
      {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status === "saved" && <Check className="h-3.5 w-3.5" />}
      {(status === "error" || status === "conflict") && <AlertTriangle className="h-3.5 w-3.5" />}
      {LABELS[status]}
    </div>
  );
}

export { AutosaveIndicator };
