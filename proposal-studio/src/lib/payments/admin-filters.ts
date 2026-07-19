/**
 * Parsers puros para los `searchParams` de `/admin/payments/events` y
 * `/admin/payments/checkouts` — mismo criterio que el resto del panel admin
 * (filtros como querystring, aplicados server-side). Sin `server-only`: se
 * testea directo, sin mocks de Supabase.
 */

type SearchParamValue = string | string[] | undefined;

function single(value: SearchParamValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

function parsePage(value: SearchParamValue): number {
  const raw = single(value);
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** `undefined` si el valor no está en la lista permitida — nunca se pasa un filtro inválido a la query real. */
function parseEnumParam<T extends string>(value: SearchParamValue, allowed: readonly T[]): T | undefined {
  const raw = single(value);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

/** `"yes"`/`"no"` -> booleano; cualquier otro valor (incluido ausente) -> `undefined` (sin filtro). */
function parseTriState(value: SearchParamValue): boolean | undefined {
  const raw = single(value);
  if (raw === "yes") return true;
  if (raw === "no") return false;
  return undefined;
}

/** Valida que sea una fecha ISO parseable — nunca se pasa un string arbitrario del usuario directo al `gte`/`lte` de la query. */
function parseIsoDate(value: SearchParamValue): string | undefined {
  const raw = single(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export { single, parsePage, parseEnumParam, parseTriState, parseIsoDate };
