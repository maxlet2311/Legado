import "server-only";

/**
 * En producción real NEXT_PUBLIC_SITE_URL es obligatoria: sin ella, los links
 * de recuperación de contraseña quedarían apuntando a localhost. Falla
 * explícito en servidor en vez de degradar silenciosamente.
 *
 * En preview deploys de Vercel (`VERCEL_ENV=preview`) `NODE_ENV` también vale
 * "production", así que ahí se acepta el fallback a `VERCEL_URL` (dominio de
 * la propia preview, provisto automáticamente por Vercel) en vez de exigir la
 * variable — de lo contrario cada preview rompería el flujo de reset.
 */
function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const isRealProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";

  if (isRealProduction) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL no está configurada. Es obligatoria en producción para generar URLs de recuperación de contraseña correctas.",
    );
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

/**
 * Access Token de Mercado Pago (server-only). Empieza con `TEST-` en
 * credenciales de prueba y `APP_USR-` en producción — eso es lo que distingue
 * ambos entornos, Mercado Pago no expone un flag separado para esto.
 */
function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("Falta MERCADO_PAGO_ACCESS_TOKEN: requerida para operar contra la API de Mercado Pago.");
  }
  return token;
}

function isMercadoPagoTestCredential(token: string): boolean {
  return token.startsWith("TEST-");
}

function getMercadoPagoWebhookSecret(): string {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Falta MERCADO_PAGO_WEBHOOK_SECRET: requerida para validar la firma de los webhooks.");
  }
  return secret;
}

/**
 * Escape hatch SOLO para desarrollo local sin túnel de webhooks configurado
 * en el dashboard de Mercado Pago. Nunca debe activarse en producción: se
 * ignora explícitamente salvo `NODE_ENV !== "production"`.
 */
function allowUnsignedMercadoPagoWebhooks(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS === "true";
}

const DEFAULT_MEMBERSHIP_GRACE_PERIOD_DAYS = 5;

/** Días de gracia tras un pago rechazado/mora antes de perder acceso (`past_due` → `access: grace`). */
function getMembershipGracePeriodDays(): number {
  const raw = process.env.MEMBERSHIP_GRACE_PERIOD_DAYS?.trim();
  if (!raw) return DEFAULT_MEMBERSHIP_GRACE_PERIOD_DAYS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MEMBERSHIP_GRACE_PERIOD_DAYS;
}

export {
  getSiteUrl,
  getMercadoPagoAccessToken,
  isMercadoPagoTestCredential,
  getMercadoPagoWebhookSecret,
  allowUnsignedMercadoPagoWebhooks,
  getMembershipGracePeriodDays,
};
