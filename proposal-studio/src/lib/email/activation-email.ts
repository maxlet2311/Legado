import "server-only";

import { sendTransactionalEmail } from "@/lib/email/client";
import { getSiteUrl } from "@/lib/utils/env";

const SUBJECT = "Activá tu cuenta en Proposal Studio™";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildActivationEmailContent(activationUrl: string): { html: string; text: string } {
  const safeUrl = escapeHtml(activationUrl);

  const html = `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; padding:32px;">
            <tr><td>
              <h1 style="font-size:20px; margin:0 0 16px;">Activá tu cuenta</h1>
              <p style="font-size:14px; color:#333; line-height:1.5;">
                Recibimos una solicitud para activar tu cuenta en Proposal Studio™. Hacé clic en el siguiente botón para completar la activación. Este enlace expira pronto y solo puede usarse una vez.
              </p>
              <p style="text-align:center; margin:24px 0;">
                <a href="${safeUrl}" style="background:#111; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-size:14px; display:inline-block;">
                  Activar mi cuenta
                </a>
              </p>
              <p style="font-size:12px; color:#777; line-height:1.5;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br />
                <span style="word-break:break-all;">${safeUrl}</span>
              </p>
              <p style="font-size:12px; color:#999; margin-top:24px;">
                Si no solicitaste esto, podés ignorar este correo.
              </p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Activá tu cuenta en Proposal Studio™",
    "",
    "Recibimos una solicitud para activar tu cuenta. Abrí el siguiente enlace para completar la activación (expira pronto y solo puede usarse una vez):",
    "",
    activationUrl,
    "",
    "Si no solicitaste esto, podés ignorar este correo.",
  ].join("\n");

  return { html, text };
}

/**
 * Envía el correo de activación. El token solo existe en memoria durante
 * esta llamada (viene del caller, que a su vez lo recibió recién generado de
 * `createActivationInvitation`) — nunca se loguea el token ni la URL
 * completa acá ni en `client.ts`. Si el envío falla, el llamador es
 * responsable de revocar la invitación recién creada (ver
 * `issueAndSendActivationInvitation` en `account-activation/service.ts`).
 */
async function sendActivationEmail(params: { email: string; token: string }): Promise<void> {
  const activationUrl = `${getSiteUrl()}/activate-account?token=${params.token}`;
  const { html, text } = buildActivationEmailContent(activationUrl);

  await sendTransactionalEmail({
    to: params.email,
    subject: SUBJECT,
    html,
    text,
  });
}

export { sendActivationEmail };
