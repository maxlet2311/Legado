"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

import { InvitationStatusBadge } from "@/app/(app)/admin/invitations/invitation-status-badge";
import { InvitationRowActions } from "@/app/(app)/admin/invitations/invitation-row-actions";
import { formatDateTime } from "@/app/(app)/admin/memberships/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
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
            <Link href={`/admin/memberships/${item.membershipId}`} className="text-primary hover:underline">
              {item.membershipEmail ?? item.membershipId} ({item.membershipStatus ?? "—"})
            </Link>
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
      <Card className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creada</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Creador</TableHead>
              <TableHead />
              <TableHead />
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const expanded = expandedId === item.id;
              return (
                <Fragment key={item.id}>
                  <TableRow>
                    <TableCell className="text-small font-medium text-on-surface">{item.email}</TableCell>
                    <TableCell>
                      <InvitationStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-small text-on-surface-variant">{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell className="text-small text-on-surface-variant">{formatDateTime(item.expiresAt)}</TableCell>
                    <TableCell className="text-small text-on-surface-variant">{item.createdByName ?? "—"}</TableCell>
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
                    <TableCell className="text-right">
                      <InvitationRowActions id={item.id} status={item.status} />
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow interactive={false} className="bg-surface-container-lowest">
                      <TableCell colSpan={7}>
                        <InvitationDetail item={item} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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
