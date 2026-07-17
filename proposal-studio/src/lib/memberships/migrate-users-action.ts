"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { logServerError } from "@/lib/utils/errors";
import { migrateExistingUsersToAuthorizedMembership, UserMigrationError } from "@/lib/memberships/user-migration";
import type { MigrateExistingUsersResult } from "@/lib/memberships/user-migration";

interface MigrateUsersActionResult {
  error?: string;
  result?: MigrateExistingUsersResult;
}

const formSchema = z.object({
  planId: z.string().uuid(),
  currentPeriodEnd: z.string().datetime(),
  selectionMode: z.enum(["all", "emails"]),
  emails: z.string().optional(),
  dryRun: z.enum(["true", "false"]),
  reason: z.string().trim().min(1),
});

async function migrateExistingUsersAction(_prevState: MigrateUsersActionResult, formData: FormData): Promise<MigrateUsersActionResult> {
  let profile;
  try {
    profile = await requirePlatformOwner();
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "Requiere ser el propietario de la plataforma." };
    throw error;
  }

  if (!checkRateLimit(`admin:migrate-users:${profile.id}`, 10, 60 * 60_000)) {
    return { error: "Demasiadas migraciones. Esperá unos minutos." };
  }

  const parsed = formSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  const dryRun = data.dryRun === "true";

  const emails =
    data.selectionMode === "emails"
      ? data.emails
          ?.split(/[\n,]/)
          .map((e) => e.trim())
          .filter(Boolean)
      : undefined;

  try {
    const result = await migrateExistingUsersToAuthorizedMembership({
      planId: data.planId,
      currentPeriodEnd: data.currentPeriodEnd,
      emails,
      allActiveUsers: data.selectionMode === "all",
      dryRun,
      actorUserId: profile.id,
    });

    if (!dryRun) {
      await recordAdminAuditEvent({
        actorUserId: profile.id,
        action: "membership.migrate_existing_users",
        entityType: "membership_migration",
        reason: data.reason,
        afterData: {
          planId: data.planId,
          currentPeriodEnd: data.currentPeriodEnd,
          totalCandidates: result.totalCandidates,
          createdCount: result.created.length,
          skippedCount: result.skipped.length,
        },
      });
      revalidatePath("/admin/memberships");
    }

    return { result };
  } catch (error) {
    if (error instanceof UserMigrationError) return { error: error.message };
    logServerError("migrateExistingUsersAction", error);
    return { error: "No se pudo ejecutar la migración." };
  }
}

export { migrateExistingUsersAction };
export type { MigrateUsersActionResult };
