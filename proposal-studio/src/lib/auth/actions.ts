"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/database/server";
import { mapSupabaseError } from "@/lib/utils/errors";
import { getSiteUrl } from "@/lib/utils/env";

interface ActionResult {
  error?: string;
}

const signInSchema = z.object({
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

async function signInAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: mapSupabaseError(error) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta está desactivada. Contactá a tu administrador." };
  }

  redirect("/dashboard");
}

async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Ingresá un correo electrónico válido."),
});

async function requestPasswordResetAction(
  _prevState: ActionResult & { success?: boolean },
  formData: FormData,
): Promise<ActionResult & { success?: boolean }> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/update-password`,
  });

  if (error) {
    return { error: mapSupabaseError(error) };
  }

  return { success: true };
}

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

async function updatePasswordAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: mapSupabaseError(error) };
  }

  redirect("/dashboard");
}

export { signInAction, signOutAction, requestPasswordResetAction, updatePasswordAction };
