import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  BookOpen,
  BadgeCheck,
  SlidersHorizontal,
  ChevronRight,
  Clock3,
  UsersRound,
  CircleCheckBig,
  PenLine,
} from "lucide-react";

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
  const activeClientCount = clients?.length ?? 0;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  // Stitch North Star, ADOPTAR 6 ("Continuar donde quedaste"): `proposals`
  // ya viene ordenado por updated_at desc, así que el primer borrador de esa
  // misma lista es, por definición, el que se tocó más recientemente -- sin
  // query nueva.
  const mostRecentDraft = proposals?.find((p) => p.status === "draft") ?? null;

  const metrics = [
    { label: "Propuestas recientes", value: totalCount, icon: FileText, detail: "Últimas actualizaciones", tone: "text-primary bg-primary/8" },
    { label: "En redacción", value: draftCount, icon: PenLine, detail: "Borradores activos", tone: "text-tertiary bg-tertiary/8" },
    { label: "Finalizadas", value: completedCount, icon: CircleCheckBig, detail: `${completionRate}% del total reciente`, tone: "text-secondary bg-secondary/8" },
    { label: "Clientes activos", value: activeClientCount, icon: UsersRound, detail: "Disponibles para proponer", tone: "text-on-primary-fixed-variant bg-primary-fixed/55" },
  ];

  return (
    <ContentContainer className="max-w-[1560px] space-y-7">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-caption font-bold uppercase tracking-[0.16em] text-primary">Resumen comercial</p>
          <h2 className="break-words font-serif text-h1 font-bold tracking-tight text-on-surface sm:text-[2.55rem] sm:leading-tight">
            {firstName ? `Buen día, ${firstName}.` : "Buen día."}
          </h2>
          <p className="mt-2 max-w-2xl text-body text-on-surface-variant">
            {totalCount > 0
              ? "Tu cartera reciente, el trabajo pendiente y los accesos principales en un solo lugar."
              : "Prepará tu primera propuesta y empezá a construir una cartera comercial ordenada."}
          </p>
        </div>
        <div className="shrink-0">
          <NewProposalDialog clients={clients ?? []} />
        </div>
      </section>

      <section aria-label="Indicadores principales" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, detail, tone }) => (
          <Card key={label} className="overflow-hidden border-fine p-5 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 font-serif text-3xl font-bold leading-none text-on-surface">{value}</p>
            <p className="mt-2 text-small font-semibold text-on-surface">{label}</p>
            <p className="mt-0.5 hidden text-caption text-on-surface-variant sm:block">{detail}</p>
          </Card>
        ))}
      </section>

      {mostRecentDraft && (
        <Card className="relative overflow-hidden border-primary/20 bg-surface shadow-2xs">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-xs">
                <Clock3 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Continuar donde quedaste</p>
                <p className="mt-1 truncate font-serif text-xl font-bold text-on-surface">{mostRecentDraft.title}</p>
                <p className="mt-0.5 text-small text-on-surface-variant">
                  {mostRecentDraft.clients?.full_name ?? "Sin cliente"} · editada {formatDate(mostRecentDraft.updated_at)}
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0 shadow-xs">
              <Link href={`/proposal/${mostRecentDraft.id}/edit`} prefetch={false}>
                Continuar propuesta
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 overflow-hidden border-fine shadow-2xs">
          <div className="flex items-center justify-between border-b border-fine px-6 py-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-on-surface tracking-tight">Actividad reciente</h3>
              <p className="mt-0.5 text-caption text-on-surface-variant">Últimos documentos modificados</p>
            </div>
            <Link href="/proposals" className="inline-flex items-center gap-1 text-small font-semibold text-primary hover:underline">
              Ver todas <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {proposalsError ? (
            <p className="px-6 py-10 text-small text-error">No pudimos cargar tus propuestas. Intentá de nuevo.</p>
          ) : !proposals || proposals.length === 0 ? (
            <EmptyState icon={FileText} title="Todavía no hay propuestas" description="Creá tu primera propuesta comercial para verla acá." className="border-none" />
          ) : (
            <Table>
              <TableHeader>
                <TableHeaderRow className="bg-surface-container-low/65">
                  <TableHead className="px-5 py-3 sm:px-6">Documento</TableHead>
                  <TableHead className="hidden px-5 py-3 md:table-cell">Cliente</TableHead>
                  <TableHead className="hidden px-5 py-3 sm:table-cell">Fecha</TableHead>
                  <TableHead className="px-5 py-3">Estado</TableHead>
                  <TableHead className="px-5 py-3 text-right">Acción</TableHead>
                </TableHeaderRow>
              </TableHeader>
              <TableBody className="divide-outline-variant/60">
                {proposals.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell className="px-5 py-4 sm:px-6">
                      <Link href={`/proposal/${proposal.id}`} prefetch={false} className="group flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/7 text-primary">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="max-w-[180px] truncate text-small font-semibold text-on-surface transition-colors group-hover:text-primary sm:max-w-none">{proposal.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden px-5 py-4 text-small text-on-surface md:table-cell">{proposal.clients?.full_name ?? "—"}</TableCell>
                    <TableCell className="hidden px-5 py-4 text-small text-on-surface-variant sm:table-cell">{formatDate(proposal.updated_at)}</TableCell>
                    <TableCell className="px-5 py-4"><StatusPill status={proposal.status as ProposalStatus} /></TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <Link
                        href={proposal.status === "completed" ? `/proposal/${proposal.id}` : `/proposal/${proposal.id}/edit`}
                        prefetch={false}
                        aria-label={`${proposal.status === "completed" ? "Ver" : "Editar"} ${proposal.title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <aside className="space-y-6">
          <Card className="overflow-hidden border-fine shadow-2xs">
            <div className="border-b border-fine px-5 py-4">
              <h3 className="font-serif text-base font-bold text-on-surface tracking-tight">Accesos directos</h3>
              <p className="mt-0.5 text-caption text-on-surface-variant">Herramientas de trabajo</p>
            </div>
            <div className="divide-y divide-border-fine p-2">
              {quickAccess.map(({ href, icon: Icon, title, description, cta }) => (
                <Link key={href} href={href} className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-container-low">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-semibold text-on-surface">{title}</span>
                    <span className="block truncate text-caption text-on-surface-variant">{description}</span>
                  </span>
                  <span className="sr-only">{cta}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-outline transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </Card>

          {totalCount > 0 && (
            <Card className="border-fine p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-small font-semibold text-on-surface">Estado de la cartera</p>
                  <p className="mt-0.5 text-caption text-on-surface-variant">Propuestas recientes</p>
                </div>
                <p className="font-serif text-2xl font-bold text-secondary">{completionRate}%</p>
              </div>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-surface-container-high" aria-label={`${completionRate}% finalizadas`}>
                <div className="bg-secondary" style={{ width: `${completionRate}%` }} />
              </div>
              <div className="mt-4 flex items-center justify-between text-caption">
                <span className="flex items-center gap-1.5 text-on-surface-variant"><span className="h-2 w-2 rounded-full bg-tertiary" />{draftCount} en redacción</span>
                <span className="flex items-center gap-1.5 text-on-surface-variant"><span className="h-2 w-2 rounded-full bg-secondary" />{completedCount} finalizadas</span>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </ContentContainer>
  );
}
