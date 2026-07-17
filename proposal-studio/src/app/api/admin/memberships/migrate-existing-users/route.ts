import "server-only";

import { NextResponse } from "next/server";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import {
  migrateExistingUsersToAuthorizedMembership,
  migrateExistingUsersSchema,
  UserMigrationError,
} from "@/lib/memberships/user-migration";
import { logServerError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

/**
 * Migración controlada de usuarios existentes (Etapa 5, sección 7). Exclusivo
 * del Platform Owner. Nunca se ejecuta automáticamente — requiere
 * `planId`/`currentPeriodEnd`/`dryRun` explícitos en el body. Se recomienda
 * ejecutar primero con `dryRun: true` y revisar el resultado antes de
 * repetir la misma llamada con `dryRun: false` (es idempotente: los usuarios
 * ya migrados se saltean).
 *
 * Ejemplo: `fetch("/api/admin/memberships/migrate-existing-users", { method:
 * "POST", headers: { "Content-Type": "application/json" }, body:
 * JSON.stringify({ planId: "<uuid>", currentPeriodEnd:
 * "2026-12-31T00:00:00.000Z", allActiveUsers: true, dryRun: true }) })`
 * estando logueado como Platform Owner.
 */
async function POST(request: Request) {
  let profile;
  try {
    profile = await requirePlatformOwner();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Requiere ser el propietario de la plataforma." }, { status: 403 });
    }
    throw error;
  }

  if (!checkRateLimit(`membership:migrate:${profile.id}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Demasiadas migraciones ejecutadas. Esperá unos minutos." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = migrateExistingUsersSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  try {
    const result = await migrateExistingUsersToAuthorizedMembership({
      ...parsed.data,
      actorUserId: profile.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UserMigrationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logServerError("POST /api/admin/memberships/migrate-existing-users", error);
    return NextResponse.json({ error: "No se pudo ejecutar la migración." }, { status: 500 });
  }
}

export { POST };
