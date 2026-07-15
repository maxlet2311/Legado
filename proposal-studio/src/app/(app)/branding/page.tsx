import type { Metadata } from "next";

import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/database/server";
import { getSignaturePreviewUrl } from "@/lib/branding/actions";
import { BrandingForm } from "@/app/(app)/branding/branding-form";

export const metadata: Metadata = {
  title: "Mi Marca — Proposal Studio™",
};

export default async function BrandingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id, commercial_name, advisor_name, license_number, logo_url, primary_color, secondary_color, accent_color, email, phone, whatsapp, website, address, footer_text, signature_image",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const signaturePreviewUrl = brand?.signature_image
    ? await getSignaturePreviewUrl(brand.signature_image)
    : null;

  return (
    <ContentContainer className="max-w-240">
      <PageHeader
        title="Mi Marca"
        description="Personalizá logo, firma, paleta y datos de contacto de tu propuesta."
        breadcrumbs={[{ label: "Panel de Control", href: "/dashboard" }, { label: "Mi Marca" }]}
      />
      <BrandingForm brand={brand} initialSignaturePreviewUrl={signaturePreviewUrl} />
    </ContentContainer>
  );
}
