// Deliberadamente NO incluye códigos que revelen si una cuenta existe
// (ej. "user_not_found", "email_not_confirmed"): los flujos de login y reset
// de contraseña nunca deben poder distinguir "no existe" de "credenciales
// incorrectas" a partir de este mapa.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "invalid_credentials": "Correo o contraseña incorrectos.",
  "invalid_login_credentials": "Correo o contraseña incorrectos.",
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

/**
 * Registra un error técnico server-side (consola/log del server) sin
 * exponerlo nunca al cliente. Usar en vez de dejar que `error.message`/`code`
 * de Supabase lleguen crudos a la respuesta de una Server Action.
 */
function logServerError(context: string, error: unknown): void {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: string; message?: string };
    console.error(`[${context}]`, { code, message });
    return;
  }
  console.error(`[${context}]`, error);
}

export { mapSupabaseError, detectConflict, logServerError };
