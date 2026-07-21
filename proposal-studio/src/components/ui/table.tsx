import * as React from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Tabla base con scroll horizontal. No incluye el borde/fondo exterior — envolver
 * en `<Card className="overflow-hidden">` para el contenedor `rounded-xl` estándar.
 * Reemplaza los `<table>` armados a mano en Clientes, Dashboard y el panel Admin.
 */
const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="overflow-x-auto">
      <table ref={ref} className={cn("w-full text-left", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={className} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("divide-y divide-outline-variant", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Hover con transición, para filas clicables/con acciones. Default: true. */
  interactive?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, interactive = true, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(interactive && "group transition-colors hover:bg-surface-container-low", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHeaderRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => <tr ref={ref} className={cn("bg-surface-container-low", className)} {...props} />,
);
TableHeaderRow.displayName = "TableHeaderRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant", className)}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => <td ref={ref} className={cn("px-8 py-5", className)} {...props} />,
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHeaderRow, TableHead, TableCell };
