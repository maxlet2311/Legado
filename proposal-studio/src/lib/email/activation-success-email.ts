import "server-only";

import { sendTransactionalEmail } from "@/lib/email/client";
import { getSiteUrl } from "@/lib/utils/env";
import { buildActivationSuccessEmailContent } from "@/lib/email/activation-success-email-content";

const SUBJECT = "Tu cuenta ya está activa en Proposal Studio™";

/**
 * Envío best-effort (Sprint 3): se llama al final de `activateAccount` una
 * vez que la cuenta ya quedó creada y confirmada. Nunca debe poder revertir
 * ni bloquear la activación si falla — el llamador la envuelve en try/catch
 * y solo loguea el error.
 */
async function sendActivationSuccessEmail(params: { email: string }): Promise<void> {
  const loginUrl = `${getSiteUrl()}/login`;
  const { html, text } = buildActivationSuccessEmailContent(loginUrl);

  await sendTransactionalEmail({
    to: params.email,
    subject: SUBJECT,
    html,
    text,
  });
}

export { sendActivationSuccessEmail };
