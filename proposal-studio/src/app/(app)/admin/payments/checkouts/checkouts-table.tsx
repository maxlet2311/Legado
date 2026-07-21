"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatDateTime } from "@/app/(app)/admin/memberships/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
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
      <Card className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead />
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const expanded = expandedId === item.id;
              return (
                <Fragment key={item.id}>
                  <TableRow>
                    <TableCell className="text-small text-on-surface-variant">{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell className="text-small font-medium text-on-surface">{item.membershipEmail ?? "—"}</TableCell>
                    <TableCell className="text-small text-on-surface-variant">{item.planName ?? "—"}</TableCell>
                    <TableCell>
                      <CheckoutAttemptStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-small text-on-surface-variant">{item.provider}</TableCell>
                    <TableCell className="text-small text-on-surface-variant">{item.expiresAt ? formatDateTime(item.expiresAt) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                        className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline"
                        aria-expanded={expanded}
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Detalle
                      </button>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow interactive={false} className="bg-surface-container-lowest">
                      <TableCell colSpan={7}>
                        <CheckoutDetail item={item} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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
