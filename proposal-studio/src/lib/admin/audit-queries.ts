import "server-only";

import { createAdminClient } from "@/lib/database/admin";
import type { Json } from "@/lib/database/types";
import { logServerError } from "@/lib/utils/errors";
import { requirePlatformOwner } from "@/lib/auth/authorization-guards";

interface AdminAuditEventListItem {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  beforeData: Json | null;
  afterData: Json | null;
  metadata: Json;
  createdAt: string;
}

interface ListAdminAuditEventsParams {
  page: number;
  pageSize: number;
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  /** ISO 8601, inclusivo */
  dateFrom?: string;
  /** ISO 8601, inclusivo */
  dateTo?: string;
}

interface ListAdminAuditEventsResult {
  items: AdminAuditEventListItem[];
  total: number;
}

/**
 * Primera función de lectura de `admin_audit_events` (hasta ahora solo
 * existía `recordAdminAuditEvent`, insert-only — ver `src/lib/admin/audit.ts`).
 * Llamada directamente desde el Server Component de `/admin/audit`, sin ruta
 * API nueva — mismo criterio que `listMembershipsForAdmin`. Nunca trae toda
 * la tabla: paginación server-side obligatoria (`page`/`pageSize`).
 *
 * Defensa en profundidad explícita: aunque el layout de `/admin` ya exige
 * `requirePlatformOwner()`, esta función la vuelve a exigir acá — es la
 * pantalla más sensible del panel (historial completo de acciones
 * administrativas), así que no debe depender exclusivamente del guard de un
 * layout que en el futuro alguien podría mover o envolver distinto.
 *
 * `actor_user_id` sí referencia `public.profiles` (a diferencia de
 * `account_activation_invitations.created_by_user_id`, que referencia
 * `auth.users`), así que el nombre del actor se resuelve con un embed
 * directo de PostgREST, sin query adicional.
 *
 * No hay columna `result`/`resultado` en `admin_audit_events` (confirmado
 * contra la migración `20260717010000_admin_audit_events.sql` y los tipos
 * generados) — no se implementa ese filtro para no inventar un campo que no
 * existe.
 */
async function listAdminAuditEvents(
  params: ListAdminAuditEventsParams,
): Promise<ListAdminAuditEventsResult> {
  await requirePlatformOwner();

  const admin = createAdminClient();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = admin
    .from("admin_audit_events")
    .select("*, profiles(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.actorUserId) query = query.eq("actor_user_id", params.actorUserId);
  if (params.action) query = query.ilike("action", `%${params.action.trim().replace(/[%,]/g, "")}%`);
  if (params.entityType) query = query.ilike("entity_type", `%${params.entityType.trim().replace(/[%,]/g, "")}%`);
  if (params.entityId) query = query.eq("entity_id", params.entityId);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", params.dateTo);

  const { data, count, error } = await query;

  if (error) {
    logServerError("listAdminAuditEvents", error);
    return { items: [], total: 0 };
  }

  const items: AdminAuditEventListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: row.profiles?.full_name ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reason: row.reason,
    beforeData: row.before_data,
    afterData: row.after_data,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));

  return { items, total: count ?? 0 };
}

export { listAdminAuditEvents };
export type { AdminAuditEventListItem, ListAdminAuditEventsParams };
