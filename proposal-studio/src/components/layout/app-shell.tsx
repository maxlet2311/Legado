"use client";

import * as React from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNavigation } from "@/components/layout/top-navigation";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { cn } from "@/lib/utils/cn";
import { useFocusModeStore } from "@/stores/focus-mode-store";
import type { Profile } from "@/lib/auth/session";

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile | null;
}

function AppShell({ children, profile }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const focusMode = useFocusModeStore((state) => state.active);

  // `children` (el wizard) siempre debe quedar en la misma posición del árbol
  // sin importar `focusMode`: si esta rama cambia de forma (otro padre, otra
  // profundidad), React desmonta y remonta todo lo que hay debajo, y el efecto
  // de hidratación del wizard vuelve a correr y resetea el store al paso 0.
  return (
    <div className="min-h-screen bg-background">
      {!focusMode ? (
        <>
          <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} profile={profile} />
          <TopNavigation collapsed={collapsed} profile={profile} onOpenMobileNav={() => setMobileNavOpen(true)} />
          <MobileNavDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} profile={profile} />
        </>
      ) : null}
      <main
        className={cn(
          "min-h-screen overflow-x-hidden transition-all duration-base ease-premium",
          !focusMode && [
            "mt-18 min-h-[calc(100vh-4.5rem)] p-4 md:p-10",
            collapsed ? "md:ml-20" : "md:ml-70",
          ],
        )}
      >
        {children}
      </main>
    </div>
  );
}

export { AppShell };
