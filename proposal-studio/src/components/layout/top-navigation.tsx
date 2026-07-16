import Link from "next/link";
import { Bell, Search } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { isAdmin, isPlatformOwner } from "@/lib/auth/authorization";
import type { Profile } from "@/lib/auth/session";

export interface TopNavigationProps {
  collapsed: boolean;
  profile: Profile | null;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

/** "Propietario de plataforma" solo si `is_platform_owner`; si no, la etiqueta de `role`. */
function getRoleLabel(profile: Profile): string {
  if (isPlatformOwner(profile)) return "Propietario de plataforma";
  if (isAdmin(profile)) return "Administrador";
  return "Asesor";
}

function TopNavigation({ collapsed, profile }: TopNavigationProps) {
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
          {profile && (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-small font-semibold leading-tight text-on-surface">{profile.full_name}</p>
                <p className="text-caption leading-tight text-on-surface-variant">{getRoleLabel(profile)}</p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-highest text-caption font-semibold text-on-surface-variant">
                {getInitials(profile.full_name)}
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export { TopNavigation };
