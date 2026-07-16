/**
 * Formas del snapshot documental congelado en `proposal_versions.content_json` /
 * `render_json` (ver migración `emit_proposal_version`). El renderer nunca lee
 * las tablas vivas: solo estos tipos, ya congelados en el momento de emisión.
 */

export type Currency = "ARS" | "USD" | "EUR";
export type Orientation = "portrait" | "landscape";
export type PdfFormat = "A4" | "Letter";
export type MarginSize = "small" | "medium" | "large";

export interface SnapshotProposal {
  id: string;
  proposal_number: string;
  title: string;
  primary_objective: string;
  proposal_type: "individual" | "corporate";
  product: string | null;
  currency: Currency;
  orientation: Orientation;
  theme: string;
  font_family: string;
  pdf_format: PdfFormat;
  margin_size: MarginSize;
  show_cover: boolean;
  show_summary: boolean;
  show_footer: boolean;
  show_page_numbers: boolean;
  show_legal_note: boolean;
  show_watermark: boolean;
  watermark_text: string | null;
  primary_color_override: string | null;
  secondary_color_override: string | null;
}

export interface SnapshotClient {
  id: string;
  full_name: string;
  company_name: string | null;
  client_type: "individual" | "company";
  email: string;
  phone: string | null;
}

export interface SnapshotBrand {
  id: string;
  commercial_name: string;
  advisor_name: string;
  license_number: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  footer_text: string | null;
  /** Path interno del bucket privado `signatures`. Nunca una URL. */
  signature_image: string | null;
}

export interface SnapshotNarrative {
  executive_summary: string | null;
  current_situation: string | null;
  detected_needs: string | null;
  objectives: string | null;
  detected_risks: string | null;
  opportunities: string | null;
  recommended_strategy: string | null;
  expected_result: string | null;
  final_message: string | null;
}

export interface SnapshotAlternative {
  id: string;
  title: string;
  description: string | null;
  category: string;
  insurance_company: string;
  product_name: string;
  currency: Currency;
  monthly_premium: number | null;
  annual_premium: number | null;
  insured_amount: number | null;
  is_recommended: boolean;
  recommended_reason: string | null;
  financial_details: { advantages?: string[]; disadvantages?: string[]; notes?: string } | null;
  highlight_label: string | null;
  display_order: number;
}

export interface SnapshotBenefit {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  display_order: number;
}

export interface SnapshotComparisonColumn {
  id: string;
  label: string;
}

export interface SnapshotComparisonRow {
  id: string;
  label: string;
  values: Record<string, string>;
}

export interface SnapshotComparison {
  columns: SnapshotComparisonColumn[];
  rows: SnapshotComparisonRow[];
}

export interface SnapshotTemplate {
  id: string;
  title: string;
  category: string;
  template_json: { sections?: string[] } | null;
}

/** Forma cruda de `content_json` (y de `render_json` sin los campos de emisión). */
export interface DocumentContent {
  proposal: SnapshotProposal;
  client: SnapshotClient | null;
  brand: SnapshotBrand | null;
  narrative: SnapshotNarrative | null;
  alternatives: SnapshotAlternative[];
  benefits: SnapshotBenefit[];
  comparison: SnapshotComparison;
  template: SnapshotTemplate | null;
}

/** Forma de `render_json`: content + metadata de emisión. */
export interface DocumentRenderJson extends DocumentContent {
  version_number: number;
  issued_at: string;
  checksum: string;
  schema_version: number;
}

/**
 * Snapshot ya resuelto para el árbol de componentes: agrega lo que solo puede
 * resolverse en el servidor al momento del render (signed URL de firma) y
 * valores derivados (contraste, formateo) que no deben persistir en la DB.
 */
export interface DocumentSnapshot extends DocumentRenderJson {
  resolvedSignatureUrl: string | null;
  brandTextOnPrimary: "#000000" | "#FFFFFF";
  brandTextOnAccent: "#000000" | "#FFFFFF";
}

export interface DocumentVersionMeta {
  id: string;
  proposalId: string;
  versionNumber: number;
  issuedAt: string;
  checksum: string;
}
