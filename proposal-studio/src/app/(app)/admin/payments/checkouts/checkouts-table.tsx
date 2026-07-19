"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatDateTime } from "@/app/(app)/admin/memberships/status-badge";
import { sanitizeForDisplay } from "@/lib/admin/sanitize";
import { CheckoutAttemptStatusBadge } from "@/app/(app)/admin/payments/status-badges";
import type { CheckoutAttemptAdminItem } from "@/lib/payments/checkout-attempts-repository";

function CheckoutDetail({ item }: { item: CheckoutAttemptAdminItem }) {
  const sanitizedMetadata = sanitizeForDisplay(item.metadata);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-small sm:grid-cols-2">
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Plan exclusivo (enmascarado)</dt>
          <dd className="font-mono text-on-surface">{item.providerCheckoutPlanIdMasked ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Suscripción (enmascarada)</dt>
          <dd className="font-mono text-on-surface">{item.providerSubscriptionIdMasked ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Pagador (enmascarado)</dt>
          <dd className="font-mono text-on-surface">{item.payerIdMasked ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Vence</dt>
          <dd className="text-on-surface">{item.expiresAt ? formatDateTime(item.expiresAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Completado</dt>
          <dd className="text-on-surface">{item.completedAt ? formatDateTime(item.completedAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Cancelado</dt>
          <dd className="text-on-surface">{item.canceledAt ? formatDateTime(item.canceledAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Membresía</dt>
          <dd className="text-on-surface">
            <Link href={`/admin/memberships/${item.membershipId}`} className="text-primary hover:underline">
              Ver membresía
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-caption font-medium text-on-surface-variant">Usuario vinculado</dt>
          <dd className="text-on-surface">{item.membershipUserId ? "Sí" : "No"}</dd>
        </div>
      </dl>

      <div>
        <p className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Metadata (sanitizada)</p>
        <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-surface-container-low p-3 text-caption text-on-surface">
          {JSON.stringify(sanitizedMetadata, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function CheckoutsTable({ items }: { items: CheckoutAttemptAdminItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-outline-variant bg-surface md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Fecha</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Email</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Plan</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Estado</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Proveedor</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Vence</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {items.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <Fragment key={item.id}>
                    <tr className="hover:bg-surface-container-low">
                      <td className="px-6 py-4 text-small text-on-surface-variant">{formatDateTime(item.createdAt)}</td>
                      <td className="px-6 py-4 text-small font-medium text-on-surface">{item.membershipEmail ?? "—"}</td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{item.planName ?? "—"}</td>
                      <td className="px-6 py-4">
                        <CheckoutAttemptStatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{item.provider}</td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{item.expiresAt ? formatDateTime(item.expiresAt) : "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : item.id)}
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
                          <CheckoutDetail item={item} />
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
        {items.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <div key={item.id} className="rounded-xl border border-outline-variant bg-surface p-4">
              <p className="text-caption text-on-surface-variant">{formatDateTime(item.createdAt)}</p>
              <p className="mt-1 text-small font-medium text-on-surface">{item.membershipEmail ?? "—"}</p>
              <div className="mt-1">
                <CheckoutAttemptStatusBadge status={item.status} />
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : item.id)}
                className="mt-3 inline-flex items-center gap-1 text-small font-medium text-primary hover:underline"
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Detalle
              </button>
              {expanded && (
                <div className="mt-4 border-t border-outline-variant pt-4">
                  <CheckoutDetail item={item} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export { CheckoutsTable };
