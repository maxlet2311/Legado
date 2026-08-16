import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface SectionCardProps {
  /**
   * Opcional (auditoría estructural, Wave 3): el wizard ya muestra el nombre
   * del bloque una vez en su propio encabezado (caption + H2). Repetirlo acá
   * era la causa de la redundancia de título reportada -- pasar `title` solo
   * cuando el step necesita una subdivisión propia dentro del mismo bloque.
   */
  title?: string;
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
  const hasHeader = Boolean(title || actions || collapsible);

  return (
    <section className={cn("w-full", className)}>
      {hasHeader && (
        <div className="flex flex-row items-start justify-between gap-4 border-b border-outline-variant/70 pb-5">
          {title ? (
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
          ) : collapsible ? (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="flex items-center gap-1 text-caption font-medium text-on-surface-variant"
              aria-expanded={showBody}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {collapsed ? "Mostrar" : "Ocultar"}
            </button>
          ) : (
            <span />
          )}
          {actions}
        </div>
      )}
      {showBody && <div className={cn("space-y-8", hasHeader && "pt-8")}>{children}</div>}
    </section>
  );
}

export { SectionCard };
