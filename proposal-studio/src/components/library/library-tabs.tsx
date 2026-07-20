"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";
import { LibraryBrowser } from "@/components/library/library-browser";
import { TemplatesBrowser } from "@/components/library/templates-browser";

interface LibraryTabsProps {
  clients: { id: string; full_name: string }[];
}

const TABS = [
  { key: "blocks", label: "Bloques" },
  { key: "templates", label: "Plantillas" },
] as const;

function LibraryTabs({ clients }: LibraryTabsProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("blocks");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-outline-variant">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-small font-semibold transition-colors",
              tab === item.key
                ? "border-primary text-on-surface"
                : "border-transparent text-on-surface-variant hover:text-on-surface",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "blocks" ? <LibraryBrowser /> : <TemplatesBrowser clients={clients} />}
    </div>
  );
}

export { LibraryTabs };
