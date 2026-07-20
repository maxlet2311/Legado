"use server";

// Import explícito de la variante Node por la misma razón que `pdf.ts`: Next
// bloquea "react-dom/server" genérico en el directorio `app`.
import { renderToStaticMarkup } from "react-dom/server.node";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError } from "@/lib/utils/errors";
import { buildDocumentSnapshot } from "@/lib/render/build-snapshot";
import { RenderDocument } from "@/lib/render/render-document";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

/**
 * Preview en tiempo real: usa el RPC de solo lectura `get_live_document_content`
 * (misma construcción de JSON que `emit_proposal_version`, sin insertar una
 * versión) y el mismo `buildDocumentSnapshot`/`RenderDocument` que ya usa el
 * preview post-emisión -- ningún renderer paralelo. Devuelve HTML estático
 * (mismo mecanismo que `pdf.ts`) para que el cliente lo inyecte sin traer el
 * árbol de componentes del documento al bundle del navegador (usa `server-only`
 * transitivamente por las fuentes embebidas).
 */
async function getLiveDocumentPreviewAction(proposalId: string): Promise<ActionResult<{ html: string }>> {
  const guard = await requireActiveMembershipForAction({ surface: "preview.live" });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();

  const { data: contentJson, error } = await supabase.rpc("get_live_document_content", {
    p_proposal_id: proposalId,
  });

  if (error || !contentJson) {
    return { error: error ? mapSupabaseError(error) : "No pudimos generar la vista previa." };
  }

  try {
    const snapshot = await buildDocumentSnapshot(supabase, { render_json: contentJson });
    const html = renderToStaticMarkup(RenderDocument({ snapshot, variant: "content" }));
    return { data: { html } };
  } catch {
    return { error: "No pudimos generar la vista previa en este momento." };
  }
}

export { getLiveDocumentPreviewAction };
