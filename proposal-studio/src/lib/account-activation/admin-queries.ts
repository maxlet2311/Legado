import "server-only";

import { createAdminClient } from "@/lib/database/admin";
import { logServerError } from "@/lib/utils/errors";
import type { AdminInvitationStatus } from "@/lib/account-activation/types";

interface AdminInvitationListItem {
  id: string;
  email: string;
  status: AdminInvitationStatus;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  membershipId: string | null;
  membershipEmail: string | null;
  membershipStatus: string | null;
}

interface ListActivationInvitationsForAdminParams {
  page: number;
  pageSize: number;
  status?: AdminInvitationStatus;
  search?: string;
}

interface ListActivationInvitationsForAdminResult {
  items: AdminInvitationListItem[];
  total: number;
  counts: Record<AdminInvitationStatus, number>;
}

const EMPTY_COUNTS: Record<AdminInvitationStatus, number> = {
  pending: 0,
  used: 0,
  revoked: 0,
  expired: 0,
};

/**
 * Cuenta invitaciones por estado efectivo (4 `count: exact, head: true`
 * queries en paralelo — barato, nunca trae filas). Respeta el mismo filtro
 * de búsqueda que la lista principal para que los contadores reflejen el
 * subconjunto visible. El estado efectivo replica `listActivationInvitations`:
 * una invitación `pending` cuyo `expires_at` ya pasó cuenta como `expired`
 * aunque la columna `status` siga en `pending`.
 */
async function getInvitationStatusCounts(
  admin: ReturnType<typeof createAdminClient>,
  nowIso: string,
  search?: string,
): Promise<Record<AdminInvitationStatus, number>> {
  const term = search?.trim().replace(/[%,]/g, "");

  async function countFor(status: AdminInvitationStatus): Promise<number> {
    let query = admin.from("account_activation_invitations").select("id", { count: "exact", head: true });

    if (status === "pending") {
      query = query.eq("status", "pending").gt("expires_at", nowIso);
    } else if (status === "expired") {
      query = query.eq("status", "pending").lte("expires_at", nowIso);
    } else {
      query = query.eq("status", status);
    }

    if (term) query = query.ilike("email", `%${term}%`);

    const { count, error } = await query;
    if (error) {
      logServerError("getInvitationStatusCounts", error);
      return 0;
    }
    return count ?? 0;
  }

  const [pending, used, revoked, expired] = await Promise.all([
    countFor("pending"),
    countFor("used"),
    countFor("revoked"),
    countFor("expired"),
  ]);

  return { pending, used, revoked, expired };
}

/**
 * Listado paginado + filtrado para `/admin/invitations` (Lote A). Llamada
 * directa desde el Server Component de la página, sin pasar por la ruta API
 * `GET /api/admin/activation-invitations` — mismo criterio arquitectónico
 * que `listMembershipsForAdmin` en `/admin/memberships` (ver
 * `src/lib/memberships/repository.ts`). `created_by_user_id` referencia
 * `auth.users`, no `public.profiles`, así que no se puede resolver el nombre
 * del creador con un embed de PostgREST — se resuelve con un segundo query
 * batched contra `profiles` por los ids únicos de la página actual.
 */
async function listActivationInvitationsForAdmin(
  params: ListActivationInvitationsForAdminParams,
): Promise<ListActivationInvitationsForAdminResult> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = admin
    .from("account_activation_invitations")
    .select(
      "id, email, status, expires_at, used_at, created_at, membership_id, created_by_user_id, memberships(email, status)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status === "pending") {
    query = query.eq("status", "pending").gt("expires_at", nowIso);
  } else if (params.status === "expired") {
    query = query.eq("status", "pending").lte("expires_at", nowIso);
  } else if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.search) {
    const term = params.search.trim().replace(/[%,]/g, "");
    if (term) query = query.ilike("email", `%${term}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    logServerError("listActivationInvitationsForAdmin", error);
    return { items: [], total: 0, counts: { ...EMPTY_COUNTS } };
  }

  const rows = data ?? [];

  const creatorIds = Array.from(
    new Set(rows.map((row) => row.created_by_user_id).filter((id): id is string => Boolean(id))),
  );

  let creatorNames: Record<string, string | null> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds);
    creatorNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  const items: AdminInvitationListItem[] = rows.map((row) => ({
    id: row.id,
    email: row.email,
    status:
      row.status === "pending" && row.expires_at <= nowIso
        ? "expired"
        : (row.status as AdminInvitationStatus),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_user_id ? creatorNames[row.created_by_user_id] ?? null : null,
    membershipId: row.membership_id,
    membershipEmail: row.memberships?.email ?? null,
    membershipStatus: row.memberships?.status ?? null,
  }));

  const counts = await getInvitationStatusCounts(admin, nowIso, params.search);

  return { items, total: count ?? 0, counts };
}

export { listActivationInvitationsForAdmin };
export type { AdminInvitationListItem, ListActivationInvitationsForAdminParams };
