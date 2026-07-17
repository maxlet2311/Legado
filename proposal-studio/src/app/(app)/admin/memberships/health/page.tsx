import type { Metadata } from "next";
import Link from "next/link";
import { Download, RefreshCw, AlertTriangle } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { computeMembershipHealth } from "@/lib/admin/health";
import { STATUS_LABELS } from "@/app/(app)/admin/memberships/status-badge";

export const metadata: Metadata = { title: "Salud de membresías — Admin" };
export const dynamic = "force-dynamic";

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" | "error" | "success" }) {
  const toneClass = {
    default: "text-on-surface",
    warning: "text-warning",
    error: "text-error",
    success: "text-success",
  }[tone];

  return (
    <div className="rounded-xl border border-outline-variant bg-surface p-5">
      <p className="text-caption text-on-surface-variant">{label}</p>
      <p className={`mt-1 text-h3 font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function MembershipHealthPage() {
  const report = await computeMembershipHealth();

  return (
    <ContentContainer className="max-w-360">
      <PageHeader
        title="Centro de salud"
        description={`Recalculado al cargar la página — ${new Date(report.generatedAt).toLocaleString("es-AR")}.`}
        breadcrumbs={[{ label: "Admin" }, { label: "Membresías", href: "/admin/memberships" }, { label: "Salud" }]}
        actions={
          <div className="flex gap-2">
            <Link
              href="/admin/memberships/health"
              className="flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-small font-medium text-on-surface hover:border-primary hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" /> Recalcular
            </Link>
            <a
              href="/api/admin/exports/health"
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-small font-medium text-on-primary hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Membresías totales" value={report.totalMemberships} />
        <Metric label="Con acceso" value={report.withAccess} tone="success" />
        <Metric label="Bloqueadas" value={report.blocked} tone={report.blocked > 0 ? "warning" : "default"} />
        <Metric label="Sin usuario vinculado" value={report.withoutUser} />
        <Metric label="Inconsistentes" value={report.inconsistentCount} tone={report.inconsistentCount > 0 ? "error" : "success"} />
        <Metric label="Eventos de pago fallidos" value={report.failedProviderEvents} tone={report.failedProviderEvents > 0 ? "error" : "success"} />
        <Metric label="Invitaciones pendientes" value={report.pendingInvitations} />
        <Metric label="Invitaciones vencidas" value={report.expiredInvitations} tone={report.expiredInvitations > 0 ? "warning" : "default"} />
        <Metric label="Usuarios activos sin membresía" value={report.activeUsersWithoutMembership} />
        <Metric label="Usuarios OAuth huérfanos" value={report.orphanOAuthUsers} tone={report.orphanOAuthUsers > 0 ? "error" : "success"} />
        <Metric label="Planes incompletos (activos sin proveedor)" value={report.incompletePlans} tone={report.incompletePlans > 0 ? "warning" : "default"} />
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface p-6">
        <h2 className="mb-4 text-body font-semibold text-on-surface">Por estado</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(report.byStatus).map(([status, count]) => (
            <div key={status} className="rounded-lg bg-surface-container-low p-3">
              <p className="text-caption text-on-surface-variant">{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</p>
              <p className="text-h4 font-semibold text-on-surface">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {report.inconsistentMembershipIds.length > 0 && (
        <div className="rounded-xl border border-error/30 bg-error-container/40 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-body font-semibold text-error">
            <AlertTriangle className="h-4 w-4" /> Membresías con inconsistencia detectada
          </h2>
          <p className="mb-3 text-small text-on-surface-variant">
            Estado vigente sin fecha de vencimiento, o en gracia sin fecha de fin de gracia. Revisar manualmente — no se reparan automáticamente.
          </p>
          <ul className="space-y-1 text-small">
            {report.inconsistentMembershipIds.slice(0, 50).map((id) => (
              <li key={id}>
                <Link href={`/admin/memberships/${id}`} className="text-primary hover:underline">
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-caption text-on-surface-variant">
        Reparaciones masivas y sincronización controlada por lote no están implementadas todavía — usar la reconciliación
        individual desde la ficha de cada membresía (<Link href="/admin/memberships" className="text-primary hover:underline">listado</Link>).
      </p>
    </ContentContainer>
  );
}
