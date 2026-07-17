import "server-only";

import { createAdminClient } from "@/lib/database/admin";
import type { Database } from "@/lib/database/types";
import { CURRENT_MEMBERSHIP_STATUSES } from "@/lib/memberships/types";
import type { Membership, MembershipHistorySource, MembershipPlan, MembershipStatus } from "@/lib/memberships/types";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];
type MembershipPlanRow = Database["public"]["Tables"]["membership_plans"]["Row"];

function mapMembershipRow(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    planId: row.plan_id,
    status: row.status as MembershipStatus,
    provider: row.provider,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    providerStatus: row.provider_status,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    gracePeriodEnd: row.grace_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    canceledAt: row.canceled_at,
    activatedAt: row.activated_at,
    suspendedAt: row.suspended_at,
    lastPaymentAt: row.last_payment_at,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlanRow(row: MembershipPlanRow): MembershipPlan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    currency: row.currency,
    billingInterval: row.billing_interval as "month" | "year",
    billingIntervalCount: row.billing_interval_count,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    features: (row.features as Record<string, unknown>) ?? {},
    provider: row.provider,
    providerPlanId: row.provider_plan_id,
  };
}

async function getPlanById(id: string): Promise<MembershipPlan | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("membership_plans").select("*").eq("id", id).maybeSingle();
  return data ? mapPlanRow(data) : null;
}

async function getPlanByCode(code: string): Promise<MembershipPlan | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("membership_plans").select("*").eq("code", code).maybeSingle();
  return data ? mapPlanRow(data) : null;
}

async function getPlanByProviderPlanId(provider: string, providerPlanId: string): Promise<MembershipPlan | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("membership_plans")
    .select("*")
    .eq("provider", provider)
    .eq("provider_plan_id", providerPlanId)
    .maybeSingle();
  return data ? mapPlanRow(data) : null;
}

async function listActivePlans(): Promise<MembershipPlan[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("membership_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []).map(mapPlanRow);
}

async function getMembershipById(id: string): Promise<Membership | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("memberships").select("*").eq("id", id).maybeSingle();
  return data ? mapMembershipRow(data) : null;
}

/**
 * Prioriza la membresía "vigente" (ver `CURRENT_MEMBERSHIP_STATUSES`); si no
 * hay ninguna, devuelve la más reciente históricamente (para que la UI pueda
 * distinguir "nunca tuvo membresía" de "tuvo una y se canceló/venció") en
 * vez de simplemente `null` en ambos casos.
 */
async function getCurrentMembershipForUser(userId: string): Promise<Membership | null> {
  const admin = createAdminClient();

  const { data: current } = await admin
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .in("status", CURRENT_MEMBERSHIP_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (current) return mapMembershipRow(current);

  const { data: mostRecent } = await admin
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return mostRecent ? mapMembershipRow(mostRecent) : null;
}

async function getMembershipByProviderSubscriptionId(
  provider: string,
  providerSubscriptionId: string,
): Promise<Membership | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select("*")
    .eq("provider", provider)
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();
  return data ? mapMembershipRow(data) : null;
}

/**
 * Fija `provider_subscription_id`/`provider_status` sobre una membership.
 * Idempotente por diseño: el filtro `provider_subscription_id is null` hace
 * que un reintento del mismo webhook (la membresía ya vinculada) no pise
 * nada — el llamador re-resuelve por `getMembershipByProviderSubscriptionId`
 * en ese caso. La resolución de a qué membership vincular es siempre por
 * `provider_checkout_plan_id` (ver `src/lib/payments/reconciliation.ts`),
 * nunca por email/plan.
 */
async function linkMembershipProviderSubscription(
  membershipId: string,
  providerSubscriptionId: string,
  providerStatus: string | null,
): Promise<Membership | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .update({ provider_subscription_id: providerSubscriptionId, provider_status: providerStatus })
    .eq("id", membershipId)
    .is("provider_subscription_id", null)
    .select("*")
    .maybeSingle();
  return data ? mapMembershipRow(data) : null;
}

async function getCurrentMembershipForEmail(email: string): Promise<Membership | null> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: current } = await admin
    .from("memberships")
    .select("*")
    .eq("email", normalizedEmail)
    .in("status", CURRENT_MEMBERSHIP_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (current) return mapMembershipRow(current);

  const { data: mostRecent } = await admin
    .from("memberships")
    .select("*")
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return mostRecent ? mapMembershipRow(mostRecent) : null;
}

interface CreateMembershipRpcParams {
  email: string;
  planId: string;
  status: MembershipStatus;
  source: MembershipHistorySource;
  userId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  actorUserId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  provider?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerStatus?: string | null;
  id?: string;
}

async function callCreateMembership(params: CreateMembershipRpcParams): Promise<Membership> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("create_membership", {
      p_email: params.email,
      p_plan_id: params.planId,
      p_status: params.status,
      p_source: params.source,
      p_user_id: params.userId ?? undefined,
      p_current_period_start: params.currentPeriodStart ?? undefined,
      p_current_period_end: params.currentPeriodEnd ?? undefined,
      p_actor_user_id: params.actorUserId ?? undefined,
      p_reason: params.reason ?? undefined,
      p_metadata: (params.metadata ?? {}) as Database["public"]["Tables"]["memberships"]["Row"]["metadata"],
      p_provider: params.provider ?? undefined,
      p_provider_customer_id: params.providerCustomerId ?? undefined,
      p_provider_subscription_id: params.providerSubscriptionId ?? undefined,
      p_provider_status: params.providerStatus ?? undefined,
      p_id: params.id ?? undefined,
    })
    .single();

  if (error || !data) {
    throw error ?? new Error("create_membership no devolvió datos.");
  }

  return mapMembershipRow(data);
}

interface TransitionMembershipRpcParams {
  membershipId: string;
  expectedCurrentStatus: MembershipStatus;
  newStatus: MembershipStatus;
  source: MembershipHistorySource;
  reason?: string | null;
  actorUserId?: string | null;
  externalEventId?: string | null;
  metadata?: Record<string, unknown>;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  gracePeriodEnd?: string | null;
  providerStatus?: string | null;
  lastPaymentAt?: string | null;
  canceledAt?: string | null;
  activatedAt?: string | null;
  suspendedAt?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  clearGracePeriodEnd?: boolean;
}

/** Lanza el error crudo de Postgres si `expectedCurrentStatus` ya no coincide (sqlstate `PS409`): el llamador lo traduce. */
async function callTransitionMembershipStatus(
  params: TransitionMembershipRpcParams,
): Promise<Membership> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("transition_membership_status", {
      p_membership_id: params.membershipId,
      p_expected_current_status: params.expectedCurrentStatus,
      p_new_status: params.newStatus,
      p_source: params.source,
      p_reason: params.reason ?? undefined,
      p_actor_user_id: params.actorUserId ?? undefined,
      p_external_event_id: params.externalEventId ?? undefined,
      p_metadata: (params.metadata ?? {}) as Database["public"]["Tables"]["memberships"]["Row"]["metadata"],
      p_current_period_start: params.currentPeriodStart ?? undefined,
      p_current_period_end: params.currentPeriodEnd ?? undefined,
      p_grace_period_end: params.gracePeriodEnd ?? undefined,
      p_provider_status: params.providerStatus ?? undefined,
      p_last_payment_at: params.lastPaymentAt ?? undefined,
      p_canceled_at: params.canceledAt ?? undefined,
      p_activated_at: params.activatedAt ?? undefined,
      p_suspended_at: params.suspendedAt ?? undefined,
      p_cancel_at_period_end: params.cancelAtPeriodEnd ?? undefined,
      p_clear_grace_period_end: params.clearGracePeriodEnd ?? false,
    })
    .single();

  if (error || !data) {
    throw error ?? new Error("transition_membership_status no devolvió datos.");
  }

  return mapMembershipRow(data);
}

interface LinkMembershipRpcParams {
  membershipId: string;
  userId: string;
  email: string;
  source?: MembershipHistorySource;
  actorUserId?: string | null;
}

/** Lanza el error crudo de Postgres (`P0002` perfil inexistente, `P0001` estado/email inválido, `23505` ya vinculada a otro usuario): el llamador lo traduce. */
async function callLinkMembershipToUser(params: LinkMembershipRpcParams): Promise<Membership> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("link_membership_to_user", {
      p_membership_id: params.membershipId,
      p_user_id: params.userId,
      p_email: params.email,
      p_source: params.source ?? "activation",
      p_actor_user_id: params.actorUserId ?? undefined,
    })
    .single();

  if (error || !data) {
    throw error ?? new Error("link_membership_to_user no devolvió datos.");
  }

  return mapMembershipRow(data);
}

async function listAllPlans(): Promise<MembershipPlan[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("membership_plans").select("*").order("sort_order", { ascending: true });
  return (data ?? []).map(mapPlanRow);
}

interface AdminMembershipListItem extends Membership {
  planName: string | null;
  planCode: string | null;
  userFullName: string | null;
}

interface ListMembershipsForAdminParams {
  page: number;
  pageSize: number;
  status?: MembershipStatus;
  planId?: string;
  provider?: string;
  linked?: boolean;
  search?: string;
}

interface ListMembershipsForAdminResult {
  items: AdminMembershipListItem[];
  total: number;
}

/**
 * Listado paginado server-side para `/admin/memberships` — nunca trae todos
 * los registros al cliente. `search` matchea contra `email`,
 * `provider_subscription_id` y el nombre del perfil vinculado (PostgREST
 * soporta filtrar sobre el recurso embebido dentro de un `or()`).
 */
async function listMembershipsForAdmin(params: ListMembershipsForAdminParams): Promise<ListMembershipsForAdminResult> {
  const admin = createAdminClient();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = admin
    .from("memberships")
    .select("*, membership_plans(name, code), profiles(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) query = query.eq("status", params.status);
  if (params.planId) query = query.eq("plan_id", params.planId);
  if (params.provider) query = query.eq("provider", params.provider);
  if (params.linked === true) query = query.not("user_id", "is", null);
  if (params.linked === false) query = query.is("user_id", null);
  if (params.search) {
    const term = params.search.trim().replace(/[%,]/g, "");
    if (term) {
      query = query.or(
        `email.ilike.%${term}%,provider_subscription_id.ilike.%${term}%,profiles.full_name.ilike.%${term}%`,
      );
    }
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const items = (data ?? []).map((row) => ({
    ...mapMembershipRow(row),
    planName: row.membership_plans?.name ?? null,
    planCode: row.membership_plans?.code ?? null,
    userFullName: row.profiles?.full_name ?? null,
  }));

  return { items, total: count ?? 0 };
}

export {
  getPlanById,
  getPlanByCode,
  getPlanByProviderPlanId,
  listActivePlans,
  listAllPlans,
  getMembershipById,
  getMembershipByProviderSubscriptionId,
  linkMembershipProviderSubscription,
  getCurrentMembershipForUser,
  getCurrentMembershipForEmail,
  callCreateMembership,
  callTransitionMembershipStatus,
  callLinkMembershipToUser,
  listMembershipsForAdmin,
};
export type { AdminMembershipListItem, ListMembershipsForAdminParams };
