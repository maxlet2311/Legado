const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "invalid_credentials": "Correo o contraseña incorrectos.",
  "invalid_login_credentials": "Correo o contraseña incorrectos.",
  "email_not_confirmed": "Tu cuenta todavía no fue confirmada. Contactá a tu administrador.",
  "user_not_found": "No encontramos una cuenta con ese correo.",
  "over_request_rate_limit": "Demasiados intentos. Esperá unos minutos e intentá de nuevo.",
  "same_password": "La nueva contraseña debe ser distinta a la actual.",
  "weak_password": "La contraseña es demasiado débil. Usá al menos 8 caracteres.",
};

/** SQLSTATE custom levantado por los RPC de autosave cuando p_expected_revision no coincide. */
const CONCURRENCY_CONFLICT_SQLSTATE = "PS409";

interface ConflictInfo {
  isConflict: boolean;
  currentRevision: number | null;
}

/** Detecta el conflicto de concurrencia optimista y extrae la revision actual del `detail`. */
function detectConflict(
  error: { code?: string; details?: string } | null | undefined,
): ConflictInfo {
  if (!error || error.code !== CONCURRENCY_CONFLICT_SQLSTATE) {
    return { isConflict: false, currentRevision: null };
  }
  const parsed = error.details ? Number.parseInt(error.details, 10) : NaN;
  return { isConflict: true, currentRevision: Number.isFinite(parsed) ? parsed : null };
}

function mapSupabaseError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Ocurrió un error inesperado. Intentá de nuevo.";

  const knownMessage = error.code ? AUTH_ERROR_MESSAGES[error.code] : undefined;
  if (knownMessage) {
    return knownMessage;
  }

  // P0001: excepciones de negocio levantadas a mano en RPCs (mensaje ya en español,
  // pensado para mostrarse tal cual al usuario, ej. validaciones de finalize_proposal).
  if (error.code === "P0001" && error.message) {
    return error.message;
  }

  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("network")) {
    return "No pudimos conectar con el servidor. Revisá tu conexión.";
  }

  return "Ocurrió un error inesperado. Intentá de nuevo.";
}

export { mapSupabaseError, detectConflict };
