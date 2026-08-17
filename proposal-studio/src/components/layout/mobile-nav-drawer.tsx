"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, LogOut, ShieldCheck, X } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { isPlatformOwner } from "@/lib/auth/authorization";
import type { Profile } from "@/lib/auth/session";
import { navItems } from "@/components/layout/nav-items";

export interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
}

function MobileNavDrawer({ open, onOpenChange, profile }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const showAdminLink = Boolean(profile && isPlatformOwner(profile));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-inverse-surface/40 md:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col border-r border-fine bg-surface md:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Menú de navegación</DialogPrimitive.Title>
          <div className="flex items-center justify-between border-b border-fine p-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs font-serif font-bold text-sm">
                P
              </div>
              <div>
                <h1 className="font-serif text-base font-bold tracking-tight text-primary leading-none">Proposal Studio™</h1>
                <p className="mt-1 text-[11px] font-medium text-on-surface-variant leading-none">Premium Advisory</p>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-md hover:bg-surface-container-low text-on-surface-variant hover:text-primary active:scale-95"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3.5 py-2.5 text-small font-medium transition-colors duration-fast ease-premium group",
                    isActive
                      ? "bg-surface-container-low text-primary font-semibold border-r-2 border-primary"
                      : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isActive && "text-primary")} />
                  <span>{label}</span>
                </Link>
              );
            })}
            {showAdminLink && (
              <Link
                href="/admin"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3.5 py-2.5 text-small font-medium transition-colors duration-fast ease-premium group",
                  pathname?.startsWith("/admin")
                    ? "bg-surface-container-low text-primary font-semibold border-r-2 border-primary"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low",
                )}
              >
                <ShieldCheck className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", pathname?.startsWith("/admin") && "text-primary")} />
                <span>Administración</span>
              </Link>
            )}
          </nav>

          <div className="space-y-4 border-t border-fine p-4">
            <Link
              href="/proposals/new"
              onClick={() => onOpenChange(false)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-small font-semibold text-on-primary transition-all duration-fast ease-premium hover:opacity-90 active:scale-press shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Propuesta</span>
            </Link>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                className="h-auto w-full justify-start gap-3 px-3 py-2 text-small font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-error active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </Button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { MobileNavDrawer };
