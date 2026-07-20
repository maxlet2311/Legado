import type { Metadata } from "next";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { LibraryTabs } from "@/components/library/library-tabs";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";

export const metadata: Metadata = {
  title: "Biblioteca — Proposal Studio™",
};

export default async function LibraryPage() {
  const { user } = await requireActiveUser();
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("full_name", { ascending: true });

  return (
    <ContentContainer>
      <PageHeader
        title="Biblioteca"
        description="Contenido reutilizable: alternativas, beneficios, narrativas y plantillas."
        breadcrumbs={[{ label: "Panel de Control", href: "/dashboard" }, { label: "Biblioteca" }]}
      />

      <LibraryTabs clients={clients ?? []} />
    </ContentContainer>
  );
}
