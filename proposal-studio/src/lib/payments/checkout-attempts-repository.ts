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
  OPEN_CHECKOUT_ATTEMPT_STATUSES,
};
export type { CheckoutAttempt, CheckoutAttemptStatus };
