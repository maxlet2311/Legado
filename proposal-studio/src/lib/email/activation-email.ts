import "server-only";

import { sendTransactionalEmail } from "@/lib/email/client";
import { getSiteUrl } from "@/lib/utils/env";
import { buildActivationEmailContent } from "@/lib/email/activation-email-content";

const SUBJECT = "Activá tu cuenta en Proposal Studio™";

/**
 * Envía el correo de activación. El token solo existe en memoria durante
 * esta llamada (viene del caller, que a su vez lo recibió recién generado de
 * `createActivationInvitation`) — nunca se loguea el token ni la URL
 * completa acá ni en `client.ts`. Si el envío falla (incluida la omisión
 * intencional por `EMAIL_ENABLED=false`, ver `EmailDisabledError`), el
 * llamador es responsable de decidir qué hacer con la invitación recién
 * creada (ver `issueAndSendActivationInvitation` en
 * `account-activation/service.ts`).
 */
async function sendActivationEmail(params: { email: string; token: string; expiresAt?: string }): Promise<void> {
  const activationUrl = `${getSiteUrl()}/activate-account?token=${params.token}`;
  const { html, text } = buildActivationEmailContent(activationUrl, params.expiresAt);

  await sendTransactionalEmail({
    to: params.email,
    subject: SUBJECT,
    html,
    text,
  });
}

export { sendActivationEmail };
