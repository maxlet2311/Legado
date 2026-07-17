/**
 * Separado de `oauth.ts` porque un archivo `"use server"` solo puede
 * exportar funciones async — ninguna otra exportación (constantes, tipos)
 * está permitida (Next.js lo rechaza en build). Compartido entre
 * `src/lib/auth/oauth.ts` (la Server Action que setea la cookie) y
 * `src/app/auth/callback/route.ts` (el Route Handler que la lee y la borra).
 */
const ACTIVATION_TOKEN_COOKIE = "psa_pending_token";
const ACTIVATION_TOKEN_TTL_SECONDS = 10 * 60;

export { ACTIVATION_TOKEN_COOKIE, ACTIVATION_TOKEN_TTL_SECONDS };
