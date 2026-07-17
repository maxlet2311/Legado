import "server-only";

import { sendTransactionalEmail } from "@/lib/email/client";
import { getSiteUrl } from "@/lib/utils/env";
import { buildInvitationExpiredEmailContent } from "@/lib/email/invitation-expired-email-content";

const SUBJECT = "Tu invitación a Proposal Studio™ venció";

/**
 * Envío best-effort (Sprint 3): se dispara desde la acción administrativa de
 * "forzar expiración" para avisarle al destinatario que puede pedir una
 * invitación nueva. Nunca debe bloquear esa acción administrativa si falla.
 */
async function sendInvitationExpiredEmail(params: { email: string }): Promise<void> {
  const requestUrl = `${getSiteUrl()}/request-activation`;
  const { html, text } = buildInvitationExpiredEmailContent(requestUrl);

  await sendTransactionalEmail({
    to: params.email,
    subject: SUBJECT,
    html,
    text,
  });
}

export { sendInvitationExpiredEmail };
