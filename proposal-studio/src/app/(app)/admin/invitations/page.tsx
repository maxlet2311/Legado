import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ChevronLeft, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listActivationInvitationsForAdmin } from "@/lib/account-activation/admin-queries";
import type { AdminInvitationStatus } from "@/lib/account-activation/types";
import { InvitationFilters } from "@/app/(app)/admin/invitations/invitation-filters";
import { InvitationsTable } from "@/app/(app)/admin/invitations/invitations-table";
import { CreateInvitationDialog } from "@/app/(app)/admin/invitations/create-invitation-dialog";
import { STATUS_LABELS } from "@/app/(app)/admin/invitations/invitation-status-badge";

export const metadata: Metadata = { title: "Invitaciones — Admin" };

const PAGE_SIZE = 20;
const VALID_STATUSES: AdminInvitationStatus[] = ["pending", "used", "revoked", "expired"];

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function single(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function AdminInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const statusParam = single(params.status);
  const search = single(params.q);
  const status = statusParam && (VALID_STATUSES as string[]).includes(statusParam) ? (statusParam as AdminInvitationStatus) : undefined;

  const { items, total, counts } = await listActivationInvitationsForAdmin({
    page,
    pageSize: PAGE_SIZE,
    status,
    search,
  });

  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  function buildPageHref(target: number) {
    const next = new URLSearchParams();
    if (statusParam) next.set("status", statusParam);
    if (search) next.set("q", search);
    next.set("page", String(target));
    return `/admin/invitations?${next.toString()}`;
  }

  return (
    <ContentContainer className="max-w-360">
      <PageHeader
        title="Invitaciones"
        description="Invitaciones de activación de cuenta — emisión, seguimiento y cancelación. Platform Owner."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Invitaciones" }]}
        actions={<CreateInvitationDialog />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VALID_STATUSES.map((s) => (
          <div key={s} className="rounded-xl border border-outline-variant bg-surface p-4">
            <p className="text-caption font-medium text-on-surface-variant">{STATUS_LABELS[s]}</p>
            <p className="mt-1 text-h3 font-bold text-on-surface">{counts[s]}</p>
          </div>
        ))}
      </div>

      <InvitationFilters current={{ status: statusParam, q: search }} />

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No hay invitaciones que coincidan con los filtros"
            description="Probá ajustar los filtros o la búsqueda, o emití una invitación nueva."
          />
        ) : (
          <>
            <InvitationsTable items={items} />

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2">
                <p className="text-small text-on-surface-variant">
                  Página {page} de {totalPages} ({total} invitación{total === 1 ? "" : "es"})
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
