import "server-only";

import { z } from "zod";

import { getPlanById } from "@/lib/memberships/repository";
import { createPendingMembership, getCurrentMembershipForEmail, transitionMembershipStatus } from "@/lib/memberships/service";
import { CURRENT_MEMBERSHIP_STATUSES } from "@/lib/memberships/types";
import type { MembershipPlan } from "@/lib/memberships/types";
import { getProviderSubscriptionPlan, createProviderSubscriptionPlan, PaymentProviderError } from "@/lib/payments/index";
import { buildExclusiveCheckoutPlanInput, buildAttemptReasonRef, compareProviderPlan } from "@/lib/payments/plan-comparison";
import {
  beginCheckoutAttempt,
  claimCheckoutAttemptForProvisioning,
  releaseCheckoutAttemptClaim,
  markCheckoutAttemptReady,
  markCheckoutAttemptFailed,
  getCheckoutAttemptById,
} from "@/lib/payments/checkout-attempts-repository";
import type { CheckoutAttempt } from "@/lib/payments/checkout-attempts-repository";
import {
  getMercadoPagoAccessToken,
  getPublicAppUrl,
  isDeterministicCheckoutEnabled,
  isMercadoPagoTestCredential,
  isSandboxCheckoutEnabled,
} from "@/lib/utils/env";
import { logServerError } from "@/lib/utils/errors";

class CheckoutError extends Error {
  code:
    | "invalid_email"
    | "plan_not_found"
    | "plan_inactive"
    | "plan_not_provider_ready"
    | "plan_remote_mismatch"
    | "membership_already_active"
    | "sandbox_checkout_disabled"
    | "deterministic_checkout_disabled"
    | "checkout_in_progress"
    | "provider_error";

  constructor(code: CheckoutError["code"], message: string) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
  }
}

const emailSchema = z.string().trim().toLowerCase().email();
const MAX_PROVISIONING_PERSIST_RETRIES = 2;

interface CreateMembershipCheckoutParams {
  email: string;
  planId: string;
}

interface CreateMembershipCheckoutResult {
  checkoutUrl: string;
}

/**
 * Resuelve un intento `ready`/`redirected` ya provisionado a su
 * `checkoutUrl`: se re-consulta el plan exclusivo contra el proveedor en vez
 * de persistir la URL (mismo criterio que la verificación de planes en
 * `plan-provisioning.ts`), así nunca se devuelve una URL potencialmente
 * desactualizada.
 */
async function resolveCheckoutUrlForReadyAttempt(providerCheckoutPlanId: string): Promise<string> {
  let remote;
  try {
    remote = await getProviderSubscriptionPlan("mercado_pago", providerCheckoutPlanId);
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      throw new CheckoutError("provider_error", "No se pudo verificar el plan de checkout con el proveedor de pagos.");
    }
    throw error;
  }

  if (remote.status !== "active" || !remote.initPoint) {
    throw new CheckoutError("provider_error", "El checkout de este intento ya no está disponible.");
  }

  return remote.initPoint;
}

/**
 * Provisiona el `preapproval_plan` exclusivo de un intento `creating` recién
 * reclamado (ver `claimCheckoutAttemptForProvisioning`): lo crea, lo
 * reconsulta para verificarlo contra el plan local, y persiste el id
 * exclusivo. Nunca reutiliza `plan.providerPlanId` (el plan compartido del
 * catálogo, tratado como legacy/master — sección 10 del alcance).
 */
async function provisionExclusiveCheckoutPlan(params: {
  attempt: CheckoutAttempt;
  plan: MembershipPlan;
}): Promise<string> {
  const { attempt, plan } = params;
  const backUrl = `${getPublicAppUrl()}/account/membership`;
  const ref = buildAttemptReasonRef();
  const input = buildExclusiveCheckoutPlanInput(plan, backUrl, ref);

  let created;
  try {
    created = await createProviderSubscriptionPlan("mercado_pago", input);
  } catch (error) {
    // Falla transitoria de red/proveedor antes de crear nada: se libera el
    // reclamo para que un reintento del mismo usuario pueda volver a
    // intentar sin quedar bloqueado por `locked_at`.
    await releaseCheckoutAttemptClaim(attempt.id);
    if (error instanceof PaymentProviderError) {
      throw new CheckoutError("provider_error", "No se pudo crear el checkout con el proveedor de pagos.");
    }
    throw error;
  }

  if (created.providerPlanId === plan.providerPlanId) {
    // Nunca debería ocurrir (Mercado Pago siempre devuelve un id nuevo) —
    // guardia explícita de la sección 10 del alcance: el checkout nuevo
    // jamás debe terminar apuntando al plan compartido del catálogo.
    await markCheckoutAttemptFailed(attempt.id);
    logServerError("provisionExclusiveCheckoutPlan:collided_with_shared_plan", { attemptId: attempt.id });
    throw new CheckoutError("provider_error", "No se pudo generar un checkout exclusivo para este intento.");
  }

  let remote;
  try {
    remote = await getProviderSubscriptionPlan("mercado_pago", created.providerPlanId);
  } catch (error) {
    await markCheckoutAttemptFailed(attempt.id);
    if (error instanceof PaymentProviderError) {
      throw new CheckoutError("provider_error", "No se pudo verificar el checkout recién creado con el proveedor de pagos.");
    }
    throw error;
  }

  const comparison = compareProviderPlan(plan, remote);
  if (!comparison.matches || remote.status !== "active" || !remote.initPoint) {
    await markCheckoutAttemptFailed(attempt.id);
    logServerError("provisionExclusiveCheckoutPlan:remote_mismatch", { attemptId: attempt.id, mismatches: comparison.mismatches });
    throw new CheckoutError("provider_error", "El checkout recién creado no coincide con el plan contratado.");
  }

  let persisted = await markCheckoutAttemptReady({ attemptId: attempt.id, providerCheckoutPlanId: created.providerPlanId });

  // La llamada externa ya tuvo éxito acá: si la persistencia local falla, se
  // reintenta unas pocas veces en vez de perder el plan ya creado (sección 4
  // del alcance — "reconciliación segura"). Si todos los reintentos fallan,
  // el plan externo queda huérfano (nunca se borra ni se reintenta
  // indefinidamente) y se deja rastro en logs para reparación manual — no hay
  // forma de listar planes de Mercado Pago por criterio propio para
  // reconciliarlo automáticamente (ver informe de viabilidad, sección 1).
  for (let attemptCount = 0; !persisted && attemptCount < MAX_PROVISIONING_PERSIST_RETRIES; attemptCount += 1) {
    persisted = await markCheckoutAttemptReady({ attemptId: attempt.id, providerCheckoutPlanId: created.providerPlanId });
  }

  if (!persisted) {
    logServerError("provisionExclusiveCheckoutPlan:persist_failed_after_remote_success", { attemptId: attempt.id });
    throw new CheckoutError(
      "provider_error",
      "El checkout se creó con el proveedor de pagos pero no se pudo confirmar localmente. Intentá de nuevo.",
    );
  }

  return remote.initPoint;
}

/**
 * Único punto de entrada del checkout (Paso 2.1). El frontend nunca envía
 * precio, moneda, `provider_plan_id` ni ningún otro dato financiero: solo
 * `planId` y `email` — todo lo demás se resuelve server-side.
 *
 * Correlación determinística: cada intento de checkout crea su propio
 * `preapproval_plan` exclusivo en Mercado Pago (nunca reutiliza el
 * `provider_plan_id` compartido del catálogo). El webhook correlaciona la
 * suscripción real contra ese id exclusivo — nunca por email, orden temporal
 * ni monto (ver `src/lib/payments/reconciliation.ts`).
 */
async function createMembershipCheckout(params: CreateMembershipCheckoutParams): Promise<CreateMembershipCheckoutResult> {
  if (!isDeterministicCheckoutEnabled()) {
    throw new CheckoutError(
      "deterministic_checkout_disabled",
      "El checkout no está habilitado en este entorno (MERCADO_PAGO_DETERMINISTIC_CHECKOUT).",
    );
  }

  const parsedEmail = emailSchema.safeParse(params.email);
  if (!parsedEmail.success) {
    throw new CheckoutError("invalid_email", "El correo ingresado no tiene un formato válido.");
  }
  const email = parsedEmail.data;

  const plan = await getPlanById(params.planId);
  if (!plan) {
    throw new CheckoutError("plan_not_found", "El plan indicado no existe.");
  }
  if (!plan.isActive) {
    throw new CheckoutError("plan_inactive", "El plan indicado no está disponible.");
  }
  if (plan.provider !== "mercado_pago" || !plan.providerPlanId) {
    throw new CheckoutError("plan_not_provider_ready", "El plan indicado todavía no tiene un proveedor de pagos configurado.");
  }

  const token = getMercadoPagoAccessToken();
  if (isMercadoPagoTestCredential(token) && !isSandboxCheckoutEnabled()) {
    throw new CheckoutError(
      "sandbox_checkout_disabled",
      "El checkout Sandbox no está habilitado en este entorno (SANDBOX_CHECKOUT_ENABLED).",
    );
  }

  const existing = await getCurrentMembershipForEmail(email);

  if (existing && CURRENT_MEMBERSHIP_STATUSES.includes(existing.status) && existing.status !== "pending") {
    throw new CheckoutError("membership_already_active", "Ya existe una membresía vigente para ese correo.");
  }

  let membershipId: string;

  if (existing && existing.status === "pending" && existing.planId === plan.id) {
    membershipId = existing.id;
  } else {
    if (existing && existing.status === "pending") {
      // Pending de otro plan: se invalida localmente (nunca hay una
      // suscripción externa que cancelar acá — con el flujo determinístico
      // tampoco hay un preapproval_plan exclusivo todavía si el intento
      // nunca llegó a `ready`; si llegó, queda simplemente sin uso y expira
      // por el job de limpieza).
      try {
        await transitionMembershipStatus({
          membershipId: existing.id,
          newStatus: "canceled",
          source: "system",
          reason: "Reemplazada por un nuevo intento de checkout de otro plan.",
        });
      } catch (error) {
        logServerError("createMembershipCheckout:invalidate_stale_pending_failed", error);
      }
    }

    const created = await createPendingMembership({
      email,
      planId: plan.id,
      provider: "mercado_pago",
      providerCustomerId: null,
      providerSubscriptionId: null,
      providerStatus: null,
      metadata: isMercadoPagoTestCredential(token) ? { sandbox: true } : {},
    });
    membershipId = created.id;
  }

  const attempt = await beginCheckoutAttempt({
    membershipId,
    membershipPlanId: plan.id,
    provider: "mercado_pago",
  });

  if (attempt.status === "ready" || attempt.status === "redirected") {
    if (!attempt.providerCheckoutPlanId) {
      // Estado inconsistente (no debería ocurrir: `ready` siempre se
      // persiste junto con el id) — se trata como fallo de proveedor en vez
      // de asumir nada.
      logServerError("createMembershipCheckout:ready_without_checkout_plan_id", { attemptId: attempt.id });
      throw new CheckoutError("provider_error", "No se pudo recuperar el checkout de este intento.");
    }
    const checkoutUrl = await resolveCheckoutUrlForReadyAttempt(attempt.providerCheckoutPlanId);
    return { checkoutUrl };
  }

  // attempt.status === "creating": reclamar el derecho a provisionar. Si
  // otra request concurrente ya lo reclamó (doble click / carrera), no se
  // crea un segundo `preapproval_plan` — se responde que hay un checkout en
  // curso para que el cliente reintente en segundos.
  const claimed = await claimCheckoutAttemptForProvisioning(attempt.id);
  if (!claimed) {
    const fresh = await getCheckoutAttemptById(attempt.id);
    if (fresh && (fresh.status === "ready" || fresh.status === "redirected") && fresh.providerCheckoutPlanId) {
      const checkoutUrl = await resolveCheckoutUrlForReadyAttempt(fresh.providerCheckoutPlanId);
      return { checkoutUrl };
    }
    throw new CheckoutError("checkout_in_progress", "Ya hay un checkout en curso para esta contratación. Esperá unos segundos e intentá de nuevo.");
  }

  const checkoutUrl = await provisionExclusiveCheckoutPlan({ attempt: claimed, plan });
  return { checkoutUrl };
}

export { createMembershipCheckout, CheckoutError };
