"use client";

import * as React from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNavigation } from "@/components/layout/top-navigation";
import { cn } from "@/lib/utils/cn";
import type { Profile } from "@/lib/auth/session";

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile | null;
}

function AppShell({ children, profile }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} profile={profile} />
      <TopNavigation collapsed={collapsed} profile={profile} />
      <main
        className={cn(
          "mt-18 min-h-[calc(100vh-4.5rem)] p-10 transition-all duration-base ease-premium",
          collapsed ? "ml-20" : "ml-70",
        )}
      >
        {children}
      </main>
    </div>
  );
}

export { AppShell };
