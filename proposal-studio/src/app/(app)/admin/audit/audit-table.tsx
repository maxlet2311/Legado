"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatDateTime } from "@/app/(app)/admin/memberships/status-badge";
import { sanitizeForDisplay } from "@/lib/admin/sanitize";
import { buildAuditDiff } from "@/lib/admin/audit-diff";
import type { AdminAuditEventListItem } from "@/lib/admin/audit-queries";

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const sanitized = sanitizeForDisplay(value);
  const hasContent = sanitized !== null && sanitized !== undefined && !(typeof sanitized === "object" && Object.keys(sanitized as object).length === 0);

  return (
    <div>
      <p className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">{label}</p>
      {hasContent ? (
        <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-surface-container-low p-3 text-caption text-on-surface">
          {JSON.stringify(sanitized, null, 2)}
        </pre>
      ) : (
        <p className="mt-1 text-caption text-outline">—</p>
      )}
    </div>
  );
}

function AuditDiffView({ before, after }: { before: unknown; after: unknown }) {
  const sanitizedBefore = sanitizeForDisplay(before);
  const sanitizedAfter = sanitizeForDisplay(after);
  const diff = buildAuditDiff(sanitizedBefore, sanitizedAfter);

  if (diff.length === 0) {
    return <p className="text-caption text-outline">Sin cambios detectables entre antes/después.</p>;
  }

  return (
    <ul className="space-y-1 text-caption">
      {diff.map((entry) => (
        <li key={entry.key} className="flex flex-wrap items-baseline gap-2">
          <span
            className={
              entry.kind === "added"
                ? "font-semibold text-success"
                : entry.kind === "removed"
                  ? "font-semibold text-error"
                  : "font-semibold text-warning"
            }
          >
            {entry.kind === "added" ? "+ agregado" : entry.kind === "removed" ? "− eliminado" : "~ modificado"}
          </span>
          <span className="font-mono text-on-surface">{entry.key}</span>
          {entry.kind !== "added" && (
            <span className="text-on-surface-variant">antes: {JSON.stringify(entry.before)}</span>
          )}
          {entry.kind !== "removed" && (
            <span className="text-on-surface-variant">después: {JSON.stringify(entry.after)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function AuditEventDetail({ event }: { event: AdminAuditEventListItem }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-small sm:grid-cols-2">
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">ID del evento</dt>
          <dd className="text-on-surface">{event.id}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Actor</dt>
          <dd className="text-on-surface">
            {event.actorName ?? "—"} {event.actorUserId ? `(${event.actorUserId})` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Motivo</dt>
          <dd className="text-on-surface">{event.reason ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Fecha</dt>
          <dd className="text-on-surface">{formatDateTime(event.createdAt)}</dd>
        </div>
      </dl>

      <div>
        <p className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Diff (antes → después)</p>
        <div className="mt-1 rounded-md bg-surface-container-low p-3">
          <AuditDiffView before={event.beforeData} after={event.afterData} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <JsonBlock label="Antes" value={event.beforeData} />
        <JsonBlock label="Después" value={event.afterData} />
        <JsonBlock label="Metadata" value={event.metadata} />
      </div>
    </div>
  );
}

function summarize(event: AdminAuditEventListItem): string {
  if (event.reason) return event.reason;
  if (event.entityId) return `${event.entityType} · ${event.entityId}`;
  return event.entityType;
}

function AuditTable({ items }: { items: AdminAuditEventListItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-xl border border-outline-variant bg-surface md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Fecha</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Actor</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Acción</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Entidad</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Resumen</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {items.map((event) => {
                const expanded = expandedId === event.id;
                return (
                  <Fragment key={event.id}>
                    <tr className="hover:bg-surface-container-low">
                      <td className="px-6 py-4 text-small text-on-surface-variant">{formatDateTime(event.createdAt)}</td>
                      <td className="px-6 py-4 text-small text-on-surface">{event.actorName ?? "Sistema"}</td>
                      <td className="px-6 py-4 text-small font-medium text-on-surface">{event.action}</td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">
                        {event.entityType}
                        {event.entityId ? ` · ${event.entityId.slice(0, 8)}…` : ""}
                      </td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{summarize(event)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : event.id)}
                          className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline"
                          aria-expanded={expanded}
                        >
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          Detalle
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-surface-container-lowest">
                        <td colSpan={6} className="px-6 py-4">
                          <AuditEventDetail event={event} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {items.map((event) => {
          const expanded = expandedId === event.id;
          return (
            <div key={event.id} className="rounded-xl border border-outline-variant bg-surface p-4">
              <p className="text-caption text-on-surface-variant">{formatDateTime(event.createdAt)}</p>
              <p className="mt-1 text-small font-medium text-on-surface">{event.action}</p>
              <p className="text-caption text-on-surface-variant">
                {event.actorName ?? "Sistema"} · {event.entityType}
              </p>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : event.id)}
                className="mt-3 inline-flex items-center gap-1 text-small font-medium text-primary hover:underline"
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Detalle
              </button>
              {expanded && (
                <div className="mt-4 border-t border-outline-variant pt-4">
                  <AuditEventDetail event={event} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export { AuditTable };
