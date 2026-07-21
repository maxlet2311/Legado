import Link from "next/link";
import type { ReactNode } from "react";

interface PaginationLinkProps {
  href: string;
  disabled: boolean;
  children: ReactNode;
}

/** Control de paginación anterior/siguiente. Extraído para eliminar la clase repetida literal en Clientes y Membresías admin. */
function PaginationLink({ href, disabled, children }: PaginationLinkProps) {
  return (
    <Link
      href={disabled ? "#" : href}
      aria-disabled={disabled}
      className={`flex items-center gap-1 rounded-md border border-outline-variant px-4 py-2 text-small font-medium ${
        disabled ? "pointer-events-none opacity-40" : "text-on-surface hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </Link>
  );
}

export { PaginationLink };
