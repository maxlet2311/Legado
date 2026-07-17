/** Lógica pura de armado del contenido, separada de `activation-success-email.ts` (server-only) — mismo criterio que `activation-email-content.ts`. */

function buildActivationSuccessEmailContent(loginUrl: string): { html: string; text: string } {
  const html = `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; padding:32px;">
            <tr><td>
              <p style="font-size:13px; color:#999; margin:0 0 16px; text-transform:uppercase; letter-spacing:0.05em;">Proposal Studio™</p>
              <h1 style="font-size:20px; margin:0 0 16px;">Tu cuenta fue activada</h1>
              <p style="font-size:14px; color:#333; line-height:1.5;">
                Ya podés ingresar al sistema con tu correo y la contraseña que elegiste.
              </p>
              <p style="text-align:center; margin:24px 0;">
                <a href="${loginUrl}" style="background:#111; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-size:14px; display:inline-block;">
                  Ingresar al sistema
                </a>
              </p>
              <p style="font-size:12px; color:#999; margin-top:24px;">
                Si no reconocés esta actividad, contactá al administrador de tu cuenta.
              </p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Tu cuenta fue activada en Proposal Studio™",
    "",
    "Ya podés ingresar al sistema con tu correo y la contraseña que elegiste:",
    "",
    loginUrl,
    "",
    "Si no reconocés esta actividad, contactá al administrador de tu cuenta.",
  ].join("\n");

  return { html, text };
}

export { buildActivationSuccessEmailContent };
