"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/database/server";
import { requireActiveMembershipForAction } from "@/lib/memberships/action-guard";
import { mapSupabaseError } from "@/lib/utils/errors";

interface ActionResult {
  error?: string;
  success?: boolean;
}

const clientSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre es obligatorio."),
  client_type: z.enum(["individual", "company"]),
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  phone: z.string().trim().optional().or(z.literal("")),
  company_name: z.string().trim().optional().or(z.literal("")),
});

async function createClientAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "client.create" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const parsed = clientSchema.safeParse({
    full_name: formData.get("full_name"),
    client_type: formData.get("client_type"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company_name: formData.get("company_name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({ ...parsed.data, user_id: user.id });

  if (error) {
    return { error: mapSupabaseError(error) };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

const updateClientSchema = clientSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

async function updateClientAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const guard = await requireActiveMembershipForAction({ surface: "client.update" });
  if (!guard.ok) return { error: guard.error };
  const { user } = guard.context;

  const parsed = updateClientSchema.safeParse({
    id: formData.get("id"),
    full_name: formData.get("full_name"),
    client_type: formData.get("client_type"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company_name: formData.get("company_name"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const { id, ...updates } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    return { error: error ? mapSupabaseError(error) : "Registro no encontrado o sin acceso." };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export { createClientAction, updateClientAction };
