"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PROCESSING_STATUS_LABELS } from "@/app/(app)/admin/payments/status-badges";

const ALL = "__all__";
const STATUSES = ["received", "processing", "processed", "ignored", "failed", "unmatched"] as const;

interface EventFiltersProps {
  current: {
    provider?: string;
    type?: string;
    status?: string;
    hasError?: boolean;
    from?: string;
    to?: string;
    eventId?: string;
  };
}

function EventFilters({ current }: EventFiltersProps) {
  const router = useRouter();
  const [eventType, setEventType] = useState(current.type ?? "");
  const [eventId, setEventId] = useState(current.eventId ?? "");
  const [from, setFrom] = useState(current.from ?? "");
  const [to, setTo] = useState(current.to ?? "");

  function updateParams(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(overrides)) {
      if (value && value !== ALL) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    router.push(`/admin/payments/events?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface p-4">
      <div className="space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Estado</label>
        <Select value={current.status ?? ALL} onValueChange={(v) => updateParams({ status: v })}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PROCESSING_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Con error</label>
        <Select
          value={current.hasError === undefined ? ALL : current.hasError ? "yes" : "no"}
          onValueChange={(v) => updateParams({ hasError: v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="yes">Con error</SelectItem>
            <SelectItem value="no">Sin error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <form
        className="min-w-40 space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ type: eventType.trim() || undefined });
        }}
      >
        <label className="text-caption font-medium text-on-surface-variant">Tipo de evento</label>
        <Input placeholder="ej. subscription_preapproval" value={eventType} onChange={(e) => setEventType(e.target.value)} />
      </form>

      <form
        className="min-w-40 space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ eventId: eventId.trim() || undefined });
        }}
      >
        <label className="text-caption font-medium text-on-surface-variant">Id interno del evento</label>
        <Input placeholder="uuid" value={eventId} onChange={(e) => setEventId(e.target.value)} />
      </form>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ from: from || undefined, to: to || undefined });
        }}
      >
        <div className="space-y-1">
          <label className="text-caption font-medium text-on-surface-variant">Desde</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-caption font-medium text-on-surface-variant">Hasta</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Aplicar
        </Button>
      </form>

      <Button type="button" variant="secondary" onClick={() => router.push("/admin/payments/events")}>
        Limpiar
      </Button>
    </div>
  );
}

export { EventFilters };
