import "server-only";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForRoute } from "@/lib/memberships/route-guard";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

const DOWNLOAD_SIGNED_URL_TTL_SECONDS = 60;

/**
 * Descarga segura: nunca hace público `proposal-files`. Devuelve una signed
 * URL de vida corta, resuelta a partir del artifact del propio usuario (RLS +
 * filtro explícito por `user_id`, defensa en profundidad).
 */
async function GET(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const guard = await requireActiveMembershipForRoute({ surface: "pdf.download" });
  if (guard.response) return guard.response;
  const { user } = guard.context;

  if (!checkRateLimit(`pdf:download:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Esperá unos segundos." }, { status: 429 });
  }

  const supabase = await createClient();
  const { versionId } = await params;

  const { data: artifact, error } = await supabase
    .from("proposal_version_artifacts")
    .select("storage_path")
    .eq("proposal_version_id", versionId)
    .eq("artifact_type", "pdf")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !artifact) {
    return NextResponse.json({ error: "El PDF todavía no fue generado." }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("proposal-files")
    .createSignedUrl(artifact.storage_path, DOWNLOAD_SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) {
    return NextResponse.json({ error: "No pudimos generar el enlace de descarga." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}

export { GET };
