"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { isPlatformOwner } from "@/lib/auth/authorization";
import type { Profile } from "@/lib/auth/session";
import { navItems } from "@/components/layout/nav-items";

export interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  profile: Profile | null;
}

function getInitials(fullName?: string | null): string {
  if (!fullName) return "A";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "A";
}

function Sidebar({ collapsed, onCollapsedChange, profile }: SidebarProps) {
  const pathname = usePathname();
  const showAdminLink = Boolean(profile && isPlatformOwner(profile));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-fine bg-surface transition-all duration-base ease-premium md:flex",
        collapsed ? "w-20" : "w-20 lg:w-64",
      )}
    >
      {/* Brand Header */}
      <div className={cn("flex items-center justify-between border-b border-fine p-5", collapsed && "justify-center px-2")}>
        {!collapsed && (
          <div className="hidden lg:flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs font-serif font-bold text-sm">
              P
            </div>
            <div>
              <h1 className="font-serif text-base font-bold tracking-tight text-primary leading-none">Proposal Studio™</h1>
              <p className="mt-1 text-[11px] font-medium text-on-surface-variant leading-none">Premium Advisory</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs font-serif font-bold text-sm">
            P
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(!collapsed)}
          className="rounded-md hover:bg-surface-container-low text-on-surface-variant hover:text-primary active:scale-95"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-3 py-5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3.5 py-2.5 text-small font-medium transition-colors duration-fast ease-premium group",
                isActive
                  ? "bg-surface-container-low text-primary font-semibold border-r-2 border-primary"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isActive && "text-primary")} />
              {!collapsed && <span className="hidden lg:inline">{label}</span>}
            </Link>
          );
        })}
        {showAdminLink && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3.5 py-2.5 text-small font-medium transition-colors duration-fast ease-premium group",
              pathname?.startsWith("/admin")
                ? "bg-surface-container-low text-primary font-semibold border-r-2 border-primary"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Administración" : undefined}
          >
            <ShieldCheck className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", pathname?.startsWith("/admin") && "text-primary")} />
            {!collapsed && <span className="hidden lg:inline">Administración</span>}
          </Link>
        )}
      </nav>

      {/* Footer Profile & Actions */}
      <div className="border-t border-fine p-4 space-y-4">
        <Link
          href="/proposals/new"
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-small font-semibold text-on-primary transition-all duration-fast ease-premium hover:opacity-90 active:scale-press shadow-xs",
            collapsed && "px-2",
          )}
          title={collapsed ? "Nueva Propuesta" : undefined}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="hidden lg:inline">Nueva Propuesta</span>}
        </Link>

        {profile && !collapsed && (
          <div className="hidden lg:flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(profile.full_name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate leading-tight">{profile.full_name || "Asesor"}</p>
                <p className="text-[10px] text-on-surface-variant truncate leading-tight mt-0.5">Socio Asesor</p>
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Cerrar Sesión"
                className="text-on-surface-variant hover:text-error p-1.5 rounded-md hover:bg-surface-container-low transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
        {profile && collapsed && (
          <div className="flex justify-center pt-1">
            <form action={signOutAction}>
              <button
                type="submit"
                title="Cerrar Sesión"
                className="text-on-surface-variant hover:text-error p-2 rounded-md hover:bg-surface-container-low transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}

export { Sidebar };
