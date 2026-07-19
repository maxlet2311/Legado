import type { Metadata } from "next";
import Link from "next/link";
import { Webhook, ChevronLeft, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listPaymentProviderEvents } from "@/lib/payments/webhook-events";
import { single, parsePage, parseEnumParam, parseTriState, parseIsoDate } from "@/lib/payments/admin-filters";
import { EventFilters } from "@/app/(app)/admin/payments/events/event-filters";
import { EventsTable } from "@/app/(app)/admin/payments/events/events-table";

export const metadata: Metadata = { title: "Eventos de pago — Admin" };

const PAGE_SIZE = 25;
const PROCESSING_STATUSES = ["received", "processing", "processed", "ignored", "failed", "unmatched"] as const;

export default async function AdminPaymentEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const provider = single(params.provider);
  const eventType = single(params.type);
  const status = parseEnumParam(params.status, PROCESSING_STATUSES);
  const hasError = parseTriState(params.hasError);
  const dateFrom = parseIsoDate(params.from);
  const dateTo = parseIsoDate(params.to);
  const eventId = single(params.eventId);

  const { items, total } = await listPaymentProviderEvents({
    page,
    pageSize: PAGE_SIZE,
    provider,
    eventType,
    processingStatus: status,
    hasError,
    dateFrom,
    dateTo,
    eventId,
  });

  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  function buildPageHref(target: number) {
    const next = new URLSearchParams();
    if (provider) next.set("provider", provider);
    if (eventType) next.set("type", eventType);
    if (status) next.set("status", status);
    if (hasError !== undefined) next.set("hasError", hasError ? "yes" : "no");
    if (params.from) next.set("from", single(params.from) ?? "");
    if (params.to) next.set("to", single(params.to) ?? "");
    if (eventId) next.set("eventId", eventId);
    next.set("page", String(target));
    return `/admin/payments/events?${next.toString()}`;
  }

  return (
    <ContentContainer className="max-w-360">
      <PageHeader
        title="Eventos de pago"
        description="Bitácora de webhooks de Mercado Pago (`payment_provider_events`). Nunca se muestra el id externo del recurso completo."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Pagos", href: "/admin/payments" }, { label: "Eventos" }]}
      />

      <EventFilters current={{ provider, type: eventType, status, hasError, from: single(params.from), to: single(params.to), eventId }} />

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            icon={Webhook}
            title="No hay eventos que coincidan con los filtros"
            description="Probá ajustar los filtros o el rango de fechas."
          />
        ) : (
          <>
            <EventsTable items={items} />

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2">
                <p className="text-small text-on-surface-variant">
                  Página {page} de {totalPages} ({total} evento{total === 1 ? "" : "s"})
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
