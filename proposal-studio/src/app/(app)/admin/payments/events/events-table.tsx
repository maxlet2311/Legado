"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatDateTime } from "@/app/(app)/admin/memberships/status-badge";
import { sanitizeForDisplay } from "@/lib/admin/sanitize";
import { ProcessingStatusBadge } from "@/app/(app)/admin/payments/status-badges";
import type { PaymentProviderEventAdminItem } from "@/lib/payments/webhook-events";

function EventDetail({ event }: { event: PaymentProviderEventAdminItem }) {
  const sanitizedPayload = sanitizeForDisplay(event.payload);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-small sm:grid-cols-2">
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">ID interno</dt>
          <dd className="font-mono text-on-surface">{event.id}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Recurso (enmascarado)</dt>
          <dd className="font-mono text-on-surface">{event.providerResourceIdMasked ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Firma válida</dt>
          <dd className="text-on-surface">{event.signatureValid ? "Sí" : "No"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Intentos</dt>
          <dd className="text-on-surface">{event.attemptCount}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Procesado</dt>
          <dd className="text-on-surface">{event.processedAt ? formatDateTime(event.processedAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Error</dt>
          <dd className="text-on-surface">{event.errorMessage ?? "—"}</dd>
        </div>
      </dl>

      <div>
        <p className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Payload (sanitizado)</p>
        <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-surface-container-low p-3 text-caption text-on-surface">
          {JSON.stringify(sanitizedPayload, null, 2)}
        </pre>
      </div>

      {event.processingStatus === "unmatched" && (
        <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-caption text-warning">
          No hay una acción de reintento automático para este evento — no existe un endpoint de reintento real en el
          backend. Si conocés el id real de la suscripción en Mercado Pago, usá el panel de &ldquo;Reconciliar
          suscripción&rdquo; en <a href="/admin/payments" className="underline">/admin/payments</a>.
        </p>
      )}
    </div>
  );
}

function EventsTable({ items }: { items: PaymentProviderEventAdminItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-outline-variant bg-surface md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Fecha</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Proveedor</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Tipo</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Estado</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Intentos</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Error</th>
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
                      <td className="px-6 py-4 text-small text-on-surface">{event.provider}</td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{event.eventType}</td>
                      <td className="px-6 py-4">
                        <ProcessingStatusBadge status={event.processingStatus} />
                      </td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{event.attemptCount}</td>
                      <td className="px-6 py-4 max-w-64 truncate text-small text-error" title={event.errorMessage ?? undefined}>
                        {event.errorMessage ?? "—"}
                      </td>
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
                        <td colSpan={7} className="px-6 py-4">
                          <EventDetail event={event} />
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

      <div className="space-y-3 md:hidden">
        {items.map((event) => {
          const expanded = expandedId === event.id;
          return (
            <div key={event.id} className="rounded-xl border border-outline-variant bg-surface p-4">
              <p className="text-caption text-on-surface-variant">{formatDateTime(event.createdAt)}</p>
              <p className="mt-1 text-small font-medium text-on-surface">{event.eventType}</p>
              <div className="mt-1">
                <ProcessingStatusBadge status={event.processingStatus} />
              </div>
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
                  <EventDetail event={event} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export { EventsTable };
