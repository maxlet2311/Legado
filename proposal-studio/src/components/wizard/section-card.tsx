import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Colapsable con un clic en el título (auditoría del editor, 3.3). Arranca expandido. */
  collapsible?: boolean;
}

function SectionCard({ title, description, actions, children, className, collapsible }: SectionCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const showBody = !collapsible || !collapsed;

  return (
    <section className={cn("w-full", className)}>
      <div className="flex flex-row items-start justify-between gap-4 border-b border-outline-variant/70 pb-5">
        <button
          type="button"
          onClick={collapsible ? () => setCollapsed((prev) => !prev) : undefined}
          className={cn("flex items-start gap-2 text-left", !collapsible && "cursor-default")}
          aria-expanded={collapsible ? showBody : undefined}
          disabled={!collapsible}
        >
          {collapsible &&
            (collapsed ? (
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-on-surface-variant" />
            ) : (
              <ChevronDown className="mt-2 h-4 w-4 shrink-0 text-on-surface-variant" />
            ))}
          <div className="space-y-1.5">
            <h3 className="font-serif text-h3 font-bold tracking-tight text-on-surface">{title}</h3>
            {description && <p className="text-small text-on-surface-variant">{description}</p>}
          </div>
        </button>
        {actions}
      </div>
      {showBody && <div className="space-y-8 pt-8">{children}</div>}
    </section>
  );
}

export { SectionCard };
