import type { Metadata } from "next";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { WizardStepper } from "@/components/layout/wizard-stepper";
import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { NewProposalClientStep } from "@/app/(app)/(premium)/proposals/new/new-proposal-client-step";
import type { WizardClient } from "@/types/wizard";

export const metadata: Metadata = {
  title: "Nueva Propuesta — Proposal Studio™",
};

const wizardSteps = [
  { label: "Cliente" },
  { label: "Información" },
  { label: "Diagnóstico" },
  { label: "Alternativas" },
  { label: "Recomendación" },
  { label: "Beneficios" },
  { label: "Comparativa" },
  { label: "Resumen" },
];

export default async function NewProposalPage() {
  const { user } = await requireActiveUser();
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, company_name, client_type, email, phone")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("full_name", { ascending: true });

  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title="Nueva propuesta"
        description="Paso 1 — Elegí o creá el cliente para esta propuesta."
        breadcrumbs={[
          { label: "Panel de Control", href: "/dashboard" },
          { label: "Nueva propuesta" },
        ]}
      />

      <div className="mb-10">
        <WizardStepper steps={wizardSteps} currentStep={0} />
      </div>

      <NewProposalClientStep initialClients={(clients ?? []) as WizardClient[]} />
    </ContentContainer>
  );
}
