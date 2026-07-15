import Link from "next/link";
import { Bell, Search } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface TopNavigationProps {
  collapsed: boolean;
}

function TopNavigation({ collapsed }: TopNavigationProps) {
  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-40 flex h-18 items-center justify-between border-b border-outline-variant bg-surface px-10 transition-all duration-base ease-premium",
        collapsed ? "left-20" : "left-70",
      )}
    >
      <div className="flex max-w-xl flex-1 items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <input
            type="text"
            placeholder="Buscar propuestas, clientes o biblioteca..."
            className="w-full rounded-full border-none bg-surface-container py-2 pl-10 pr-4 text-small focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <nav className="ml-8 flex items-center gap-8">
        <Link
          href="#"
          className="text-small font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          Borradores
        </Link>
        <Link
          href="#"
          className="text-small font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          Actividad de Clientes
        </Link>
        <button
          type="button"
          className="rounded-md bg-primary-fixed px-4 py-2 text-small font-bold text-on-primary-fixed transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Generar PDF
        </button>
        <div className="flex items-center gap-4 border-l border-outline-variant pl-8">
          <button
            type="button"
            className="text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-highest text-caption font-semibold text-on-surface-variant">
            AM
          </div>
        </div>
      </nav>
    </header>
  );
}

export { TopNavigation };
