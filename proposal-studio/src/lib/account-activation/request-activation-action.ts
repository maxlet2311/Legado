"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getCurrentMembershipForEmail } from "@/lib/memberships/service";
import { ACTIVATION_ELIGIBLE_STATUSES } from "@/lib/memberships/types";
import { issueAndSendActivationInvitation } from "@/lib/account-activation/service";
import { ActivationServiceError } from "@/lib/account-activation/types";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

interface RequestActivationResult {
  success: boolean;
}

const NEUTRAL_RESULT: RequestActivationResult = { success: true };

const requestActivationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

async function requestIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Estrategia de "generación bajo demanda" (Etapa 5, sección 2): el token no
 * se genera hasta que el usuario lo solicita acá. Si tiene una membresía
 * elegible (`authorized`/`active`) sin cuenta vinculada, se emite un token
 * nuevo (revocando cualquier invitación pendiente previa —
 * `createActivationInvitation` ya lo hace) y se envía por email de
 * inmediato. Si el envío falla, la invitación se revoca automáticamente
 * (ver `issueAndSendActivationInvitation`) y el usuario puede reintentar.
 *
 * La respuesta al cliente es siempre el mismo mensaje neutral: nunca revela
 * si existe cuenta, membresía, pago, ni si el email fue encontrado.
 */
async function requestActivationAction(
  _prevState: RequestActivationResult,
  formData: FormData,
): Promise<RequestActivationResult> {
  const parsed = requestActivationSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return NEUTRAL_RESULT;
  }

  const ip = await requestIp();
  if (!checkRateLimit(`request-activation:${ip}`, 5, 15 * 60_000)) {
    return NEUTRAL_RESULT;
  }
  // Segundo límite por email (además del de IP): evita que alguien con
  // muchas IPs distintas bombardee de emails a una única víctima.
  if (!checkRateLimit(`request-activation:email:${parsed.data.email}`, 3, 15 * 60_000)) {
    return NEUTRAL_RESULT;
  }

  try {
    const membership = await getCurrentMembershipForEmail(parsed.data.email).catch(() => null);
    const eligible = membership && !membership.userId && ACTIVATION_ELIGIBLE_STATUSES.includes(membership.status);

    if (eligible) {
      const result = await issueAndSendActivationInvitation({ membershipId: membership.id });
      console.log("[account-activation] resend_requested", {
        membershipId: membership.id,
        sent: result.success,
      });
    } else {
      console.log("[account-activation] resend_requested", { eligible: false });
    }
  } catch (error) {
    if (!(error instanceof ActivationServiceError)) {
      logServerError("requestActivationAction", error);
    }
  }

  return NEUTRAL_RESULT;
}

export { requestActivationAction };
