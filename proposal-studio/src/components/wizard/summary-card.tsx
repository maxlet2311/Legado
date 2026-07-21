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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {onEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {empty ? <EmptyState compact title={emptyLabel ?? "Sin datos todavía."} /> : children}
      </CardContent>
    </Card>
  );
}

export { SummaryCard };
