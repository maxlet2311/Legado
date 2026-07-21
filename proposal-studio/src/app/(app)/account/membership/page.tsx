import type { Metadata } from "next";
import Link from "next/link";

import { ContentContainer } from "@/components/layout/content-container";
import { EmptyState } from "@/components/ui/empty-state";
import { evaluateCurrentUserMembership } from "@/lib/memberships/service";
import type { MembershipStatus } from "@/lib/memberships/types";
import { measurePerformance } from "@/lib/utils/performance";

export const metadata: Metadata = {
  title: "Mi Membresía — Proposal Studio™",
};

const STATUS_LABELS: Record<MembershipStatus, string> = {
  pending: "Pendiente de autorización",
  authorized: "Autorizada",
  active: "Activa",
  past_due: "Pago pendiente",
  grace_period: "En período de gracia",
  paused: "Pausada",
  canceled: "Cancelada",
  expired: "Vencida",
  suspended: "Suspendida",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
}

export default async function MembershipPage() {
  const { membership, plan, access } = await measurePerformance(
    "page:account.membership",
    () => evaluateCurrentUserMembership(),
    { context: "/account/membership" },
  );

  if (!membership) {
    return (
      <ContentContainer>
        <div>
          <h1 className="text-h2 font-extrabold tracking-tight text-on-surface">Mi Membresía</h1>
          <p className="mt-2 text-small text-on-surface-variant/70">
            Estado de tu membresía comercial en Proposal Studio™.
          </p>
        </div>
        <EmptyState
          title="Todavía no tenés una membresía"
          description="Cuando se active una membresía asociada a tu cuenta, vas a poder ver acá su plan y estado."
        />
        <div className="text-center">
          <Link href="/planes" className="text-small font-medium text-primary hover:underline">
            Ver planes
          </Link>
        </div>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div>
        <h1 className="text-h2 font-extrabold tracking-tight text-on-surface">Mi Membresía</h1>
        <p className="mt-2 text-small text-on-surface-variant/70">
          Estado de tu membresía comercial en Proposal Studio™.
        </p>
      </div>

      <div className="max-w-md rounded-xl border border-outline-variant/30 bg-surface p-8 shadow-sm">
        <dl className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-small text-on-surface-variant/70">Plan</dt>
            <dd className="text-body font-medium text-on-surface">{plan?.name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-small text-on-surface-variant/70">Estado</dt>
            <dd className="text-body font-medium text-on-surface">{STATUS_LABELS[membership.status]}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-small text-on-surface-variant/70">Inicio del período</dt>
            <dd className="text-body text-on-surface">{formatDate(membership.currentPeriodStart)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-small text-on-surface-variant/70">Vencimiento</dt>
            <dd className="text-body text-on-surface">{formatDate(membership.currentPeriodEnd)}</dd>
          </div>
          {membership.gracePeriodEnd && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-small text-on-surface-variant/70">Período de gracia hasta</dt>
              <dd className="text-body text-on-surface">{formatDate(membership.gracePeriodEnd)}</dd>
            </div>
          )}
        </dl>

        {!access.allowed && (
          <div className="mt-6 space-y-4">
            <p role="status" className="rounded-md bg-error-container px-4 py-3 text-small text-error">
              Tu acceso comercial está limitado ({STATUS_LABELS[membership.status].toLowerCase()}).
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-small">
              {(membership.status === "canceled" || membership.status === "expired" || membership.status === "pending") && (
                <Link href="/planes" className="font-medium text-primary hover:underline">
                  Ver planes
                </Link>
              )}
              <a href="mailto:soporte@proposalstudio.com" className="font-medium text-primary hover:underline">
                Contactar a soporte
              </a>
            </div>
          </div>
        )}
      </div>
    </ContentContainer>
  );
}
