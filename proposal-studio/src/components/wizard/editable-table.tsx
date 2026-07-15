"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WizardComparisonColumn, WizardComparisonRow } from "@/types/wizard";

interface EditableTableProps {
  columns: WizardComparisonColumn[];
  rows: WizardComparisonRow[];
  onChange: (columns: WizardComparisonColumn[], rows: WizardComparisonRow[]) => void;
}

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function EditableTable({ columns, rows, onChange }: EditableTableProps) {
  function addColumn() {
    onChange([...columns, { id: newId("col"), label: "Nueva columna" }], rows);
  }

  function renameColumn(id: string, label: string) {
    onChange(
      columns.map((column) => (column.id === id ? { ...column, label } : column)),
      rows,
    );
  }

  function removeColumn(id: string) {
    onChange(
      columns.filter((column) => column.id !== id),
      rows.map((row) => ({
        ...row,
        values: Object.fromEntries(Object.entries(row.values).filter(([columnId]) => columnId !== id)),
      })),
    );
  }

  function addRow() {
    onChange(columns, [...rows, { id: newId("row"), label: "Nueva fila", values: {} }]);
  }

  function renameRow(id: string, label: string) {
    onChange(
      columns,
      rows.map((row) => (row.id === id ? { ...row, label } : row)),
    );
  }

  function removeRow(id: string) {
    onChange(
      columns,
      rows.filter((row) => row.id !== id),
    );
  }

  function setCell(rowId: string, columnId: string, value: string) {
    onChange(
      columns,
      rows.map((row) =>
        row.id === rowId ? { ...row, values: { ...row.values, [columnId]: value } } : row,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-outline-variant">
        <table className="w-full min-w-[640px] border-collapse text-small">
          <thead>
            <tr className="bg-surface-container-low">
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
                      onClick={() => removeColumn(column.id)}
                      aria-label={`Eliminar columna ${column.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-outline-variant last:border-b-0">
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
                      onClick={() => removeRow(row.id)}
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
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
}

export { EditableTable };
