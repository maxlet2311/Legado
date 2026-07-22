import { Menu } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { isAdmin, isPlatformOwner } from "@/lib/auth/authorization";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/auth/session";

export interface TopNavigationProps {
  collapsed: boolean;
  profile: Profile | null;
  onOpenMobileNav: () => void;
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

function TopNavigation({ collapsed, profile, onOpenMobileNav }: TopNavigationProps) {
  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-40 flex h-18 items-center justify-between border-b border-outline-variant bg-surface px-4 transition-all duration-base ease-premium md:px-10",
        collapsed ? "md:left-20" : "md:left-70",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        onClick={onOpenMobileNav}
        className="rounded-xs hover:bg-surface-container-highest active:scale-100 md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <nav className="ml-8 flex items-center gap-8">
        <div className="flex items-center gap-4">
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
