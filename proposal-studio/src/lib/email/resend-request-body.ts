/** Lógica pura de armado del body de la API de Resend, separada de `client.ts` (server-only) — mismo criterio que `activation-email-content.ts`. */

interface BuildResendRequestBodyParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

function buildResendRequestBody(params: BuildResendRequestBodyParams): Record<string, unknown> {
  return {
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    ...(params.headers ? { headers: params.headers } : {}),
  };
}

export { buildResendRequestBody };
export type { BuildResendRequestBodyParams };
