/**
 * Sanitización pura para mostrar JSON en la UI de auditoría
 * (`before_data`/`after_data`/`metadata` de `admin_audit_events`). Nunca muta
 * el valor original — siempre devuelve una copia. No reemplaza el criterio
 * de la capa de aplicación de no persistir secretos en esas columnas (ver
 * comentario en `20260717010000_admin_audit_events.sql`); es una segunda
 * capa defensiva en la representación, por si algún día se cuela un valor
 * sensible.
 */

const SENSITIVE_KEY_FRAGMENTS = [
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "apikey",
  "authorization",
  "cookie",
  "jwt",
  "signature",
  "servicerole",
];

const REDACTED = "[REDACTADO]";

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/** Recorre recursivamente objetos/arrays y redacta valores cuya clave matchea (case-insensitive) alguna palabra sensible. */
function sanitizeForDisplay(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForDisplay(item));
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(
      entries.map(([key, val]) => [key, isSensitiveKey(key) ? REDACTED : sanitizeForDisplay(val)]),
    );
  }

  return value;
}

export { sanitizeForDisplay, isSensitiveKey };
