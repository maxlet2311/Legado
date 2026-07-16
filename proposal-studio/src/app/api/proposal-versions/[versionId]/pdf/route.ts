import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/database/server";
import { requireUser } from "@/lib/auth/session";
import { buildDocumentSnapshot } from "@/lib/render/build-snapshot";
import { generateProposalVersionPdf, RENDER_ENGINE, RENDER_ENGINE_VERSION } from "@/lib/render/pdf";

export const runtime = "nodejs";

/**
 * Genera (o reutiliza) el PDF de una versión inmutable.
 *
 * El path de Storage se calcula siempre en el servidor — nunca se acepta un
 * path enviado por el cliente. Si ya existe un artifact para esta versión
 * (misma versión = mismo snapshot, siempre), se devuelve sin volver a
 * renderizar ni subir nada.
 */
async function POST(_request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("proposal_version_artifacts")
    .select("id, storage_path, byte_size, created_at")
    .eq("proposal_version_id", versionId)
    .eq("artifact_type", "pdf")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ storagePath: existing.storage_path, byteSize: existing.byte_size, reused: true });
  }

  const { data: versionRow, error: versionError } = await supabase
    .from("proposal_versions")
    .select("id, proposal_id, version_number, render_json, user_id")
    .eq("id", versionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (versionError || !versionRow) {
    return NextResponse.json({ error: "Versión no encontrada o sin acceso." }, { status: 404 });
  }

  const snapshot = await buildDocumentSnapshot(supabase, versionRow);
  const pdfBuffer = await generateProposalVersionPdf(snapshot);

  if (pdfBuffer.byteLength === 0) {
    return NextResponse.json({ error: "El PDF generado está vacío." }, { status: 500 });
  }

  const checksum = createHash("sha256").update(pdfBuffer).digest("hex");
  const storagePath = `${user.id}/${versionRow.proposal_id}/${versionRow.id}/proposal-v${versionRow.version_number}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("proposal-files")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: false });

  if (uploadError && !uploadError.message.includes("already exists")) {
    return NextResponse.json({ error: "No pudimos guardar el PDF." }, { status: 500 });
  }

  const { data: recorded, error: recordError } = await supabase
    .rpc("record_proposal_version_artifact", {
      p_proposal_version_id: versionRow.id,
      p_storage_path: storagePath,
      p_mime_type: "application/pdf",
      p_byte_size: pdfBuffer.byteLength,
      p_checksum: checksum,
      p_render_engine: RENDER_ENGINE,
      p_render_engine_version: RENDER_ENGINE_VERSION,
    })
    .single();

  if (recordError || !recorded) {
    return NextResponse.json({ error: "No pudimos registrar el PDF generado." }, { status: 500 });
  }

  if (!recorded.is_new && recorded.storage_path !== storagePath) {
    // Perdimos la carrera contra una generación concurrente: limpiamos el
    // archivo que acabamos de subir y devolvemos el que ganó.
    await supabase.storage.from("proposal-files").remove([storagePath]);
  }

  return NextResponse.json({ storagePath: recorded.storage_path, byteSize: pdfBuffer.byteLength, reused: !recorded.is_new });
}

export { POST };
