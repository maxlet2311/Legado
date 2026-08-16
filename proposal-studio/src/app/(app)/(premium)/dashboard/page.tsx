import type { Metadata } from "next";
import Link from "next/link";
import { FileText, BookOpen, BadgeCheck, SlidersHorizontal, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { StatusPill, type ProposalStatus } from "@/components/layout/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { NewProposalDialog } from "@/app/(app)/(premium)/dashboard/new-proposal-dialog";
import { measurePerformance } from "@/lib/utils/performance";

export const metadata: Metadata = {
  title: "Panel de Control — Proposal Studio™",
};

const quickAccess = [
  {
    href: "/proposals",
    icon: FileText,
    title: "Mis propuestas",
    description: "Ver el listado completo de tus propuestas.",
    cta: "Ver todas",
  },
  {
    href: "/library",
    icon: BookOpen,
    title: "Biblioteca",
    description: "Accede a plantillas y activos compartidos.",
    cta: "Explorar",
  },
  {
    href: "/branding",
    icon: BadgeCheck,
    title: "Mi Marca",
    description: "Personaliza logos, colores y firmas.",
    cta: "Configurar",
  },
  {
    href: "/proposals/new",
    icon: SlidersHorizontal,
    title: "Nueva propuesta",
    description: "Empezá una propuesta comercial nueva.",
    cta: "Crear",
  },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardPage() {
  const { user, profile } = await requireActiveUser();
  const supabase = await createClient();

  const [{ data: proposals, error: proposalsError }, { data: clients }] = await measurePerformance(
    "page:dashboard",
    () =>
      Promise.all([
        measurePerformance(
          "db:proposals.recent",
          () =>
            supabase
              .from("proposals")
              .select("id, title, status, updated_at, clients(full_name)")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
              .limit(8),
          { context: "/dashboard" },
        ),
        measurePerformance(
          "db:clients.activeForDialog",
          () => supabase.from("clients").select("id, full_name").eq("user_id", user.id).eq("status", "active"),
          { context: "/dashboard" },
        ),
      ]),
    { context: "/dashboard" },
  );

  // Auditoría UX/UI, hallazgo P1: cuando el perfil no tiene full_name, algunos
  // flujos de alta lo dejan en el email crudo -- mostrarlo tal cual desborda
  // el saludo (Fraunces a tamaño display) en mobile y no es un nombre real.
  // Si full_name parece un email, tratamos el nombre como ausente.
  const rawName = profile?.full_name?.trim();
  const firstName = rawName && !rawName.includes("@") ? rawName.split(" ")[0] : null;
  const totalCount = proposals?.length ?? 0;
  const draftCount = proposals?.filter((p) => p.status === "draft").length ?? 0;
  const completedCount = proposals?.filter((p) => p.status === "completed").length ?? 0;
  // Stitch North Star, ADOPTAR 6 ("Continuar donde quedaste"): `proposals`
  // ya viene ordenado por updated_at desc, así que el primer borrador de esa
  // misma lista es, por definición, el que se tocó más recientemente -- sin
  // query nueva.
  const mostRecentDraft = proposals?.find((p) => p.status === "draft") ?? null;

  return (
    <ContentContainer>
      <section className="flex flex-col gap-5 border-b border-outline-variant pb-10">
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-h1 font-bold tracking-tight text-on-surface break-words sm:text-display">
            {firstName ? `Hola, ${firstName}.` : "Hola."}
          </h2>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            {totalCount > 0
              ? `Tenés ${totalCount} propuesta${totalCount === 1 ? "" : "s"} reciente${totalCount === 1 ? "" : "s"} en seguimiento.`
              : "Todavía no creaste ninguna propuesta. Empezá cargando tu primer cliente."}
          </p>
        </div>
        <div>
          <NewProposalDialog clients={clients ?? []} />
        </div>
      </section>

      {(mostRecentDraft || totalCount > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          {mostRecentDraft ? (
            <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-caption font-bold uppercase tracking-wider text-primary">Continuar donde quedaste</p>
                  <p className="text-h4 font-bold text-on-surface">{mostRecentDraft.title}</p>
                  <p className="text-small text-on-surface-variant">
                    {mostRecentDraft.clients?.full_name ?? "Sin cliente"} · última edición {formatDate(mostRecentDraft.updated_at)}
                  </p>
                </div>
              </div>
              <Button asChild className="shrink-0">
                <Link href={`/proposal/${mostRecentDraft.id}/edit`} prefetch={false}>
                  Continuar propuesta
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          ) : (
            <div />
          )}
          {totalCount > 0 && (
            <div className="flex flex-row gap-4 lg:flex-col">
              <Card className="flex-1 p-5">
                <p className="font-serif text-h2 font-bold text-on-surface">{draftCount}</p>
                <p className="text-small text-on-surface-variant">Propuestas activas en redacción</p>
              </Card>
              <Card className="flex-1 p-5">
                <p className="font-serif text-h2 font-bold text-on-surface">{completedCount}</p>
                <p className="text-small text-on-surface-variant">Finalizadas</p>
              </Card>
            </div>
          )}
        </div>
      )}

      <section>
        <h3 className="mb-6 font-serif text-h3 font-bold text-on-surface">Acceso Rápido</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {quickAccess.map(({ href, icon: Icon, title, description, cta }) => {
            const content = (
              <>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/5 text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="text-h4 font-bold text-on-surface">{title}</h4>
                <p className="mt-2 text-small text-on-surface-variant">{description}</p>
                <div className="mt-6 flex items-center text-caption font-bold uppercase tracking-wider text-primary">
                  {cta} <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </>
            );

            if (!href) {
              return (
                <Card key={title} aria-disabled="true" className="group cursor-not-allowed p-8 opacity-60">
                  {content}
                </Card>
              );
            }

            return (
              <Card asChild key={href} className="group transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/5">
                <Link href={href} className="block p-8">
                  {content}
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant px-8 py-6">
          <h3 className="font-serif text-h3 font-bold text-on-surface">Actividad Reciente</h3>
        </div>

        {proposalsError ? (
          <p className="px-8 py-10 text-small text-error">
            No pudimos cargar tus propuestas. Intentá de nuevo.
          </p>
        ) : !proposals || proposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Todavía no hay propuestas"
            description="Creá tu primera propuesta comercial para verla acá."
            className="border-none"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>Documento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell>
                    <Link href={`/proposal/${proposal.id}`} prefetch={false} className="flex items-center gap-3 group">
                      <FileText className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
                      <span className="text-body font-medium text-on-surface group-hover:text-primary transition-colors">{proposal.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-small text-on-surface">
                    {proposal.clients?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-small text-on-surface-variant sm:table-cell">
                    {formatDate(proposal.updated_at)}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={proposal.status as ProposalStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={proposal.status === "completed" ? `/proposal/${proposal.id}` : `/proposal/${proposal.id}/edit`}
                      prefetch={false}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-caption font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      {proposal.status === "completed" ? "Ver propuesta" : "Editar"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </ContentContainer>
  );
}
