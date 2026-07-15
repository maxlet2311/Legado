import type { Metadata } from "next";
import { BookOpen, Star, Search } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Biblioteca — Proposal Studio™",
};

const categories = [
  "Resumen ejecutivo",
  "Estrategia",
  "Beneficio",
  "CTA",
  "Nota legal",
];

const favorites = [
  { title: "Resumen — Protección Familiar", category: "Resumen ejecutivo" },
  { title: "CTA — Retiro complementario", category: "CTA" },
];

export default function LibraryPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Biblioteca"
        description="Contenido reutilizable: narrativas, beneficios y plantillas."
        breadcrumbs={[{ label: "Panel de Control", href: "/dashboard" }, { label: "Biblioteca" }]}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
        <Input placeholder="Buscar en la biblioteca..." className="pl-10" />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Badge key={category} variant="draft">
            {category}
          </Badge>
        ))}
      </div>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-h4 font-bold text-on-surface">
          <Star className="h-4 w-4 text-tertiary" />
          Favoritos
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((item) => (
            <Card key={item.title} className="p-6">
              <p className="text-caption font-semibold uppercase tracking-wide text-on-surface-variant">
                {item.category}
              </p>
              <p className="mt-2 text-body font-medium text-on-surface">{item.title}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-h4 font-bold text-on-surface">Plantillas</h3>
        <EmptyState
          icon={BookOpen}
          title="Sin plantillas todavía"
          description="Las plantillas de sistema y las privadas del asesor se cargarán en el Sprint 2."
        />
      </section>
    </ContentContainer>
  );
}
