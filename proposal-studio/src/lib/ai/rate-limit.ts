import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";

/**
 * Chequeo + reserva atómica (RPC `check_and_record_ai_usage`, ver migración
 * `20260721000000_rc_hardening_ai_rate_limit.sql`): un único round-trip que
 * cuenta y reserva el uso dentro de la misma transacción, serializado por
 * usuario vía advisory lock. Evita la carrera que existía cuando "chequear"
 * y "registrar" eran dos llamadas separadas. Se llama ANTES del proveedor de
 * IA: si la generación falla después, el cupo ya se gastó (aceptable -- el
 * usuario conserva el resto de sus 30/hora, el sistema nunca queda bloqueado).
 * Nunca loguea el prompt ni la respuesta, solo el nombre de la feature.
 */
async function checkAndRecordAiUsage(
  supabase: SupabaseClient<Database>,
  params: { proposalId: string; feature: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .rpc("check_and_record_ai_usage", { p_proposal_id: params.proposalId, p_feature: params.feature })
    .single();

  if (error) {
    // Si no podemos verificar/reservar el límite, no bloqueamos la asistencia de IA.
    return { ok: true };
  }
  if (!data?.allowed) {
    return { ok: false, error: "Alcanzaste el límite de sugerencias de IA por hora. Probá de nuevo más tarde." };
  }
  return { ok: true };
}

export { checkAndRecordAiUsage };
