"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CHECKOUT_ATTEMPT_STATUS_LABELS } from "@/app/(app)/admin/payments/status-badges";

const ALL = "__all__";
const STATUSES = ["creating", "ready", "redirected", "matched", "completed", "failed", "expired", "canceled"] as const;

interface CheckoutFiltersProps {
  plans: { id: string; name: string }[];
  current: {
    status?: string;
    provider?: string;
    plan?: string;
    linked?: boolean;
    q?: string;
    from?: string;
    to?: string;
  };
}

function CheckoutFilters({ plans, current }: CheckoutFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(current.q ?? "");
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
    router.push(`/admin/payments/checkouts?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface p-4">
      <form
        className="min-w-48 flex-1 space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ q: search.trim() || undefined });
        }}
      >
        <label className="text-caption font-medium text-on-surface-variant">Buscar por email</label>
        <Input placeholder="Email de la membresía" value={search} onChange={(e) => setSearch(e.target.value)} />
      </form>

      <div className="space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Estado</label>
        <Select value={current.status ?? ALL} onValueChange={(v) => updateParams({ status: v })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CHECKOUT_ATTEMPT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Plan</label>
        <Select value={current.plan ?? ALL} onValueChange={(v) => updateParams({ plan: v })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Suscripción vinculada</label>
        <Select
          value={current.linked === undefined ? ALL : current.linked ? "yes" : "no"}
          onValueChange={(v) => updateParams({ linked: v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="yes">Vinculada</SelectItem>
            <SelectItem value="no">Sin vincular</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

      <Button type="button" variant="secondary" onClick={() => router.push("/admin/payments/checkouts")}>
        Limpiar
      </Button>
    </div>
  );
}

export { CheckoutFilters };
