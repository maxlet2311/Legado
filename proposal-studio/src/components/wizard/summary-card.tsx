import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface SummaryCardProps {
  title: string;
  onEdit?: () => void;
  children: ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}

function SummaryCard({ title, onEdit, children, empty, emptyLabel }: SummaryCardProps) {
  return (
    <Card className="rounded-xl border-fine bg-surface shadow-2xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-fine py-4 px-6">
        <CardTitle className="font-serif text-base sm:text-lg font-bold text-on-surface tracking-tight">{title}</CardTitle>
        {onEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-8 text-xs font-medium text-on-surface-variant hover:text-primary">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {empty ? <EmptyState compact title={emptyLabel ?? "Sin datos todavía."} /> : children}
      </CardContent>
    </Card>
  );
}

export { SummaryCard };
