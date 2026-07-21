import type { Metadata } from "next";
import Link from "next/link";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationLink } from "@/components/ui/pagination-link";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { NewClientDialog, EditClientDialog } from "@/app/(app)/(premium)/clients/client-dialogs";

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
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="text-body font-medium text-on-surface">
                      {client.full_name}
                    </TableCell>
                    <TableCell className="text-small text-on-surface-variant">{client.email}</TableCell>
                    <TableCell className="text-small text-on-surface-variant">
                      {client.client_type === "company" ? "Empresa" : "Individual"}
                    </TableCell>
                    <TableCell className="text-small text-on-surface-variant">
                      {client.status === "active" ? "Activo" : "Inactivo"}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditClientDialog client={client} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-small text-on-surface-variant">
                Página {page} de {totalPages} ({count} cliente{count === 1 ? "" : "s"})
              </p>
              <div className="flex gap-2">
                <PaginationLink href={`/clients?page=${page - 1}`} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </PaginationLink>
                <PaginationLink href={`/clients?page=${page + 1}`} disabled={page >= totalPages}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </div>
            </div>
          )}
        </>
      )}
    </ContentContainer>
  );
}
