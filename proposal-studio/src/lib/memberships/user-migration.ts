import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/database/admin";
import { getPlanById } from "@/lib/memberships/repository";
import { createMigratedMembership, getCurrentMembershipForUser } from "@/lib/memberships/service";
import { MembershipServiceError } from "@/lib/memberships/types";
import { logServerError } from "@/lib/utils/errors";

class UserMigrationError extends Error {
  code: "plan_not_found" | "plan_inactive" | "invalid_period_end" | "invalid_selection";
  constructor(code: UserMigrationError["code"], message: string) {
    super(message);
    this.name = "UserMigrationError";
    this.code = code;
  }
}

interface MigrateExistingUsersParams {
  planId: string;
  /** Fecha ISO futura obligatoria: nunca se otorga acceso indefinido (sección 7). */
  currentPeriodEnd: string;
  /** Selección explícita por email — tiene prioridad sobre `allActiveUsers` si ambos se pasan. */
  emails?: string[];
  /** Selección explícita de "todos los perfiles activos sin membresía". Excluye Platform Owners por defecto (ver `emails` para incluir uno a propósito). */
  allActiveUsers?: boolean;
  dryRun: boolean;
  actorUserId: string;
}

interface MigrationCandidateOutcome {
  userId: string;
  email: string;
  reason?: string;
  membershipId?: string;
}

interface MigrateExistingUsersResult {
  dryRun: boolean;
  totalCandidates: number;
  created: MigrationCandidateOutcome[];
  skipped: MigrationCandidateOutcome[];
}

interface CandidateProfile {
  id: string;
  is_platform_owner: boolean;
}

async function fetchAuthEmail(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email.toLowerCase();
}

async function resolveCandidatesByEmail(
  admin: ReturnType<typeof createAdminClient>,
  emails: string[],
): Promise<CandidateProfile[]> {
  const normalizedEmails = new Set(emails.map((e) => e.trim().toLowerCase()));
  const candidates: CandidateProfile[] = [];

  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data) break;

    for (const authUser of data.users) {
      if (!authUser.email || !normalizedEmails.has(authUser.email.toLowerCase())) continue;

      const { data: profile } = await admin
        .from("profiles")
        .select("id, is_platform_owner")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profile) {
        candidates.push({ id: profile.id, is_platform_owner: profile.is_platform_owner });
      }
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return candidates;
}

async function resolveAllActiveCandidates(admin: ReturnType<typeof createAdminClient>): Promise<CandidateProfile[]> {
  const { data } = await admin
    .from("profiles")
    .select("id, is_platform_owner")
    .eq("is_active", true);

  // Excluye Platform Owners por defecto: son cuentas de plataforma/sistema,
  // no comerciales (sección 7 y 10) — si un owner necesita una membresía real
  // se lo incluye explícitamente vía `emails`.
  return (data ?? []).filter((p) => !p.is_platform_owner);
}

/**
 * Script/acción administrativa controlada para migrar usuarios existentes a
 * una membresía `authorized` (Etapa 5, sección 7). Nunca se ejecuta
 * automáticamente ni se invoca desde un cron: requiere invocación explícita
 * (ver `POST /api/admin/memberships/migrate-existing-users`, exclusivo del
 * Platform Owner) con `planId`/`currentPeriodEnd` explícitos y `dryRun`
 * obligatorio. Idempotente: un usuario que ya tiene cualquier membresía
 * (en cualquier estado) se saltea, nunca se duplica.
 */
async function migrateExistingUsersToAuthorizedMembership(
  params: MigrateExistingUsersParams,
): Promise<MigrateExistingUsersResult> {
  const plan = await getPlanById(params.planId);
  if (!plan) throw new UserMigrationError("plan_not_found", "El plan indicado no existe.");
  if (!plan.isActive) throw new UserMigrationError("plan_inactive", "El plan indicado no está activo.");

  const periodEndMs = Date.parse(params.currentPeriodEnd);
  if (!Number.isFinite(periodEndMs) || periodEndMs <= Date.now()) {
    throw new UserMigrationError("invalid_period_end", "currentPeriodEnd debe ser una fecha futura válida.");
  }

  if (!params.emails?.length && !params.allActiveUsers) {
    throw new UserMigrationError("invalid_selection", "Debés indicar `emails` o `allActiveUsers: true`.");
  }

  const admin = createAdminClient();

  const candidates = params.emails?.length
    ? await resolveCandidatesByEmail(admin, params.emails)
    : await resolveAllActiveCandidates(admin);

  const created: MigrationCandidateOutcome[] = [];
  const skipped: MigrationCandidateOutcome[] = [];

  for (const candidate of candidates) {
    const email = await fetchAuthEmail(admin, candidate.id);
    if (!email) {
      skipped.push({ userId: candidate.id, email: "", reason: "auth_user_not_found" });
      continue;
    }

    const existingMembership = await getCurrentMembershipForUser(candidate.id).catch(() => null);
    if (existingMembership) {
      skipped.push({ userId: candidate.id, email, reason: "already_has_membership" });
      continue;
    }

    if (params.dryRun) {
      created.push({ userId: candidate.id, email });
      continue;
    }

    try {
      const membership = await createMigratedMembership({
        email,
        planId: params.planId,
        currentPeriodEnd: params.currentPeriodEnd,
        actorUserId: params.actorUserId,
        userId: candidate.id,
      });
      created.push({ userId: candidate.id, email, membershipId: membership.id });
    } catch (error) {
      if (error instanceof MembershipServiceError && error.code === "duplicate_active_membership") {
        skipped.push({ userId: candidate.id, email, reason: "already_has_membership" });
      } else {
        logServerError("migrateExistingUsersToAuthorizedMembership", error);
        skipped.push({ userId: candidate.id, email, reason: "internal_error" });
      }
    }
  }

  return { dryRun: params.dryRun, totalCandidates: candidates.length, created, skipped };
}

const migrateExistingUsersSchema = z.object({
  planId: z.string().uuid(),
  currentPeriodEnd: z.string().datetime(),
  emails: z.array(z.string().trim().toLowerCase().email()).optional(),
  allActiveUsers: z.boolean().optional(),
  dryRun: z.boolean(),
});

export { migrateExistingUsersToAuthorizedMembership, migrateExistingUsersSchema, UserMigrationError };
export type { MigrateExistingUsersParams, MigrateExistingUsersResult };
