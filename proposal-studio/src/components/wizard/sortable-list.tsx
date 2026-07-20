"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
}

interface SortableRowProps {
  id: string;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  children: ReactNode;
}

/**
 * Fila arrastrable (auditoría del editor, 3.4): el handle es el único
 * elemento con los listeners de dnd-kit -- así el arrastre nunca compite con
 * el foco/selección de los inputs del ítem. Las flechas se conservan como
 * mecanismo redundante accesible por teclado sin arrastre (tab + click).
 */
function SortableRow({ id, index, total, onMove, children }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-start gap-2", isDragging && "z-10 opacity-90")}
    >
      <div className="flex flex-col items-center gap-1 pt-1">
        <button
          type="button"
          className="cursor-grab touch-none rounded-xs p-1 text-on-surface-variant hover:bg-surface-container-highest active:cursor-grabbing"
          aria-label="Arrastrar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label="Mover hacia arriba"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          aria-label="Mover hacia abajo"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1">{children}</div>
    </li>
  );
}

function SortableList<T>({ items, getId, onReorder, renderItem, emptyState }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (moved === undefined) return;
    next.splice(target, 0, moved);
    onReorder(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => getId(item) === active.id);
    const newIndex = items.findIndex((item) => getId(item) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    if (moved === undefined) return;
    next.splice(newIndex, 0, moved);
    onReorder(next);
  }

  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  const ids = items.map(getId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="space-y-4">
          {items.map((item, index) => (
            <SortableRow
              key={getId(item)}
              id={getId(item)}
              index={index}
              total={items.length}
              onMove={(direction) => move(index, direction)}
            >
              {renderItem(item, index)}
            </SortableRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

export { SortableList };
