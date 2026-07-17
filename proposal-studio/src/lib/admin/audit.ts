import "server-only";

import { createAdminClient } from "@/lib/database/admin";
import type { Json } from "@/lib/database/types";
import { logServerError } from "@/lib/utils/errors";

interface RecordAdminAuditEventParams {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Única vía de escritura a `admin_audit_events` (append-only — no existe
 * `update`/`delete` acá a propósito). No lanza si la escritura falla: una
 * auditoría caída no debe revertir ni bloquear la acción administrativa que
 * ya se ejecutó, pero sí se loguea como error de servidor para no perder la
 * falla silenciosamente.
 */
async function recordAdminAuditEvent(params: RecordAdminAuditEventParams): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("admin_audit_events").insert({
    actor_user_id: params.actorUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    reason: params.reason ?? null,
    before_data: (params.beforeData ?? null) as Json,
    after_data: (params.afterData ?? null) as Json,
    metadata: (params.metadata ?? {}) as Json,
  });

  if (error) {
    logServerError("recordAdminAuditEvent", error);
  }
}

export { recordAdminAuditEvent };
