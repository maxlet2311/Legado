"use client";

import * as React from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNavigation } from "@/components/layout/top-navigation";
import { cn } from "@/lib/utils/cn";

function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <TopNavigation collapsed={collapsed} />
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
