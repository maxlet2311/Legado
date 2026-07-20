"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Palette,
  Plus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  ShieldCheck,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";
import { isPlatformOwner } from "@/lib/auth/authorization";
import type { Profile } from "@/lib/auth/session";

const navItems = [
  { href: "/dashboard", label: "Panel de Control", icon: LayoutDashboard },
  { href: "/proposals", label: "Propuestas", icon: FileText },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/branding", label: "Mi Marca", icon: Palette },
];

export interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  profile: Profile | null;
}

function Sidebar({ collapsed, onCollapsedChange, profile }: SidebarProps) {
  const pathname = usePathname();
  const showAdminLink = Boolean(profile && isPlatformOwner(profile));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-outline-variant bg-surface-container-low transition-all duration-base ease-premium",
        collapsed ? "w-20" : "w-70",
      )}
    >
      <div className="flex items-center justify-between p-6">
        {!collapsed && (
          <div>
            <h1 className="text-h4 font-bold tracking-tight text-on-surface">Proposal Studio™</h1>
            <p className="mt-1 text-caption text-on-surface-variant">Asesor Premium</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="rounded-xs p-1.5 text-on-surface-variant hover:bg-surface-container-highest"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-4 py-3 text-small font-medium transition-colors duration-fast ease-premium",
                isActive
                  ? "border-l-4 border-primary bg-surface-container-high font-bold text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
        {showAdminLink && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-4 py-3 text-small font-medium transition-colors duration-fast ease-premium",
              pathname?.startsWith("/admin")
                ? "border-l-4 border-primary bg-surface-container-high font-bold text-primary"
                : "text-on-surface-variant hover:bg-surface-container-highest",
            )}
          >
            <ShieldCheck className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Administración</span>}
          </Link>
        )}
      </nav>

      <div className="space-y-6 border-t border-outline-variant px-4 py-6">
        <Link
          href="/proposals/new"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-small font-bold text-on-primary transition-all duration-fast ease-premium hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>Nueva Propuesta</span>}
        </Link>
        <div className="space-y-1">
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-2 text-small font-medium text-on-surface-variant transition-colors hover:text-error"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export { Sidebar };
