import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new EmailDeliveryError("Falta RESEND_API_KEY: requerida para enviar correos transaccionales.");
  }
  return key;
}

function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new EmailDeliveryError("Falta EMAIL_FROM: requerida para enviar correos transaccionales.");
  }
  return from;
}

/**
 * Cliente central y mínimo de Resend (Etapa 5, sección 2). Se usa `fetch`
 * directo contra la API HTTP en vez de instalar el SDK oficial — mismo
 * criterio que el cliente de Mercado Pago (Etapa 4): una única función
 * centralizada, tipada, sin dependencias nuevas, fácil de mockear en tests.
 * `server-only`: nunca debe poder importarse desde un componente cliente
 * (expondría `RESEND_API_KEY`).
 *
 * Nunca loguea el destinatario completo, el asunto real, ni el cuerpo del
 * mensaje (puede contener el enlace de activación) — solo éxito/fallo y el
 * id de mensaje que devuelve Resend.
 */
async function sendTransactionalEmail(params: SendEmailParams): Promise<void> {
  const apiKey = getResendApiKey();
  const from = getEmailFrom();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let providerMessage: string | undefined;
      try {
        const body = (await response.json()) as { message?: string };
        providerMessage = body?.message;
      } catch {
        // body no-JSON: se ignora.
      }
      console.error("[email] delivery_failed", { status: response.status, message: providerMessage });
      throw new EmailDeliveryError(`Resend respondió ${response.status} al intentar enviar el correo.`);
    }
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    console.error("[email] delivery_network_error", error instanceof Error ? error.message : error);
    throw new EmailDeliveryError("No se pudo conectar con el proveedor de email.");
  } finally {
    clearTimeout(timeout);
  }
}

export { sendTransactionalEmail, EmailDeliveryError };
