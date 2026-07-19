import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-outline-variant px-8 py-16 text-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-container-low text-outline">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h2 className="text-h4 font-semibold text-on-surface">{title}</h2>
      {description ? (
        <p className="max-w-sm text-small text-on-surface-variant">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
