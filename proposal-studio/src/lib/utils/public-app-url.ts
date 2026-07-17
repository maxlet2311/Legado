/**
 * Lógica pura de normalización/validación de `PUBLIC_APP_URL`, separada de
 * `env.ts` (server-only) para poder testearla directo con `node --test` sin
 * pasar por el guard de `server-only` (mismo patrón que
 * `src/lib/payments/plan-comparison.ts` frente a `plan-provisioning.ts`).
 */
function normalizePublicAppUrl(raw: string | undefined, isProduction: boolean): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new Error("Falta PUBLIC_APP_URL: requerida para construir URLs públicas usadas por el proveedor de pagos.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("PUBLIC_APP_URL debe ser una URL absoluta válida (no se aceptan rutas relativas).");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`PUBLIC_APP_URL usa un esquema no permitido (${parsed.protocol}) — solo se acepta http o https.`);
  }

  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  if (parsed.protocol !== "https:" && !(isLocalhost && !isProduction)) {
    throw new Error("PUBLIC_APP_URL debe usar https — http solo se acepta contra localhost en desarrollo.");
  }

  if (parsed.hostname === "example.com" || parsed.hostname.endsWith(".example.com")) {
    throw new Error("PUBLIC_APP_URL no puede apuntar a example.com — es un placeholder, configurá la URL real.");
  }

  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}

export { normalizePublicAppUrl };
