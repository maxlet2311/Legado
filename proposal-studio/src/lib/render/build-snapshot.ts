import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { documentRenderJsonSchema } from "@/lib/render/schemas";
import { pickContrastText } from "@/lib/render/contrast";
import type { DocumentSnapshot } from "@/lib/render/types";
import type { Database } from "@/lib/database/types";

const SIGNATURE_SIGNED_URL_TTL_SECONDS = 60;

/**
 * Construye el snapshot final que consume el renderer a partir de una fila de
 * `proposal_versions`. La firma del asesor nunca se persiste como URL: se
 * resuelve acá, del lado servidor, con una signed URL de vida corta (06_PDF_ENGINE.md,
 * 08_BRANDING_SYSTEM — "resolverla únicamente del lado servidor durante el render").
 */
async function buildDocumentSnapshot(
  supabase: SupabaseClient<Database>,
  versionRow: { render_json: unknown },
): Promise<DocumentSnapshot> {
  const renderJson = documentRenderJsonSchema.parse(versionRow.render_json);

  let resolvedSignatureUrl: string | null = null;
  const signaturePath = renderJson.brand?.signature_image;
  if (signaturePath) {
    const { data } = await supabase.storage
      .from("signatures")
      .createSignedUrl(signaturePath, SIGNATURE_SIGNED_URL_TTL_SECONDS);
    resolvedSignatureUrl = data?.signedUrl ?? null;
  }

  const primaryColor = renderJson.proposal.primary_color_override ?? renderJson.brand?.primary_color ?? null;
  const accentColor = renderJson.brand?.accent_color ?? null;

  return {
    ...renderJson,
    resolvedSignatureUrl,
    brandTextOnPrimary: pickContrastText(primaryColor),
    brandTextOnAccent: pickContrastText(accentColor),
  };
}

export { buildDocumentSnapshot };
