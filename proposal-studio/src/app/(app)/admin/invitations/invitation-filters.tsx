"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/app/(app)/admin/invitations/invitation-status-badge";
import type { AdminInvitationStatus } from "@/lib/account-activation/types";

const ALL = "__all__";
const STATUSES: AdminInvitationStatus[] = ["pending", "used", "revoked", "expired"];

interface InvitationFiltersProps {
  current: {
    status?: string;
    q?: string;
  };
}

function InvitationFilters({ current }: InvitationFiltersProps) {
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
    router.push(`/admin/invitations?${params.toString()}`);
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
            placeholder="Email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar por email"
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
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="button" variant="secondary" onClick={() => router.push("/admin/invitations")}>
        Limpiar
      </Button>
    </div>
  );
}

export { InvitationFilters };
