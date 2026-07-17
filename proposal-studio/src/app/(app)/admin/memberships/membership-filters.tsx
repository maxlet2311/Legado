"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MEMBERSHIP_STATUSES } from "@/lib/memberships/types";
import { STATUS_LABELS } from "@/app/(app)/admin/memberships/status-badge";

const ALL = "__all__";

interface MembershipFiltersProps {
  plans: { id: string; name: string }[];
  current: {
    status?: string;
    plan?: string;
    provider?: string;
    linked?: string;
    q?: string;
  };
}

function MembershipFilters({ plans, current }: MembershipFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(current.q ?? "");

  function updateParam(key: string, value: string | undefined) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== ALL) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/admin/memberships?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface p-4">
      <div className="min-w-48 flex-1 space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Buscar</label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParam("q", search.trim() || undefined);
          }}
        >
          <Input
            placeholder="Email, nombre o ID de suscripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Estado</label>
        <Select value={current.status ?? ALL} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {MEMBERSHIP_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Plan</label>
        <Select value={current.plan ?? ALL} onValueChange={(v) => updateParam("plan", v)}>
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
        <label className="text-caption font-medium text-on-surface-variant">Proveedor</label>
        <Select value={current.provider ?? ALL} onValueChange={(v) => updateParam("provider", v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-caption font-medium text-on-surface-variant">Vinculación</label>
        <Select value={current.linked ?? ALL} onValueChange={(v) => updateParam("linked", v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            <SelectItem value="linked">Vinculada</SelectItem>
            <SelectItem value="unlinked">Sin vincular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="button" variant="secondary" onClick={() => router.push("/admin/memberships")}>
        Limpiar
      </Button>
    </div>
  );
}

export { MembershipFilters };
