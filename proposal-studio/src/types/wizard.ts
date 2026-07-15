export interface WizardClient {
  id: string;
  full_name: string;
  company_name: string | null;
  client_type: "individual" | "company";
  email: string;
  phone: string | null;
}

export interface WizardProposalMeta {
  id: string;
  proposal_number: string;
  client_id: string;
  title: string;
  proposal_type: "individual" | "corporate";
  primary_objective:
    | "protect_family"
    | "build_savings"
    | "retirement"
    | "business_protection"
    | "partners_protection"
    | "employee_retention"
    | "custom";
  product: string;
  currency: "ARS" | "USD" | "EUR";
  internal_notes: string;
  status: "draft" | "completed" | "exported" | "archived";
  created_at: string;
  updated_at: string;
}

export interface WizardNarrative {
  current_situation: string;
  detected_needs: string;
  objectives: string;
  detected_risks: string;
  opportunities: string;
  recommended_strategy: string;
  updated_at: string | null;
}

export type AlternativeCategory =
  | "protection"
  | "savings"
  | "life_with_savings"
  | "retirement"
  | "business";

export interface WizardAlternativeDetails {
  advantages: string[];
  disadvantages: string[];
  notes: string;
}

export interface WizardAlternative {
  id: string | null;
  title: string;
  description: string;
  category: AlternativeCategory;
  insurance_company: string;
  product_name: string;
  currency: "ARS" | "USD" | "EUR";
  monthly_premium: number | null;
  details: WizardAlternativeDetails;
  display_order: number;
}

export type BenefitCategory =
  | "family"
  | "retirement"
  | "tax"
  | "business"
  | "legal"
  | "financial"
  | "health"
  | "succession";

export interface WizardBenefit {
  id: string | null;
  title: string;
  description: string;
  icon: string;
  category: BenefitCategory;
  display_order: number;
}

export interface WizardComparisonColumn {
  id: string;
  label: string;
}

export interface WizardComparisonRow {
  id: string;
  label: string;
  values: Record<string, string>;
}

export interface WizardComparison {
  columns: WizardComparisonColumn[];
  rows: WizardComparisonRow[];
  updated_at: string | null;
}

export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

export interface WizardData {
  proposalId: string;
  advisorName: string;
  client: WizardClient;
  meta: WizardProposalMeta;
  narrative: WizardNarrative;
  alternatives: WizardAlternative[];
  benefits: WizardBenefit[];
  comparison: WizardComparison;
}

export interface WizardStepProps {
  onJumpToStep: (step: number) => void;
  availableClients: WizardClient[];
}
