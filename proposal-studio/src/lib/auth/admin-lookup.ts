import "server-only";

import { createAdminClient } from "@/lib/database/admin";

interface AuthUserLookupResult {
  id: string;
  email: string;
}

/**
 * Busca un usuario de Supabase Auth por email exacto (case-insensitive) vía
 * Admin API, paginando hasta encontrarlo. Usado tanto para no emitir
 * invitaciones de activación imposibles de consumir
 * (`account-activation/service.ts`) como para vincular automáticamente una
 * membresía pagada a una cuenta ya existente
 * (`payments/subscription-sync.ts`, Etapa 4 sección 21). Devuelve `null`
 * tanto si no existe como si la búsqueda falla — nunca bloquea el flujo
 * llamador por un error transitorio de red.
 */
async function findAuthUserByEmail(email: string): Promise<AuthUserLookupResult | null> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data) {
      return null;
    }

    const match = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (match) {
      return { id: match.id, email: normalizedEmail };
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

export { findAuthUserByEmail };
export type { AuthUserLookupResult };
