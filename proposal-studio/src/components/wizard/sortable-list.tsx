"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
}

function SortableList<T>({ items, getId, onReorder, renderItem, emptyState }: SortableListProps<T>) {
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (moved === undefined) return;
    next.splice(target, 0, moved);
    onReorder(next);
  }

  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={getId(item)} className="flex items-start gap-3">
          <div className="flex flex-col gap-1 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label="Mover hacia arriba"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
              aria-label="Mover hacia abajo"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1">{renderItem(item, index)}</div>
        </li>
      ))}
    </ol>
  );
}

export { SortableList };
