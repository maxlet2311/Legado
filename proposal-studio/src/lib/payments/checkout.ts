import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getPlanById } from "@/lib/memberships/repository";
import { createPendingMembership, getCurrentMembershipForEmail, transitionMembershipStatus } from "@/lib/memberships/service";
import { CURRENT_MEMBERSHIP_STATUSES } from "@/lib/memberships/types";
import { getSubscriptionProvider, buildMembershipExternalReference, PaymentProviderError } from "@/lib/payments/index";
import { getSiteUrl } from "@/lib/utils/env";
import { logServerError } from "@/lib/utils/errors";

class CheckoutError extends Error {
  code:
    | "invalid_email"
    | "plan_not_found"
    | "plan_inactive"
    | "plan_not_provider_ready"
    | "membership_already_active"
    | "provider_error";

  constructor(code: CheckoutError["code"], message: string) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
  }
}

const emailSchema = z.string().trim().toLowerCase().email();

interface CreateMembershipCheckoutParams {
  email: string;
  planId: string;
}

interface CreateMembershipCheckoutResult {
  checkoutUrl: string;
}

/**
 * Único punto de entrada del checkout (Etapa 4, sección 9). El frontend
 * nunca envía precio, moneda ni ningún dato del proveedor: solo `planId` y
 * `email` — todo lo demás se resuelve server-side contra `membership_plans`.
 *
 * Estrategia para `pending` existente (sección 9, "casos especiales"): se
 * invalida la anterior (se cancela su suscripción en el proveedor si tenía
 * una, best-effort, y se transiciona localmente a `canceled`) y se permite
 * una nueva — nunca se reutiliza un `init_point` viejo porque Mercado Pago no
 * lo reexpone después de la creación inicial.
 */
async function createMembershipCheckout(params: CreateMembershipCheckoutParams): Promise<CreateMembershipCheckoutResult> {
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

  const existing = await getCurrentMembershipForEmail(email);

  if (existing && CURRENT_MEMBERSHIP_STATUSES.includes(existing.status) && existing.status !== "pending") {
    throw new CheckoutError("membership_already_active", "Ya existe una membresía vigente para ese correo.");
  }

  const provider = getSubscriptionProvider("mercado_pago");

  if (existing && existing.status === "pending") {
    if (existing.provider === "mercado_pago" && existing.providerSubscriptionId) {
      try {
        await provider.cancelSubscription(existing.providerSubscriptionId);
      } catch (error) {
        // Best-effort: puede que Mercado Pago ya la haya expirado/cancelado
        // por su cuenta. No bloquea la creación del nuevo intento.
        logServerError("createMembershipCheckout:cancel_stale_pending_failed", error);
      }
    }
    try {
      await transitionMembershipStatus({
        membershipId: existing.id,
        newStatus: "canceled",
        source: "system",
        reason: "Reemplazada por un nuevo intento de checkout.",
      });
    } catch (error) {
      // Conflicto de concurrencia u otro error de transición: se deja
      // registrado y se intenta igual crear la nueva membresía — si la
      // anterior sigue vigente, el índice único de la base lo va a rechazar
      // (`duplicate_active_membership`, traducido más abajo).
      logServerError("createMembershipCheckout:invalidate_stale_pending_failed", error);
    }
  }

  const membershipId = randomUUID();
  const backUrl = `${getSiteUrl()}/suscripcion/resultado`;

  let subscription;
  try {
    subscription = await provider.createSubscription({
      providerPlanId: plan.providerPlanId,
      payerEmail: email,
      externalReference: buildMembershipExternalReference(membershipId),
      backUrl,
    });
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      throw new CheckoutError("provider_error", "No se pudo iniciar la suscripción con el proveedor de pagos.");
    }
    throw error;
  }

  // Ventana de inconsistencia conocida (documentada, no resuelta en esta
  // etapa): si la suscripción ya se creó en Mercado Pago pero esta inserción
  // falla (ej. una carrera con otro checkout concurrente para el mismo
  // email), la suscripción del proveedor queda huérfana sin membresía local
  // que la referencie. Requeriría una transacción distribuida o un paso de
  // reconciliación proactivo (buscar preapprovals sin membresía asociada) —
  // fuera de alcance de la Etapa 4; el webhook igual no podrá aplicarse
  // porque no habrá `memberships.provider_subscription_id` que matchear.
  await createPendingMembership({
    id: membershipId,
    email,
    planId: plan.id,
    provider: "mercado_pago",
    providerSubscriptionId: subscription.providerSubscriptionId,
    providerStatus: subscription.status,
  });

  return { checkoutUrl: subscription.checkoutUrl };
}

export { createMembershipCheckout, CheckoutError };
