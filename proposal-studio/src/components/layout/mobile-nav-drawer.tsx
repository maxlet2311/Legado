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
            "fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[80vw] flex-col border-r border-outline-variant bg-surface-container-low md:hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Menú de navegación</DialogPrimitive.Title>
          <div className="flex items-center justify-between p-6">
            <div>
              <h1 className="text-h4 font-bold tracking-tight text-on-surface">Proposal Studio™</h1>
              <p className="mt-1 text-caption text-on-surface-variant">Asesor Premium</p>
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="rounded-xs hover:bg-surface-container-highest active:scale-100"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-4 py-3 text-small font-medium transition-colors duration-fast ease-premium",
                    isActive
                      ? "border-l-4 border-primary bg-surface-container-high font-bold text-primary"
                      : "text-on-surface-variant hover:bg-surface-container-highest",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
            {showAdminLink && (
              <Link
                href="/admin"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-3 text-small font-medium transition-colors duration-fast ease-premium",
                  pathname?.startsWith("/admin")
                    ? "border-l-4 border-primary bg-surface-container-high font-bold text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-highest",
                )}
              >
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span>Administración</span>
              </Link>
            )}
          </nav>

          <div className="space-y-6 border-t border-outline-variant px-4 py-6">
            <Link
              href="/proposals/new"
              onClick={() => onOpenChange(false)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-small font-bold text-on-primary transition-all duration-fast ease-premium hover:opacity-90 active:scale-press"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Propuesta</span>
            </Link>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                className="h-auto w-full justify-start gap-3 px-4 py-2 font-medium hover:bg-transparent hover:text-error active:scale-100"
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
