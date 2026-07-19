import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listCheckoutAttemptsForAdmin, countExpiredPendingCheckoutAttempts } from "@/lib/payments/checkout-attempts-repository";
import { listAllPlans } from "@/lib/memberships/repository";
import { single, parsePage, parseEnumParam, parseTriState, parseIsoDate } from "@/lib/payments/admin-filters";
import { CheckoutFilters } from "@/app/(app)/admin/payments/checkouts/checkout-filters";
import { CheckoutsTable } from "@/app/(app)/admin/payments/checkouts/checkouts-table";
import { CleanupPanel } from "@/app/(app)/admin/payments/checkouts/cleanup-panel";

export const metadata: Metadata = { title: "Checkouts — Admin" };

const PAGE_SIZE = 25;
const CHECKOUT_STATUSES = ["creating", "ready", "redirected", "matched", "completed", "failed", "expired", "canceled"] as const;

export default async function AdminPaymentCheckoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const status = parseEnumParam(params.status, CHECKOUT_STATUSES);
  const provider = single(params.provider);
  const planId = single(params.plan);
  const linked = parseTriState(params.linked);
  const email = single(params.q);
  const dateFrom = parseIsoDate(params.from);
  const dateTo = parseIsoDate(params.to);

  const [plans, { items, total }, expiredPending] = await Promise.all([
    listAllPlans(),
    listCheckoutAttemptsForAdmin({
      page,
      pageSize: PAGE_SIZE,
      status,
      provider,
      planId,
      linked,
      email,
      dateFrom,
      dateTo,
    }),
    countExpiredPendingCheckoutAttempts(),
  ]);

  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  function buildPageHref(target: number) {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (provider) next.set("provider", provider);
    if (planId) next.set("plan", planId);
    if (linked !== undefined) next.set("linked", linked ? "yes" : "no");
    if (email) next.set("q", email);
    if (params.from) next.set("from", single(params.from) ?? "");
    if (params.to) next.set("to", single(params.to) ?? "");
    next.set("page", String(target));
    return `/admin/payments/checkouts?${next.toString()}`;
  }

  return (
    <ContentContainer className="max-w-360">
      <PageHeader
        title="Checkouts"
        description="Intentos de checkout de Mercado Pago (`membership_checkout_attempts`) — historial, vinculación y limpieza de vencidos."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Pagos", href: "/admin/payments" }, { label: "Checkouts" }]}
      />

      <CleanupPanel expiredPendingCount={expiredPending} />

      <div className="mt-6">
        <CheckoutFilters
          plans={plans.map((p) => ({ id: p.id, name: p.name }))}
          current={{ status, provider, plan: planId, linked, q: email, from: single(params.from), to: single(params.to) }}
        />
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No hay intentos de checkout que coincidan con los filtros"
            description="Probá ajustar los filtros o la búsqueda por email."
          />
        ) : (
          <>
            <CheckoutsTable items={items} />

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2">
                <p className="text-small text-on-surface-variant">
                  Página {page} de {totalPages} ({total} intento{total === 1 ? "" : "s"})
                </p>
                <div className="flex gap-2">
                  <Link
                    href={page > 1 ? buildPageHref(page - 1) : "#"}
                    aria-disabled={page <= 1}
                    className={`flex items-center gap-1 rounded-md border border-outline-variant px-4 py-2 text-small font-medium ${
                      page <= 1 ? "pointer-events-none opacity-40" : "text-on-surface hover:border-primary hover:text-primary"
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Link>
                  <Link
                    href={page < totalPages ? buildPageHref(page + 1) : "#"}
                    aria-disabled={page >= totalPages}
                    className={`flex items-center gap-1 rounded-md border border-outline-variant px-4 py-2 text-small font-medium ${
                      page >= totalPages ? "pointer-events-none opacity-40" : "text-on-surface hover:border-primary hover:text-primary"
                    }`}
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ContentContainer>
  );
}
