const DEFAULT_REDIRECT_PATH = "/dashboard";

/**
 * Único punto de validación para destinos de redirección post-login
 * (`redirectTo`/`next`/`returnTo`/`callbackUrl`). Solo acepta rutas internas
 * que empiezan con un único `/`; cualquier otro valor (URL absoluta,
 * protocolo externo, `//host` con host-relative trick, backslash) cae al
 * destino seguro por defecto.
 */
function sanitizeRedirectPath(value: FormDataEntryValue | string | null | undefined, fallback: string = DEFAULT_REDIRECT_PATH): string {
  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  if (!value.startsWith("/")) {
    return fallback;
  }

  if (value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }

  if (value.includes("://")) {
    return fallback;
  }

  return value;
}

export { sanitizeRedirectPath, DEFAULT_REDIRECT_PATH };
