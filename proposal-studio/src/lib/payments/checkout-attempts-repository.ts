import "server-only";

import { createAdminClient } from "@/lib/database/admin";
import type { Database } from "@/lib/database/types";

type CheckoutAttemptRow = Database["public"]["Tables"]["membership_checkout_attempts"]["Row"];

const OPEN_CHECKOUT_ATTEMPT_STATUSES = ["creating", "ready", "redirected"] as const;

type CheckoutAttemptStatus = CheckoutAttemptRow["status"];

interface CheckoutAttempt {
  id: string;
  membershipId: string;
  membershipPlanId: string;
  provider: string;
  providerCheckoutPlanId: string | null;
  providerSubscriptionId: string | null;
  status: CheckoutAttemptStatus;
  payerId: string | null;
  providerEventId: string | null;
  lockedAt: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: CheckoutAttemptRow): CheckoutAttempt {
  return {
    id: row.id,
    membershipId: row.membership_id,
    membershipPlanId: row.membership_plan_id,
    provider: row.provider,
    providerCheckoutPlanId: row.provider_checkout_plan_id,
    providerSubscriptionId: row.provider_subscription_id,
    status: row.status,
    payerId: row.payer_id,
    providerEventId: row.provider_event_id,
    lockedAt: row.locked_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    canceledAt: row.canceled_at,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Crea (o reutiliza, si ya hay uno abierto) el intento de checkout de una
 * membership de forma atómica vía `begin_membership_checkout_attempt`
 * (advisory lock transaccional sobre `membershipId` — ver esa migración).
 * Nunca crea un segundo intento abierto para la misma membership.
 */
async function beginCheckoutAttempt(params: {
  membershipId: string;
  membershipPlanId: string;
  provider: string;
}): Promise<CheckoutAttempt> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("begin_membership_checkout_attempt", {
      p_membership_id: params.membershipId,
      p_membership_plan_id: params.membershipPlanId,
      p_provider: params.provider,
    })
    .single();

  if (error || !data) {
    throw error ?? new Error("begin_membership_checkout_attempt no devolvió datos.");
  }

  return mapRow(data);
}

/**
 * Reclama el derecho a llamar a Mercado Pago para provisionar el plan
 * exclusivo de este intento: solo la request cuyo UPDATE condicional afecta
 * una fila (`locked_at is null`) procede a crear el `preapproval_plan`
 * externo. Es el mecanismo de exclusión mutua real (no requiere mantener una
 * conexión/transacción abierta durante la llamada HTTP externa, a diferencia
 * de un advisory lock de sesión — que además no es confiable a través de
 * PostgREST por el pooling de conexiones). Devuelve `null` si el intento ya
 * fue reclamado por otra request concurrente.
 */
async function claimCheckoutAttemptForProvisioning(attemptId: string): Promise<CheckoutAttempt | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("membership_checkout_attempts")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("status", "creating")
    .is("locked_at", null)
    .select("*")
    .maybeSingle();

  return data ? mapRow(data) : null;
}

/** Libera el reclamo sin avanzar el estado — usado cuando la provisión falla y debe poder reintentarse. */
async function releaseCheckoutAttemptClaim(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("membership_checkout_attempts")
    .update({ locked_at: null })
    .eq("id", attemptId)
    .eq("status", "creating");
}

/** Persiste el `preapproval_plan_id` exclusivo recién creado y verificado, y pasa el intento a `ready`. */
async function markCheckoutAttemptReady(params: {
  attemptId: string;
  providerCheckoutPlanId: string;
}): Promise<CheckoutAttempt | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("membership_checkout_attempts")
    .update({ status: "ready", provider_checkout_plan_id: params.providerCheckoutPlanId })
    .eq("id", params.attemptId)
    .eq("status", "creating")
    .select("*")
    .maybeSingle();

  return data ? mapRow(data) : null;
}

async function markCheckoutAttemptFailed(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("membership_checkout_attempts")
    .update({ status: "failed" })
    .eq("id", attemptId)
    .in("status", OPEN_CHECKOUT_ATTEMPT_STATUSES as unknown as string[]);
}

async function getCheckoutAttemptById(attemptId: string): Promise<CheckoutAttempt | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("membership_checkout_attempts").select("*").eq("id", attemptId).maybeSingle();
  return data ? mapRow(data) : null;
}

/**
 * Correlación determinística (Paso 2.1, sección 6): único punto que busca un
 * intento por `(provider, provider_checkout_plan_id)`. Solo matchea intentos
 * `ready`/`redirected` — un intento `creating` (plan externo todavía no
 * confirmado localmente) o ya `matched`/`completed`/`expired`/`canceled` no
 * es un destino válido para una nueva correlación.
 */
async function findOpenCheckoutAttemptByProviderPlanId(
  provider: string,
  providerCheckoutPlanId: string,
): Promise<CheckoutAttempt[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("membership_checkout_attempts")
    .select("*")
    .eq("provider", provider)
    .eq("provider_checkout_plan_id", providerCheckoutPlanId)
    .in("status", ["ready", "redirected"]);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

async function getCheckoutAttemptByProviderSubscriptionId(
  provider: string,
  providerSubscriptionId: string,
): Promise<CheckoutAttempt | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("membership_checkout_attempts")
    .select("*")
    .eq("provider", provider)
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();
  return data ? mapRow(data) : null;
}

/** Vincula la suscripción real al intento (CAS: nunca pisa un intento ya vinculado a otra suscripción). */
async function linkCheckoutAttemptSubscription(params: {
  attemptId: string;
  providerSubscriptionId: string;
  payerId: string | null;
}): Promise<CheckoutAttempt | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("membership_checkout_attempts")
    .update({
      provider_subscription_id: params.providerSubscriptionId,
      payer_id: params.payerId,
      status: "matched",
    })
    .eq("id", params.attemptId)
    .is("provider_subscription_id", null)
    .select("*")
    .maybeSingle();

  return data ? mapRow(data) : null;
}

async function updateCheckoutAttemptLifecycleStatus(params: {
  attemptId: string;
  status: "completed" | "canceled";
  providerEventId?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  await admin
    .from("membership_checkout_attempts")
    .update({
      status: params.status,
      provider_event_id: params.providerEventId ?? undefined,
      completed_at: params.status === "completed" ? nowIso : undefined,
      canceled_at: params.status === "canceled" ? nowIso : undefined,
    })
    .eq("id", params.attemptId);
}

/** Marca `expired` cualquier intento abierto cuyo `expires_at` ya pasó. No toca `provider_checkout_plan_id`: no hay mecanismo oficial de MP para archivar el plan externo (ver informe de viabilidad, Paso 2.1 sección 1) — el plan externo queda simplemente sin uso. */
async function expireStaleCheckoutAttempts(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("membership_checkout_attempts")
    .update({ status: "expired" })
    .in("status", OPEN_CHECKOUT_ATTEMPT_STATUSES as unknown as string[])
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) throw error;
  return (data ?? []).length;
}

/** Enmascarado, mismo criterio que `maskExternalId` de membresías: nunca se expone un id externo completo en la UI administrativa. */
function maskId(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

interface CheckoutAttemptAdminItem {
  id: string;
  membershipId: string;
  membershipEmail: string | null;
  membershipUserId: string | null;
  planName: string | null;
  planCode: string | null;
  provider: string;
  providerCheckoutPlanIdMasked: string | null;
  providerSubscriptionIdMasked: string | null;
  payerIdMasked: string | null;
  status: CheckoutAttemptStatus;
  lockedAt: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ListCheckoutAttemptsAdminParams {
  page: number;
  pageSize: number;
  status?: CheckoutAttemptStatus;
  provider?: string;
  planId?: string;
  /** `true` = ya tiene `provider_subscription_id` vinculado; `false` = todavía no. */
  linked?: boolean;
  /** Búsqueda por email de la membresía asociada (resuelta en un paso previo, ver comentario abajo). */
  email?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ListCheckoutAttemptsAdminResult {
  items: CheckoutAttemptAdminItem[];
  total: number;
}

/**
 * Lectura administrativa paginada (Lote B, Paso 8) — no existía ninguna
 * función de listado sobre `membership_checkout_attempts` hasta ahora (solo
 * lecturas puntuales por id/correlación). Sigue el mismo criterio que
 * `listMembershipsForAdmin`/`listAdminAuditEvents`: llamada directo desde el
 * Server Component, sin ruta API nueva, paginación obligatoria server-side.
 *
 * El filtro por email no puede resolverse con un embed filtrado en una sola
 * query de forma simple con el cliente admin tal como está tipado acá, así
 * que se resuelve en dos pasos: primero se buscan los `membership_id` cuyo
 * email matchea (`ilike` sobre `memberships.email`), y luego se filtra
 * `membership_checkout_attempts.membership_id in (...)`. Nunca se expone
 * `provider_checkout_plan_id`/`provider_subscription_id`/`payer_id`
 * completos — siempre enmascarados antes de salir de esta función.
 */
async function listCheckoutAttemptsForAdmin(
  params: ListCheckoutAttemptsAdminParams,
): Promise<ListCheckoutAttemptsAdminResult> {
  const admin = createAdminClient();

  let membershipIdFilter: string[] | undefined;
  if (params.email && params.email.trim().length > 0) {
    const sanitizedEmail = params.email.trim().replace(/[%,]/g, "");
    const { data: matchingMemberships, error: membershipError } = await admin
      .from("memberships")
      .select("id")
      .ilike("email", `%${sanitizedEmail}%`)
      .limit(500);

    if (membershipError) throw membershipError;

    membershipIdFilter = (matchingMemberships ?? []).map((row) => row.id);
    if (membershipIdFilter.length === 0) {
      return { items: [], total: 0 };
    }
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = admin
    .from("membership_checkout_attempts")
    .select("*, memberships(email, user_id), membership_plans(name, code)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) query = query.eq("status", params.status);
  if (params.provider) query = query.eq("provider", params.provider);
  if (params.planId) query = query.eq("membership_plan_id", params.planId);
  if (params.linked === true) query = query.not("provider_subscription_id", "is", null);
  if (params.linked === false) query = query.is("provider_subscription_id", null);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", params.dateTo);
  if (membershipIdFilter) query = query.in("membership_id", membershipIdFilter);

  const { data, count, error } = await query;
  if (error) throw error;

  const items: CheckoutAttemptAdminItem[] = (data ?? []).map((row) => ({
    id: row.id,
    membershipId: row.membership_id,
    membershipEmail: row.memberships?.email ?? null,
    membershipUserId: row.memberships?.user_id ?? null,
    planName: row.membership_plans?.name ?? null,
    planCode: row.membership_plans?.code ?? null,
    provider: row.provider,
    providerCheckoutPlanIdMasked: maskId(row.provider_checkout_plan_id),
    providerSubscriptionIdMasked: maskId(row.provider_subscription_id),
    payerIdMasked: maskId(row.payer_id),
    status: row.status as CheckoutAttemptStatus,
    lockedAt: row.locked_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    canceledAt: row.canceled_at,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { items, total: count ?? 0 };
}

/** Cuenta intentos abiertos (`creating`/`ready`/`redirected`) cuyo `expires_at` ya pasó — candidatos a limpieza, sin traer filas. */
async function countExpiredPendingCheckoutAttempts(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("membership_checkout_attempts")
    .select("id", { count: "exact", head: true })
    .in("status", OPEN_CHECKOUT_ATTEMPT_STATUSES as unknown as string[])
    .lt("expires_at", new Date().toISOString());

  if (error) throw error;
  return count ?? 0;
}

/** Cuenta intentos ya expirados/limpiados (`status = 'expired'`), sin traer filas. */
async function countExpiredCheckoutAttempts(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("membership_checkout_attempts")
    .select("id", { count: "exact", head: true })
    .eq("status", "expired");

  if (error) throw error;
  return count ?? 0;
}

export {
  beginCheckoutAttempt,
  claimCheckoutAttemptForProvisioning,
  releaseCheckoutAttemptClaim,
  markCheckoutAttemptReady,
  markCheckoutAttemptFailed,
  getCheckoutAttemptById,
  findOpenCheckoutAttemptByProviderPlanId,
  getCheckoutAttemptByProviderSubscriptionId,
  linkCheckoutAttemptSubscription,
  updateCheckoutAttemptLifecycleStatus,
  expireStaleCheckoutAttempts,
  listCheckoutAttemptsForAdmin,
  countExpiredPendingCheckoutAttempts,
  countExpiredCheckoutAttempts,
  OPEN_CHECKOUT_ATTEMPT_STATUSES,
};
export type { CheckoutAttempt, CheckoutAttemptStatus, CheckoutAttemptAdminItem, ListCheckoutAttemptsAdminParams };
