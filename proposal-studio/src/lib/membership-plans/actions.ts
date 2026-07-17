"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformOwner } from "@/lib/auth/authorization-guards";
import { ForbiddenError } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/database/admin";
import { recordAdminAuditEvent } from "@/lib/admin/audit";
import { logServerError, mapSupabaseError } from "@/lib/utils/errors";
import { getPlanById } from "@/lib/memberships/repository";
import type { Json } from "@/lib/database/types";

interface ActionResult {
  error?: string;
  success?: boolean;
}

async function requirePlatformOwnerOrError() {
  try {
    const profile = await requirePlatformOwner();
    return { profile } as const;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: "Requiere ser el propietario de la plataforma." } as const;
    }
    throw error;
  }
}

const planSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]+$/, "El código solo puede tener minúsculas, números, guiones y guiones bajos."),
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  description: z.string().trim().optional().or(z.literal("")),
  price: z.coerce.number().min(0, "El precio no puede ser negativo."),
  currency: z.string().trim().toUpperCase().length(3, "La moneda debe tener 3 letras (ej. ARS)."),
  billing_interval: z.enum(["month", "year"]),
  billing_interval_count: z.coerce.number().int().min(1),
  sort_order: z.coerce.number().int().min(0),
  is_active: z.coerce.boolean(),
  provider: z.string().trim().optional().or(z.literal("")),
  provider_plan_id: z.string().trim().optional().or(z.literal("")),
});

/** Crea un plan nuevo. No permite `provider_plan_id` sin `provider` (o viceversa) — un plan a medio configurar nunca queda disponible para checkout (ver `/planes`). */
async function createPlanAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  if ((data.provider && !data.provider_plan_id) || (!data.provider && data.provider_plan_id)) {
    return { error: "Proveedor y ID de plan del proveedor deben completarse juntos o dejarse ambos vacíos." };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("membership_plans")
    .insert({
      code: data.code,
      name: data.name,
      description: data.description || null,
      price: data.price,
      currency: data.currency,
      billing_interval: data.billing_interval,
      billing_interval_count: data.billing_interval_count,
      sort_order: data.sort_order,
      is_active: data.is_active,
      provider: data.provider || null,
      provider_plan_id: data.provider_plan_id || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    logServerError("createPlanAction", error);
    return { error: mapSupabaseError(error) };
  }

  await recordAdminAuditEvent({
    actorUserId: profile.id,
    action: "membership_plan.create",
    entityType: "membership_plan",
    entityId: created.id,
    afterData: data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/membership-plans");
  revalidatePath("/planes");
  return { success: true };
}

const updatePlanSchema = planSchema.extend({ id: z.string().uuid() });

/** Edita un plan existente. Nunca borra (bloqueado además por FK `memberships.plan_id`) — desactivar con `is_active`. */
async function updatePlanAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const parsed = updatePlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  if ((data.provider && !data.provider_plan_id) || (!data.provider && data.provider_plan_id)) {
    return { error: "Proveedor y ID de plan del proveedor deben completarse juntos o dejarse ambos vacíos." };
  }

  const before = await getPlanById(data.id);
  if (!before) return { error: "El plan indicado no existe." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("membership_plans")
    .update({
      code: data.code,
      name: data.name,
      description: data.description || null,
      price: data.price,
      currency: data.currency,
      billing_interval: data.billing_interval,
      billing_interval_count: data.billing_interval_count,
      sort_order: data.sort_order,
      is_active: data.is_active,
      provider: data.provider || null,
      provider_plan_id: data.provider_plan_id || null,
    })
    .eq("id", data.id);

  if (error) {
    logServerError("updatePlanAction", error);
    return { error: mapSupabaseError(error) };
  }

  await recordAdminAuditEvent({
    actorUserId: profile.id,
    action: "membership_plan.update",
    entityType: "membership_plan",
    entityId: data.id,
    beforeData: before as unknown as Record<string, unknown>,
    afterData: data as unknown as Record<string, unknown>,
  });

  revalidatePath("/admin/membership-plans");
  revalidatePath("/planes");
  return { success: true };
}

/** Alterna `is_active` sin pasar por el formulario completo — usado desde el listado. */
async function togglePlanActiveAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requirePlatformOwnerOrError();
  if ("error" in guard) return { error: guard.error };
  const { profile } = guard;

  const id = z.string().uuid().safeParse(formData.get("id"));
  const isActive = formData.get("isActive") === "true";
  if (!id.success) return { error: "Id de plan inválido." };

  const admin = createAdminClient();
  const { error } = await admin.from("membership_plans").update({ is_active: !isActive }).eq("id", id.data);

  if (error) {
    logServerError("togglePlanActiveAction", error);
    return { error: mapSupabaseError(error) };
  }

  await recordAdminAuditEvent({
    actorUserId: profile.id,
    action: isActive ? "membership_plan.deactivate" : "membership_plan.activate",
    entityType: "membership_plan",
    entityId: id.data,
    beforeData: { isActive } as Record<string, Json>,
    afterData: { isActive: !isActive } as Record<string, Json>,
  });

  revalidatePath("/admin/membership-plans");
  revalidatePath("/planes");
  return { success: true };
}

export { createPlanAction, updatePlanAction, togglePlanActiveAction };
