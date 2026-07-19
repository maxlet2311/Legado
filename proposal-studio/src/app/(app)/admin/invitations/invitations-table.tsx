"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { InvitationStatusBadge } from "@/app/(app)/admin/invitations/invitation-status-badge";
import { InvitationRowActions } from "@/app/(app)/admin/invitations/invitation-row-actions";
import { formatDateTime } from "@/app/(app)/admin/memberships/status-badge";
import type { AdminInvitationListItem } from "@/lib/account-activation/admin-queries";

function InvitationDetail({ item }: { item: AdminInvitationListItem }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-small sm:grid-cols-2">
      <div>
        <dt className="text-caption font-medium text-on-surface-variant">ID</dt>
        <dd className="text-on-surface">{item.id}</dd>
      </div>
      <div>
        <dt className="text-caption font-medium text-on-surface-variant">Creada por</dt>
        <dd className="text-on-surface">{item.createdByName ?? "Sistema / desconocido"}</dd>
      </div>
      <div>
        <dt className="text-caption font-medium text-on-surface-variant">Usada</dt>
        <dd className="text-on-surface">{formatDateTime(item.usedAt)}</dd>
      </div>
      <div>
        <dt className="text-caption font-medium text-on-surface-variant">Membresía asociada</dt>
        <dd className="text-on-surface">
          {item.membershipId ? (
            <a href={`/admin/memberships/${item.membershipId}`} className="text-primary hover:underline">
              {item.membershipEmail ?? item.membershipId} ({item.membershipStatus ?? "—"})
            </a>
          ) : (
            "Invitación administrativa directa (sin membresía)"
          )}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-caption font-medium text-on-surface-variant">Estado de envío de email</dt>
        <dd className="text-on-surface">
          No se persiste por invitación — solo se conoce en el momento de la creación o el reenvío (mostrado como
          aviso en pantalla en ese momento). Pendiente documentado: agregar una columna de entrega si se necesita
          historial.
        </dd>
      </div>
    </dl>
  );
}

function InvitationsTable({ items }: { items: AdminInvitationListItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-xl border border-outline-variant bg-surface md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Email</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Estado</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Creada</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Expira</th>
                <th className="px-6 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Creador</th>
                <th className="px-6 py-4" />
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {items.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <Fragment key={item.id}>
                    <tr className="hover:bg-surface-container-low">
                      <td className="px-6 py-4 text-small font-medium text-on-surface">{item.email}</td>
                      <td className="px-6 py-4">
                        <InvitationStatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{formatDateTime(item.createdAt)}</td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{formatDateTime(item.expiresAt)}</td>
                      <td className="px-6 py-4 text-small text-on-surface-variant">{item.createdByName ?? "—"}</td>
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
                      <td className="px-6 py-4 text-right">
                        <InvitationRowActions id={item.id} status={item.status} />
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-surface-container-lowest">
                        <td colSpan={7} className="px-6 py-4">
                          <InvitationDetail item={item} />
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
        {items.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <div key={item.id} className="rounded-xl border border-outline-variant bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-small font-medium text-on-surface">{item.email}</p>
                  <p className="mt-1 text-caption text-on-surface-variant">Creada {formatDateTime(item.createdAt)}</p>
                </div>
                <InvitationStatusBadge status={item.status} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline"
                  aria-expanded={expanded}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Detalle
                </button>
                <InvitationRowActions id={item.id} status={item.status} />
              </div>
              {expanded && (
                <div className="mt-4 border-t border-outline-variant pt-4">
                  <InvitationDetail item={item} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export { InvitationsTable };
