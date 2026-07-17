import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/types";

/**
 * Cliente con `SUPABASE_SERVICE_ROLE_KEY`: bypassea RLS por completo. Nunca
 * importar desde un componente cliente ni exponer su resultado a la
 * respuesta de una Server Action/Route Handler sin filtrar los campos.
 * Reservado a servicios server-only que necesitan operar fuera del contexto
 * de sesión de un usuario (ej. `src/lib/account-activation`, que gestiona
 * invitaciones antes de que exista ninguna sesión).
 */
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY: requeridas para el cliente administrativo.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { createAdminClient };
