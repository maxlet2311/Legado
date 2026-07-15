import type { Metadata } from "next";
import { Heart, PiggyBank, Landmark, Building2, Users, Award, Sparkles } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { WizardStepper } from "@/components/layout/wizard-stepper";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Nueva Propuesta — Proposal Studio™",
};

const wizardSteps = [
  { label: "Objetivo" },
  { label: "Contexto" },
  { label: "Diagnóstico" },
  { label: "Estrategia" },
  { label: "Comparativa" },
  { label: "Próximos pasos" },
  { label: "Vista previa" },
];

const objectives = [
  { icon: Heart, title: "Proteger a su familia", description: "Vida, invalidez y protección de ingresos." },
  { icon: PiggyBank, title: "Construir ahorro", description: "Ahorro programado y fondos de largo plazo." },
  { icon: Landmark, title: "Planificar su retiro", description: "Retiro complementario e independencia económica." },
  { icon: Building2, title: "Proteger su empresa", description: "Persona clave y protección patrimonial." },
  { icon: Users, title: "Proteger a los socios", description: "Resguardo societario y continuidad." },
  { icon: Award, title: "Fidelizar colaboradores", description: "Beneficios corporativos y retención." },
  { icon: Sparkles, title: "Estrategia personalizada", description: "Construir la propuesta desde cero." },
];

export default function NewProposalPage() {
  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title="Nueva propuesta"
        description="Fase 1 — Descubrimiento: comprendé qué quiere lograr el cliente."
        breadcrumbs={[
          { label: "Panel de Control", href: "/dashboard" },
          { label: "Nueva propuesta" },
        ]}
      />

      <div className="mb-10">
        <WizardStepper steps={wizardSteps} currentStep={0} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {objectives.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="cursor-pointer p-8 transition-all hover:border-primary hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/5 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-h4 font-semibold text-on-surface">{title}</h3>
            <p className="mt-2 text-small text-on-surface-variant">{description}</p>
          </Card>
        ))}
      </div>

      <p className="mt-10 text-small text-on-surface-variant">
        La selección de objetivo y el resto del flujo del wizard se implementan en el Sprint 2.
      </p>
    </ContentContainer>
  );
}
