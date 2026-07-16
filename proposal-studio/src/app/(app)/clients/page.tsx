import type { Metadata } from "next";
import Link from "next/link";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { NewClientDialog, EditClientDialog } from "@/app/(app)/clients/client-dialogs";

export const metadata: Metadata = {
  title: "Clientes — Proposal Studio™",
};

const PAGE_SIZE = 20;

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { user } = await requireActiveUser();
  const supabase = await createClient();

  const {
    data: clients,
    error,
    count,
  } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, client_type, company_name, status", { count: "exact" })
    .eq("user_id", user.id)
    .order("full_name", { ascending: true })
    .range(from, to);

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;
  const invalidPage = page > totalPages && count !== null && count > 0;

  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title="Clientes"
        description="Gestioná los destinatarios de tus propuestas comerciales."
        breadcrumbs={[{ label: "Panel de Control", href: "/dashboard" }, { label: "Clientes" }]}
        actions={<NewClientDialog />}
      />

      {error ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-small text-error">
          No pudimos cargar tus clientes. Intentá de nuevo.
        </p>
      ) : invalidPage ? (
        <p className="rounded-md bg-error-container px-4 py-3 text-small text-error">
          La página solicitada no existe.{" "}
          <Link href="/clients" className="underline">
            Volver a la primera página
          </Link>
          .
        </p>
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no cargaste clientes"
          description="Creá tu primer cliente para poder generar una propuesta comercial."
          action={<NewClientDialog />}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                      Nombre
                    </th>
                    <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                      Email
                    </th>
                    <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                      Tipo
                    </th>
                    <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                      Estado
                    </th>
                    <th className="px-8 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-surface-container-low">
                      <td className="px-8 py-5 text-body font-medium text-on-surface">
                        {client.full_name}
                      </td>
                      <td className="px-8 py-5 text-small text-on-surface-variant">{client.email}</td>
                      <td className="px-8 py-5 text-small text-on-surface-variant">
                        {client.client_type === "company" ? "Empresa" : "Individual"}
                      </td>
                      <td className="px-8 py-5 text-small text-on-surface-variant">
                        {client.status === "active" ? "Activo" : "Inactivo"}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <EditClientDialog client={client} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-small text-on-surface-variant">
                Página {page} de {totalPages} ({count} cliente{count === 1 ? "" : "s"})
              </p>
              <div className="flex gap-2">
                <Link
                  href={page > 1 ? `/clients?page=${page - 1}` : "#"}
                  aria-disabled={page <= 1}
                  className={`flex items-center gap-1 rounded-md border border-outline-variant px-4 py-2 text-small font-medium ${
                    page <= 1
                      ? "pointer-events-none opacity-40"
                      : "text-on-surface hover:border-primary hover:text-primary"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Link>
                <Link
                  href={page < totalPages ? `/clients?page=${page + 1}` : "#"}
                  aria-disabled={page >= totalPages}
                  className={`flex items-center gap-1 rounded-md border border-outline-variant px-4 py-2 text-small font-medium ${
                    page >= totalPages
                      ? "pointer-events-none opacity-40"
                      : "text-on-surface hover:border-primary hover:text-primary"
                  }`}
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </ContentContainer>
  );
}
