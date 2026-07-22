"use client";

import { useState, type ReactNode } from "react";
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
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { WizardComparisonColumn, WizardComparisonRow } from "@/types/wizard";

interface EditableTableProps {
  columns: WizardComparisonColumn[];
  rows: WizardComparisonRow[];
  onChange: (columns: WizardComparisonColumn[], rows: WizardComparisonRow[]) => void;
  /** Se dispara antes de un cambio estructural (agregar/quitar/reordenar), nunca en la edición de una celda -- usado para el snapshot de undo. */
  onBeforeStructuralChange?: () => void;
}

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

interface DraggableRowProps {
  id: string;
  children: ReactNode;
}

function DraggableRow({ id, children }: DraggableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("border-b border-outline-variant last:border-b-0", isDragging && "relative z-10 bg-surface")}
    >
      <td className="w-8 p-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded-xs p-1 text-on-surface-variant hover:bg-surface-container-highest active:cursor-grabbing"
          aria-label="Arrastrar para reordenar fila"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      {children}
    </tr>
  );
}

interface PendingRemoval {
  kind: "row" | "column";
  id: string;
  label: string;
}

function EditableTable({ columns, rows, onChange, onBeforeStructuralChange }: EditableTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Borrar una fila/columna se lleva todos sus valores cargados y antes no
  // pedía confirmación (a diferencia de eliminar una alternativa/beneficio):
  // la única red de seguridad era Ctrl+Z, un atajo sin ningún botón visible.
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  function addColumn() {
    onBeforeStructuralChange?.();
    onChange([...columns, { id: newId("col"), label: "Nueva columna" }], rows);
  }

  function renameColumn(id: string, label: string) {
    onChange(
      columns.map((column) => (column.id === id ? { ...column, label } : column)),
      rows,
    );
  }

  function duplicateColumn(id: string) {
    onBeforeStructuralChange?.();
    const index = columns.findIndex((column) => column.id === id);
    if (index === -1) return;
    const source = columns[index];
    if (!source) return;
    const clone: WizardComparisonColumn = { id: newId("col"), label: `${source.label} (copia)` };
    const nextColumns = [...columns];
    nextColumns.splice(index + 1, 0, clone);
    onChange(
      nextColumns,
      rows.map((row) => ({ ...row, values: { ...row.values, [clone.id]: row.values[source.id] ?? "" } })),
    );
  }

  function removeColumn(id: string) {
    onBeforeStructuralChange?.();
    onChange(
      columns.filter((column) => column.id !== id),
      rows.map((row) => ({
        ...row,
        values: Object.fromEntries(Object.entries(row.values).filter(([columnId]) => columnId !== id)),
      })),
    );
  }

  function addRow() {
    onBeforeStructuralChange?.();
    onChange(columns, [...rows, { id: newId("row"), label: "Nueva fila", values: {} }]);
  }

  function renameRow(id: string, label: string) {
    onChange(
      columns,
      rows.map((row) => (row.id === id ? { ...row, label } : row)),
    );
  }

  function duplicateRow(id: string) {
    onBeforeStructuralChange?.();
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return;
    const source = rows[index];
    if (!source) return;
    const clone: WizardComparisonRow = {
      id: newId("row"),
      label: `${source.label} (copia)`,
      values: { ...source.values },
    };
    const nextRows = [...rows];
    nextRows.splice(index + 1, 0, clone);
    onChange(columns, nextRows);
  }

  function removeRow(id: string) {
    onBeforeStructuralChange?.();
    onChange(
      columns,
      rows.filter((row) => row.id !== id),
    );
  }

  function confirmRemoval() {
    if (!pendingRemoval) return;
    if (pendingRemoval.kind === "column") removeColumn(pendingRemoval.id);
    else removeRow(pendingRemoval.id);
    setPendingRemoval(null);
  }

  function setCell(rowId: string, columnId: string, value: string) {
    onChange(
      columns,
      rows.map((row) =>
        row.id === rowId ? { ...row, values: { ...row.values, [columnId]: value } } : row,
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((row) => row.id === active.id);
    const newIndex = rows.findIndex((row) => row.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onBeforeStructuralChange?.();
    const next = [...rows];
    const [moved] = next.splice(oldIndex, 1);
    if (moved === undefined) return;
    next.splice(newIndex, 0, moved);
    onChange(columns, next);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-outline-variant">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full min-w-[640px] border-collapse text-small">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="w-8 border-b border-outline-variant p-2" />
                <th className="w-48 border-b border-outline-variant p-2 text-left" />
                {columns.map((column) => (
                  <th key={column.id} className="border-b border-outline-variant p-2 text-left">
                    <div className="flex items-center gap-1">
                      <Input
                        value={column.label}
                        onChange={(event) => renameColumn(column.id, event.target.value)}
                        className="h-9"
                        aria-label="Título de columna"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => duplicateColumn(column.id)}
                        aria-label={`Duplicar columna ${column.label}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setPendingRemoval({ kind: "column", id: column.id, label: column.label })}
                        aria-label={`Eliminar columna ${column.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {rows.map((row) => (
                  <DraggableRow key={row.id} id={row.id}>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Input
                          value={row.label}
                          onChange={(event) => renameRow(row.id, event.target.value)}
                          className="h-9"
                          aria-label="Título de fila"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => duplicateRow(row.id)}
                          aria-label={`Duplicar fila ${row.label}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => setPendingRemoval({ kind: "row", id: row.id, label: row.label })}
                          aria-label={`Eliminar fila ${row.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    {columns.map((column) => (
                      <td key={column.id} className="p-2">
                        <Input
                          value={row.values[column.id] ?? ""}
                          onChange={(event) => setCell(row.id, column.id, event.target.value)}
                          className="h-9"
                          aria-label={`${row.label} — ${column.label}`}
                        />
                      </td>
                    ))}
                  </DraggableRow>
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4" />
          Agregar columna
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Agregar fila
        </Button>
      </div>
      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={pendingRemoval?.kind === "column" ? "Eliminar columna" : "Eliminar fila"}
        description={`"${pendingRemoval?.label || ""}" se va a eliminar de la comparativa junto con todos sus valores cargados. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmRemoval}
      />
    </div>
  );
}

export { EditableTable };
