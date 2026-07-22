"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMMERCIAL_STATUS_LABEL, COMMERCIAL_STATUSES } from "@/components/layout/commercial-status-pill";

const ALL = "__all__";

interface ProposalFiltersProps {
  current: {
    q?: string;
    status?: string;
    from?: string;
    to?: string;
  };
}

function ProposalFilters({ current }: ProposalFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(current.q ?? "");
  const [from, setFrom] = useState(current.from ?? "");
  const [to, setTo] = useState(current.to ?? "");

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/proposals?${params.toString()}`);
  }

  const hasFilters = Boolean(current.q || current.status || current.from || current.to);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface p-4">
      <div className="min-w-56 flex-1 space-y-1">
        <Label htmlFor="proposal-filter-search" className="text-caption font-medium text-on-surface-variant">
          Buscar
        </Label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ q: search.trim() || undefined });
          }}
        >
          <Input
            id="proposal-filter-search"
            placeholder="Cliente o título"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="space-y-1">
        <Label htmlFor="proposal-filter-status" className="text-caption font-medium text-on-surface-variant">
          Estado
        </Label>
        <Select value={current.status ?? ALL} onValueChange={(v) => updateParams({ status: v === ALL ? undefined : v })}>
          <SelectTrigger id="proposal-filter-status" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {COMMERCIAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {COMMERCIAL_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="proposal-filter-from" className="text-caption font-medium text-on-surface-variant">
          Desde
        </Label>
        <Input
          id="proposal-filter-from"
          type="date"
          className="w-40"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onBlur={() => updateParams({ from: from || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="proposal-filter-to" className="text-caption font-medium text-on-surface-variant">
          Hasta
        </Label>
        <Input
          id="proposal-filter-to"
          type="date"
          className="w-40"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onBlur={() => updateParams({ to: to || undefined })}
        />
      </div>

      {hasFilters && (
        <Button type="button" variant="secondary" onClick={() => router.push("/proposals")}>
          Limpiar
        </Button>
      )}
    </div>
  );
}

export { ProposalFilters };
