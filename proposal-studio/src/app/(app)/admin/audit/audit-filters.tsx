"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AuditFiltersProps {
  current: {
    actor?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    from?: string;
    to?: string;
  };
}

function AuditFilters({ current }: AuditFiltersProps) {
  const router = useRouter();
  const [actor, setActor] = useState(current.actor ?? "");
  const [action, setAction] = useState(current.action ?? "");
  const [entityType, setEntityType] = useState(current.entityType ?? "");
  const [entityId, setEntityId] = useState(current.entityId ?? "");
  const [from, setFrom] = useState(current.from ?? "");
  const [to, setTo] = useState(current.to ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (actor.trim()) params.set("actor", actor.trim());
    if (action.trim()) params.set("action", action.trim());
    if (entityType.trim()) params.set("entityType", entityType.trim());
    if (entityId.trim()) params.set("entityId", entityId.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin/audit?${params.toString()}`);
  }

  function clear() {
    setActor("");
    setAction("");
    setEntityType("");
    setEntityId("");
    setFrom("");
    setTo("");
    router.push("/admin/audit");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface p-4">
      <div className="min-w-40 space-y-1">
        <Label htmlFor="audit-actor">Actor (ID de usuario)</Label>
        <Input id="audit-actor" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="uuid" />
      </div>
      <div className="min-w-40 space-y-1">
        <Label htmlFor="audit-action">Acción</Label>
        <Input id="audit-action" value={action} onChange={(e) => setAction(e.target.value)} placeholder="ej. membership.suspend" />
      </div>
      <div className="min-w-40 space-y-1">
        <Label htmlFor="audit-entity-type">Entidad</Label>
        <Input id="audit-entity-type" value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="ej. membership" />
      </div>
      <div className="min-w-40 space-y-1">
        <Label htmlFor="audit-entity-id">ID de entidad</Label>
        <Input id="audit-entity-id" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="uuid" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-from">Desde</Label>
        <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="audit-to">Hasta</Label>
        <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Filtrar</Button>
        <Button type="button" variant="secondary" onClick={clear}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}

export { AuditFilters };
