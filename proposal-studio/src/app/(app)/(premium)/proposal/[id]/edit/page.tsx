import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireActiveUser } from "@/lib/auth/authorization-guards";
import { createClient } from "@/lib/database/server";
import { measurePerformance } from "@/lib/utils/performance";
import { ProposalWizard } from "@/components/wizard/proposal-wizard";
import type {
  WizardAlternative,
  WizardBenefit,
  WizardClient,
  WizardComparison,
  WizardData,
} from "@/types/wizard";

export const metadata: Metadata = {
  title: "Editar propuesta — Proposal Studio™",
};

export default async function ProposalEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await requireActiveUser();
  const supabase = await createClient();

  const [proposalResult, narrativeResult, alternativesResult, benefitsResult, comparisonResult, clientsResult] =
    await measurePerformance(
      "page:proposal.edit",
      () =>
        Promise.all([
      supabase
        .from("proposals")
        .select(
          "id, proposal_number, client_id, title, proposal_type, primary_objective, product, currency, internal_notes, status, created_at, updated_at, revision, duplication_reviewed, clients(id, full_name, company_name, client_type, email, phone)",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("proposal_narratives")
        .select(
          "current_situation, detected_needs, objectives, detected_risks, opportunities, recommended_strategy, updated_at, revision",
        )
        .eq("proposal_id", id)
        .maybeSingle(),
      supabase
        .from("proposal_alternatives")
        .select(
          "id, title, description, category, insurance_company, product_name, currency, monthly_premium, financial_details, display_order, revision",
        )
        .eq("proposal_id", id)
        .order("display_order", { ascending: true }),
      supabase
        .from("proposal_benefits")
        .select("id, title, description, icon, category, display_order, revision")
        .eq("proposal_id", id)
        .order("display_order", { ascending: true }),
      supabase
        .from("proposal_comparisons")
        .select("columns, rows, updated_at, revision")
        .eq("proposal_id", id)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("id, full_name, company_name, client_type, email, phone")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("full_name", { ascending: true }),
        ]),
      { context: "/proposal/[id]/edit" },
    );

  const proposal = proposalResult.data;
  if (!proposal || !proposal.clients) {
    notFound();
  }

  const alternatives: WizardAlternative[] = (alternativesResult.data ?? []).map((row) => {
    const details = (row.financial_details ?? {}) as {
      advantages?: string[];
      disadvantages?: string[];
      notes?: string;
    };
    return {
      client_key: row.id,
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      category: row.category as WizardAlternative["category"],
      insurance_company: row.insurance_company,
      product_name: row.product_name,
      currency: row.currency as WizardAlternative["currency"],
      monthly_premium: row.monthly_premium,
      details: {
        advantages: details.advantages ?? [],
        disadvantages: details.disadvantages ?? [],
        notes: details.notes ?? "",
      },
      display_order: row.display_order,
      revision: row.revision,
    };
  });

  const benefits: WizardBenefit[] = (benefitsResult.data ?? []).map((row) => ({
    client_key: row.id,
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    category: row.category as WizardBenefit["category"],
    display_order: row.display_order,
    revision: row.revision,
  }));

  const comparison: WizardComparison = {
    columns: (comparisonResult.data?.columns as WizardComparison["columns"] | undefined) ?? [],
    rows: (comparisonResult.data?.rows as WizardComparison["rows"] | undefined) ?? [],
    updated_at: comparisonResult.data?.updated_at ?? null,
    revision: comparisonResult.data?.revision ?? null,
  };

  const initialData: WizardData = {
    proposalId: proposal.id,
    advisorName: profile?.full_name ?? "",
    client: {
      id: proposal.clients.id,
      full_name: proposal.clients.full_name,
      company_name: proposal.clients.company_name,
      client_type: proposal.clients.client_type as WizardData["client"]["client_type"],
      email: proposal.clients.email,
      phone: proposal.clients.phone,
    },
    meta: {
      id: proposal.id,
      proposal_number: proposal.proposal_number,
      client_id: proposal.client_id,
      title: proposal.title,
      proposal_type: proposal.proposal_type as WizardData["meta"]["proposal_type"],
      primary_objective: proposal.primary_objective as WizardData["meta"]["primary_objective"],
      product: proposal.product ?? "",
      currency: proposal.currency as WizardData["meta"]["currency"],
      internal_notes: proposal.internal_notes ?? "",
      status: proposal.status as WizardData["meta"]["status"],
      created_at: proposal.created_at,
      updated_at: proposal.updated_at,
      revision: proposal.revision,
      duplication_reviewed: proposal.duplication_reviewed,
    },
    narrative: {
      current_situation: narrativeResult.data?.current_situation ?? "",
      detected_needs: narrativeResult.data?.detected_needs ?? "",
      objectives: narrativeResult.data?.objectives ?? "",
      detected_risks: narrativeResult.data?.detected_risks ?? "",
      opportunities: narrativeResult.data?.opportunities ?? "",
      recommended_strategy: narrativeResult.data?.recommended_strategy ?? "",
      updated_at: narrativeResult.data?.updated_at ?? null,
      revision: narrativeResult.data?.revision ?? null,
    },
    alternatives,
    benefits,
    comparison,
  };

  return (
    <ProposalWizard
      initialData={initialData}
      availableClients={(clientsResult.data ?? []) as WizardClient[]}
    />
  );
}
