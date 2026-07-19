/**
 * Traduce el resultado de `reconcileSubscriptionAction` (Server Action de
 * `/admin/payments`) a un mensaje legible para el Platform Owner. Lógica
 * pura, sin `server-only`, para poder testearla directo — mismo criterio que
 * `webhook-event-status.ts`/`target-status.ts`.
 */

interface ReconcileResultInput {
  error?: string;
  matched?: boolean;
  reason?: string;
  applied?: boolean;
  skipReason?: string | null;
  status?: string;
}

interface ReconcileResultSummary {
  tone: "success" | "warning" | "error";
  title: string;
  description: string;
}

const UNMATCHED_REASON_COPY: Record<string, string> = {
  unmatched: "No se encontró ningún intento de checkout local que coincida con esta suscripción por su plan exclusivo.",
  multiple_attempts_conflict: "Se encontraron varios intentos de checkout en conflicto para el mismo plan exclusivo — requiere revisión manual antes de reintentar.",
  attempt_membership_missing: "El intento de checkout coincidente ya no tiene una membresía asociada (posible dato inconsistente) — requiere revisión manual.",
};

const SKIP_REASON_COPY: Record<string, string> = {
  external_reference_mismatch: "La referencia externa de la suscripción no coincide con la membresía resuelta — no se aplicó ningún cambio, por seguridad.",
  not_applicable_for_current_status: "El estado remoto no habilita ninguna transición desde el estado actual de la membresía.",
  already_current: "La membresía ya estaba en el estado que reporta el proveedor — no había nada que cambiar.",
  invalid_transition: "La transición de estado que sugiere el proveedor no es válida desde el estado actual — no se aplicó ningún cambio.",
  unknown_provider_status: "El proveedor devolvió un estado no reconocido — no se aplicó ningún cambio.",
};

function buildReconcileResultSummary(result: ReconcileResultInput): ReconcileResultSummary {
  if (result.error) {
    return { tone: "error", title: "No se pudo reconciliar", description: result.error };
  }

  if (result.matched === false) {
    const reason = result.reason ?? "unmatched";
    return {
      tone: "warning",
      title: "Sin coincidencia",
      description: UNMATCHED_REASON_COPY[reason] ?? "No se pudo correlacionar esta suscripción con ningún intento de checkout local.",
    };
  }

  if (result.matched === true) {
    if (result.applied) {
      return {
        tone: "success",
        title: "Reconciliación aplicada",
        description: `La membresía quedó en estado "${result.status ?? "desconocido"}" tras sincronizar con el proveedor.`,
      };
    }

    const skipReason = result.skipReason ?? undefined;
    return {
      tone: "warning",
      title: "Coincidencia encontrada, sin cambios aplicados",
      description: skipReason ? (SKIP_REASON_COPY[skipReason] ?? skipReason) : "No se aplicó ningún cambio.",
    };
  }

  return { tone: "warning", title: "Sin resultado", description: "No se recibió una respuesta interpretable." };
}

export { buildReconcileResultSummary };
export type { ReconcileResultInput, ReconcileResultSummary };
