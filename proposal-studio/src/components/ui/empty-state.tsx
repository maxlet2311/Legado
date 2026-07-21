import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Versión chica sin borde punteado, para usar dentro de Cards/Dialogs/listas en vez de una página completa. */
  compact?: boolean;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-1.5 py-6" : "gap-3 rounded-lg border border-dashed border-outline-variant px-8 py-16",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-md bg-surface-container-low text-outline",
            compact ? "h-8 w-8" : "h-12 w-12",
          )}
        >
          <Icon className={compact ? "h-4 w-4" : "h-6 w-6"} />
        </div>
      ) : null}
      <h2 className={compact ? "text-small font-semibold text-on-surface" : "text-h4 font-semibold text-on-surface"}>
        {title}
      </h2>
      {description ? (
        <p className={cn("max-w-sm text-on-surface-variant", compact ? "text-caption" : "text-small")}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
