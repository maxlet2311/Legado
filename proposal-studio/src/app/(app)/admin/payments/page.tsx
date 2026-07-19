import type { Metadata } from "next";
import { AlertTriangle, Ban, Clock, Webhook } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { formatDateTime } from "@/app/(app)/admin/memberships/status-badge";
import { countPaymentProviderEventsByStatus } from "@/lib/payments/webhook-events";
import { countExpiredPendingCheckoutAttempts, countExpiredCheckoutAttempts } from "@/lib/payments/checkout-attempts-repository";
import { listAdminAuditEvents } from "@/lib/admin/audit-queries";
import { MetricCard } from "@/app/(app)/admin/payments/metric-card";
import { ReconcilePanel } from "@/app/(app)/admin/payments/reconcile-panel";

export const metadata: Metadata = { title: "Pagos — Admin" };

export default async function AdminPaymentsPage() {
  const [unmatchedEvents, failedEvents, expiredPendingCheckouts, expiredCheckouts, lastReconciliation] = await Promise.all([
    countPaymentProviderEventsByStatus("unmatched"),
    countPaymentProviderEventsByStatus("failed"),
    countExpiredPendingCheckoutAttempts(),
    countExpiredCheckoutAttempts(),
    listAdminAuditEvents({ page: 1, pageSize: 1, action: "payments.reconcile_subscription" }),
  ]);

  const lastReconciliationEvent = lastReconciliation.items[0] ?? null;

  return (
    <ContentContainer className="max-w-360">
      <PageHeader
        title="Pagos"
        description="Reconciliación con Mercado Pago, eventos de webhook y limpieza de intentos de checkout — Platform Owner."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Pagos" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Webhook}
          label="Eventos no asociados"
          value={unmatchedEvents}
          description="Webhooks firmados sin correlación a ningún checkout"
          href="/admin/payments/events?status=unmatched"
          tone={unmatchedEvents > 0 ? "warning" : "default"}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Eventos fallidos"
          value={failedEvents}
          description="Errores de procesamiento del webhook"
          href="/admin/payments/events?status=failed"
          tone={failedEvents > 0 ? "error" : "default"}
        />
        <MetricCard
          icon={Clock}
          label="Checkouts vencidos sin limpiar"
          value={expiredPendingCheckouts}
          description="Intentos abiertos cuyo plazo ya pasó"
          href="/admin/payments/checkouts?status=ready"
          tone={expiredPendingCheckouts > 0 ? "warning" : "default"}
        />
        <MetricCard
          icon={Ban}
          label="Checkouts ya expirados"
          value={expiredCheckouts}
          description="Ya marcados como `expired` por la limpieza"
          href="/admin/payments/checkouts?status=expired"
        />
      </div>

      <p className="mt-4 text-caption text-on-surface-variant">
        Última reconciliación manual registrada:{" "}
        {lastReconciliationEvent ? formatDateTime(lastReconciliationEvent.createdAt) : "sin registros todavía"}
        {lastReconciliationEvent?.actorName ? ` (por ${lastReconciliationEvent.actorName})` : ""}
      </p>

      <div className="mt-8">
        <ReconcilePanel />
      </div>

      <p className="mt-6 text-caption text-on-surface-variant">
        Para el detalle completo de eventos de webhook, ver{" "}
        <a href="/admin/payments/events" className="font-medium text-primary hover:underline">
          Eventos
        </a>
        . Para gestionar y limpiar intentos de checkout vencidos, ver{" "}
        <a href="/admin/payments/checkouts" className="font-medium text-primary hover:underline">
          Checkouts
        </a>
        .
      </p>
    </ContentContainer>
  );
}
