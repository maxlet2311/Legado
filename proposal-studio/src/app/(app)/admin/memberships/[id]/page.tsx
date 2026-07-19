import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getMembershipById } from "@/lib/memberships/service";
import { getPlanById } from "@/lib/memberships/repository";
import { evaluateMembershipAccess } from "@/lib/memberships/access";
import {
  getMembershipStatusHistory,
  getMembershipProviderEvents,
  getMembershipInvitations,
} from "@/lib/admin/membership-detail";
import { MembershipStatusBadge, formatDateTime, maskExternalId } from "@/app/(app)/admin/memberships/status-badge";
import { MembershipActions } from "@/app/(app)/admin/memberships/[id]/membership-actions";

export const metadata: Metadata = { title: "Ficha de membresía — Admin" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-small text-on-surface-variant">{label}</dt>
      <dd className="text-small font-medium text-on-surface">{value}</dd>
    </div>
  );
}

export default async function MembershipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const membership = await getMembershipById(id);
  if (!membership) notFound();

  const [plan, history, invitations] = await Promise.all([
    getPlanById(membership.planId),
    getMembershipStatusHistory(membership.id),
    getMembershipInvitations(membership.id),
  ]);
  const providerEvents = await getMembershipProviderEvents(membership.provider, membership.providerSubscriptionId);

  const access = evaluateMembershipAccess({
    status: membership.status,
    currentPeriodStart: membership.currentPeriodStart,
    currentPeriodEnd: membership.currentPeriodEnd,
    gracePeriodEnd: membership.gracePeriodEnd,
  });

  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title={membership.email}
        description="Ficha de membresía."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Membresías", href: "/admin/memberships" }, { label: membership.email }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-outline-variant bg-surface p-6">
            <h2 className="mb-2 text-body font-semibold text-on-surface">Información general</h2>
            <dl className="divide-y divide-outline-variant">
              <Field label="Email" value={membership.email} />
              <Field label="Usuario vinculado" value={membership.userId ? membership.userId : "Sin vincular"} />
              <Field label="Plan" value={plan?.name ?? "—"} />
              <Field label="Estado" value={<MembershipStatusBadge status={membership.status} />} />
              <Field
                label="Acceso"
                value={<span className={access.allowed ? "text-success" : "text-error"}>{access.allowed ? "Permitido" : "Bloqueado"} ({access.reason})</span>}
              />
              <Field label="Proveedor" value={membership.provider ?? "—"} />
              <Field label="ID de suscripción" value={maskExternalId(membership.providerSubscriptionId)} />
              <Field label="ID de cliente" value={maskExternalId(membership.providerCustomerId)} />
              <Field label="Inicio de período" value={formatDateTime(membership.currentPeriodStart)} />
              <Field label="Vencimiento" value={formatDateTime(membership.currentPeriodEnd)} />
              <Field label="Gracia hasta" value={formatDateTime(membership.gracePeriodEnd)} />
              <Field label="Cancela al fin del período" value={membership.cancelAtPeriodEnd ? "Sí" : "No"} />
              <Field label="Cancelada el" value={formatDateTime(membership.canceledAt)} />
              <Field label="Último pago" value={formatDateTime(membership.lastPaymentAt)} />
              <Field label="Creada" value={formatDateTime(membership.createdAt)} />
              <Field label="Actualizada" value={formatDateTime(membership.updatedAt)} />
            </dl>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface p-6">
            <h2 className="mb-4 text-body font-semibold text-on-surface">Historial de estados</h2>
            {history.length === 0 ? (
              <p className="text-small text-on-surface-variant">Sin historial.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="text-caption uppercase tracking-wider text-on-surface-variant">
                      <th className="py-2 pr-4">Anterior</th>
                      <th className="py-2 pr-4">Nuevo</th>
                      <th className="py-2 pr-4">Origen</th>
                      <th className="py-2 pr-4">Motivo</th>
                      <th className="py-2 pr-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="py-2 pr-4 text-on-surface-variant">{h.previousStatus ?? "—"}</td>
                        <td className="py-2 pr-4 font-medium text-on-surface">{h.newStatus}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{h.source}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{h.reason ?? "—"}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{formatDateTime(h.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface p-6">
            <h2 className="mb-4 text-body font-semibold text-on-surface">Eventos de proveedor</h2>
            {providerEvents.length === 0 ? (
              <p className="text-small text-on-surface-variant">Sin eventos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="text-caption uppercase tracking-wider text-on-surface-variant">
                      <th className="py-2 pr-4">Tipo</th>
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Estado</th>
                      <th className="py-2 pr-4">Intentos</th>
                      <th className="py-2 pr-4">Fecha</th>
                      <th className="py-2 pr-4">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {providerEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td className="py-2 pr-4 text-on-surface-variant">{ev.eventType}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{maskExternalId(ev.providerResourceId)}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{ev.processingStatus}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{ev.attemptCount}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{formatDateTime(ev.createdAt)}</td>
                        <td className="py-2 pr-4 text-error">{ev.errorMessage ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface p-6">
            <h2 className="mb-4 text-body font-semibold text-on-surface">Invitaciones</h2>
            {invitations.length === 0 ? (
              <p className="text-small text-on-surface-variant">Sin invitaciones emitidas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="text-caption uppercase tracking-wider text-on-surface-variant">
                      <th className="py-2 pr-4">Estado</th>
                      <th className="py-2 pr-4">Emitida</th>
                      <th className="py-2 pr-4">Vence</th>
                      <th className="py-2 pr-4">Usada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {invitations.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2 pr-4 text-on-surface-variant">{inv.status}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{formatDateTime(inv.createdAt)}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{formatDateTime(inv.expiresAt)}</td>
                        <td className="py-2 pr-4 text-on-surface-variant">{inv.usedAt ? formatDateTime(inv.usedAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div>
          <MembershipActions membership={membership} />
        </div>
      </div>
    </ContentContainer>
  );
}
