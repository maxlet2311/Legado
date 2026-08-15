import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className={cn("w-full rounded-lg border-outline-variant/40 shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-outline-variant/40 pb-6">
        <button
          type="button"
          onClick={collapsible ? () => setCollapsed((prev) => !prev) : undefined}
          className={cn("flex items-start gap-2 space-y-1.5 text-left", !collapsible && "cursor-default")}
          aria-expanded={collapsible ? showBody : undefined}
          disabled={!collapsible}
        >
          {collapsible &&
            (collapsed ? (
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-on-surface-variant" />
            ) : (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-on-surface-variant" />
            ))}
          <div>
            <CardTitle className="font-medium tracking-tight">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </button>
        {actions}
      </CardHeader>
      {showBody && <CardContent className="space-y-8 pt-8">{children}</CardContent>}
    </Card>
  );
}

export { SectionCard };
