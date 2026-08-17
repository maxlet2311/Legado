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
        "fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-fine bg-surface px-4 transition-all duration-base ease-premium md:px-8",
        collapsed ? "md:left-20" : "md:left-20 lg:left-64",
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMobileNav}
          className="rounded-md hover:bg-surface-container-low text-on-surface-variant hover:text-primary md:hidden active:scale-95"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-serif text-sm font-semibold text-primary md:hidden">Proposal Studio™</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold leading-tight text-on-surface">{profile.full_name || "Asesor"}</p>
              <p className="text-[10px] leading-tight text-on-surface-variant mt-0.5">{getRoleLabel(profile)}</p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-fine bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(profile.full_name)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export { TopNavigation };
