import "server-only";

import { normalizePublicAppUrl } from "@/lib/utils/public-app-url";

/**
 * URL pública server-only usada exclusivamente para construir URLs enviadas
 * a Mercado Pago (`back_url` del plan, URL del webhook) — deliberadamente
 * distinta de `NEXT_PUBLIC_SITE_URL` (que es pública en el bundle cliente y
 * se usa para links de recuperación de contraseña). Nunca deriva de headers
 * (`Host`/`X-Forwarded-Host`): solo lee la variable de entorno, para no
 * quedar expuesta a un host falsificado por el llamador.
 */
function getPublicAppUrl(): string {
  return normalizePublicAppUrl(process.env.PUBLIC_APP_URL, process.env.NODE_ENV === "production");
}

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

/**
 * Habilita el checkout público mientras el proyecto opera con credenciales
 * `TEST-` (Sandbox). Default `false` — sin esta flag, `createMembershipCheckout`
 * rechaza el intento con un 503 aunque el plan esté activo. Existe para poder
 * probar el circuito real en un entorno público controlado sin dejar el
 * checkout Sandbox permanentemente accesible.
 */
function isSandboxCheckoutEnabled(): boolean {
  return process.env.SANDBOX_CHECKOUT_ENABLED === "true";
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

/**
 * Paso 2.1: habilita la correlación determinística de checkout (un
 * `preapproval_plan` exclusivo por intento, ver `src/lib/payments/checkout.ts`).
 * Server-only, default `false` hasta terminar la migración y las pruebas —
 * mientras esté en `false`, el checkout se rechaza explícitamente en vez de
 * caer de vuelta al flujo heurístico por email (eliminado del código activo).
 */
function isDeterministicCheckoutEnabled(): boolean {
  return process.env.MERCADO_PAGO_DETERMINISTIC_CHECKOUT === "true";
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
  getPublicAppUrl,
  getMercadoPagoAccessToken,
  isMercadoPagoTestCredential,
  isSandboxCheckoutEnabled,
  getMercadoPagoWebhookSecret,
  allowUnsignedMercadoPagoWebhooks,
  getMembershipGracePeriodDays,
  isDeterministicCheckoutEnabled,
};
