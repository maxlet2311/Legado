import type { Metadata } from "next";
import Link from "next/link";
import { FileText, BookOpen, BadgeCheck, SlidersHorizontal, ChevronRight } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { StatusPill, type ProposalStatus } from "@/components/layout/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { NewProposalDialog } from "@/app/(app)/(premium)/dashboard/new-proposal-dialog";

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

  const [{ data: proposals, error: proposalsError }, { data: clients }] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, title, status, updated_at, clients(full_name)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase.from("clients").select("id, full_name").eq("user_id", user.id).eq("status", "active"),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "asesor";

  return (
    <ContentContainer>
      <section className="relative overflow-hidden rounded-xl bg-primary px-12 py-12 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-primary-container/20 mix-blend-overlay" />
        <div className="relative z-10 flex flex-col justify-center">
          <h2 className="text-h2 font-extrabold tracking-tight text-white">Hola, {firstName}.</h2>
          <p className="mt-4 max-w-2xl text-body-lg text-white/90">
            {proposals && proposals.length > 0
              ? `Tenés ${proposals.length} propuesta${proposals.length === 1 ? "" : "s"} registrada${proposals.length === 1 ? "" : "s"}.`
              : "Todavía no creaste ninguna propuesta. Empezá cargando tu primer cliente."}
          </p>
          <div className="mt-8">
            <NewProposalDialog clients={clients ?? []} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-6 text-h3 font-bold text-on-surface">Acceso Rápido</h3>
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
                <div
                  key={title}
                  aria-disabled="true"
                  className="group cursor-not-allowed rounded-xl border border-outline-variant bg-surface p-8 opacity-60"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className="group rounded-xl border border-outline-variant bg-surface p-8 transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/5"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant px-8 py-6">
          <h3 className="text-h3 font-bold text-on-surface">Actividad Reciente</h3>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Documento
                  </th>
                  <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Cliente
                  </th>
                  <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Fecha
                  </th>
                  <th className="px-8 py-4 text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {proposals.map((proposal) => (
                  <tr key={proposal.id} className="group transition-colors hover:bg-surface-container-low">
                    <td className="px-8 py-5">
                      <Link href={`/proposal/${proposal.id}`} className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-body font-medium text-on-surface">{proposal.title}</span>
                      </Link>
                    </td>
                    <td className="px-8 py-5 text-small text-on-surface">
                      {proposal.clients?.full_name ?? "—"}
                    </td>
                    <td className="px-8 py-5 text-small text-on-surface-variant">
                      {formatDate(proposal.updated_at)}
                    </td>
                    <td className="px-8 py-5">
                      <StatusPill status={proposal.status as ProposalStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ContentContainer>
  );
}
