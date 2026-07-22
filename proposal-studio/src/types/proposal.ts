export type ClientType = "individual" | "company";

export type ProposalStatus = "draft" | "completed" | "exported" | "archived";

/** Etapa comercial de la propuesta (venta), independiente de `ProposalStatus` (progreso del documento). */
export type CommercialStatus = "draft" | "sent" | "negotiation" | "accepted" | "rejected" | "archived";

export type PrimaryObjective =
  | "protect_family"
  | "build_savings"
  | "retirement"
  | "business_protection"
  | "partners_protection"
  | "employee_retention"
  | "custom";

export type Currency = "ARS" | "USD" | "EUR";

export interface Proposal {
  id: string;
  clientId: string;
  brandId: string | null;
  proposalNumber: string;
  title: string;
  primaryObjective: PrimaryObjective;
  proposalType: ClientType;
  currency: Currency;
  status: ProposalStatus;
}

export interface Client {
  id: string;
  fullName: string;
  companyName: string | null;
  clientType: ClientType;
  email: string;
}

export interface Brand {
  id: string;
  commercialName: string;
  advisorName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}
