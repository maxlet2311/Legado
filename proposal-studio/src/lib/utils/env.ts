import "server-only";

/**
 * En producción NEXT_PUBLIC_SITE_URL es obligatoria: sin ella, los links de
 * recuperación de contraseña quedarían apuntando a localhost. Falla explícito
 * en servidor en vez de degradar silenciosamente.
 */
function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL no está configurada. Es obligatoria en producción para generar URLs de recuperación de contraseña correctas.",
    );
  }

  return "http://localhost:3000";
}

export { getSiteUrl };
